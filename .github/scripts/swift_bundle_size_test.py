import pathlib
import runpy
import tempfile
import unittest
from unittest.mock import patch


collector = runpy.run_path(str(pathlib.Path(__file__).with_name("measure-swift-size")))


class SwiftBundleSizeTests(unittest.TestCase):
    def test_wrong_toolchain_fails_and_removes_stale_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "sizes.tsv"
            output.write_text("stale measurements")
            with patch("subprocess.check_output", return_value="Xcode 99.0"):
                with self.assertRaisesRegex(ValueError, "require.*Xcode 26.2"):
                    collector["collect"](output)
            self.assertFalse(output.exists())

    def test_counts_resources_and_frameworks_by_logical_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            app = pathlib.Path(directory)
            for name, size in {
                "SizeFixture": 100,
                "Info.plist": 20,
                "CheckoutKit.bundle/Assets.car": 30,
                "Frameworks/Dependency.framework/Dependency": 40,
            }.items():
                file = app / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b"x" * size)
            (app / "alias").symlink_to(app / "SizeFixture")
            self.assertEqual(collector["bundle_bytes"](app), 190)

    def test_rejects_incomplete_app(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                collector["bundle_bytes"](pathlib.Path(directory))

    def test_each_sdk_variant_subtracts_the_empty_app(self):
        self.assertEqual(
            collector["measurement_rows"]({"Baseline": 100, "Core": 300, "Accelerated": 800}),
            "Swift\tbaseline app\t100\n"
            "Swift\tcore app\t300\nSwift\tcore incremental app\t200\n"
            "Swift\taccelerated app\t800\nSwift\taccelerated incremental app\t700\n",
        )

    def test_rejects_empty_missing_or_nonpositive_measurements(self):
        for sizes in [
            {"Baseline": 0, "Core": 100, "Accelerated": 200},
            {"Baseline": 100, "Core": 100, "Accelerated": 200},
            {"Baseline": 100, "Core": 200, "Accelerated": 99},
        ]:
            with self.assertRaises(ValueError):
                collector["measurement_rows"](sizes)
        with self.assertRaises(KeyError):
            collector["measurement_rows"]({"Baseline": 100, "Core": 200})


if __name__ == "__main__":
    unittest.main()
