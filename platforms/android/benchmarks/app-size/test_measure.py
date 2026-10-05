import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import measure


class AppSizeTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def apk(self, name, extra=None, timestamp=(2020, 1, 1, 0, 0, 0)):
        path = self.root / name
        entries = {
            'AndroidManifest.xml': b'manifest',
            'classes.dex': b'dex\n039\x00' + b'baseline' * 64,
            'resources.arsc': b'resources' * 20,
            'res/layout/main.xml': b'layout' * 20,
        }
        entries.update(extra or {})
        with zipfile.ZipFile(path, 'w') as apk:
            for name, content in entries.items():
                info = zipfile.ZipInfo(name, timestamp)
                info.compress_type = zipfile.ZIP_DEFLATED
                apk.writestr(info, content)
        return path

    def mapping(self, name, checkout=False):
        path = self.root / name
        text = '# compiler: R8\nexample.MainActivity -> a:\n'
        if checkout:
            text += 'com.shopify.checkoutkit.ShopifyCheckoutKit -> b:\n'
        path.write_text(text)
        return path

    def test_measures_all_payload_entries_and_categories(self):
        path = self.apk('app.apk', {
            'classes2.dex': b'dex\n039\x00' + b'checkout' * 128,
            'assets/data.json': b'{}',
            'lib/arm64-v8a/libexample.so': b'native',
            'META-INF/library.version': b'1.0',
        })
        metrics = measure.apk_metrics(path)
        with zipfile.ZipFile(path) as apk:
            entries = apk.infolist()
            self.assertEqual(metrics['compressed_payload_bytes'], sum(e.compress_size for e in entries))
            self.assertEqual(metrics['uncompressed_payload_bytes'], sum(e.file_size for e in entries))
        self.assertEqual(metrics['apk_bytes'], path.stat().st_size)
        self.assertEqual(metrics['dex_bytes'], 8 + 8 * 64 + 8 + 8 * 128)
        self.assertEqual(metrics['resource_bytes'], 9 * 20 + 6 * 20 + 2)
        self.assertEqual(metrics['native_bytes'], 6)

    def test_zip_timestamps_do_not_change_payload_metric(self):
        first = measure.apk_metrics(self.apk('first.apk'))
        second = measure.apk_metrics(self.apk('second.apk', timestamp=(2026, 10, 5, 1, 2, 4)))
        self.assertEqual(first, second)

    def test_rejects_incomplete_apk(self):
        path = self.root / 'incomplete.apk'
        with zipfile.ZipFile(path, 'w') as apk:
            apk.writestr('AndroidManifest.xml', b'manifest')
        with self.assertRaisesRegex(ValueError, 'DEX|resources'):
            measure.apk_metrics(path)

    def test_rejects_duplicate_zip_entries(self):
        path = self.apk('duplicate.apk')
        with self.assertWarns(UserWarning):
            with zipfile.ZipFile(path, 'a') as apk:
                apk.writestr('classes.dex', b'duplicate')
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            measure.apk_metrics(path)

    def test_computes_signed_deltas_and_primary_metric(self):
        baseline = self.apk('baseline.apk', {'assets/extra': b'x' * 100})
        checkout = self.apk('checkout.apk')
        report = measure.create_report(
            baseline, checkout,
            self.mapping('baseline.txt'), self.mapping('checkout.txt', checkout=True),
        )
        self.assertEqual(report['schema_version'], 1)
        self.assertEqual(report['primary_metric'], 'delta_compressed_payload_bytes')
        self.assertEqual(report['delta']['uncompressed_payload_bytes'], -100)
        self.assertEqual(report['metric'], report['delta']['compressed_payload_bytes'])
        for key, value in report['delta'].items():
            self.assertEqual(value, report['checkout'][key] - report['baseline'][key])

    def test_requires_r8_mapping_and_sdk_retention(self):
        baseline = self.apk('baseline.apk')
        checkout = self.apk('checkout.apk')
        empty_mapping = self.root / 'empty.txt'
        empty_mapping.write_text('')
        cases = [
            (empty_mapping, self.mapping('checkout.txt', checkout=True), 'R8'),
            (self.mapping('baseline.txt'), self.mapping('missing-sdk.txt'), 'Checkout Kit'),
            (self.mapping('wrong-baseline.txt', checkout=True), self.mapping('checkout.txt', checkout=True), 'baseline'),
        ]
        for baseline_mapping, checkout_mapping, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                measure.create_report(baseline, checkout, baseline_mapping, checkout_mapping)

    def test_build_command_enables_fixture_and_reruns_r8(self):
        with patch('measure.subprocess.run') as run:
            measure.build(self.root)
        command = run.call_args.args[0]
        self.assertIn('-PappSizeBenchmark=true', command)
        self.assertIn(':app-size-benchmark:assembleBaselineRelease', command)
        self.assertIn(':app-size-benchmark:assembleCheckoutRelease', command)
        self.assertIn(':lib:verifyPublishedProtocol', command)
        self.assertIn('--rerun-tasks', command)
        self.assertIn('--no-build-cache', command)
        self.assertNotIn('-PuseLocalProtocol=true', command)
        self.assertTrue(run.call_args.kwargs['check'])

    def test_build_overrides_inherited_local_protocol_setting(self):
        with patch.dict(os.environ, {'ORG_GRADLE_PROJECT_useLocalProtocol': 'true'}):
            with patch('measure.subprocess.run') as run:
                measure.build(self.root)
        self.assertIn('-PuseLocalProtocol=false', run.call_args.args[0])

    def test_failed_build_does_not_leave_stale_report(self):
        output = self.root / 'report.json'
        output.write_text('{"metric": 1}')
        with patch('measure.build', side_effect=RuntimeError('build failed')):
            with self.assertRaisesRegex(RuntimeError, 'build failed'):
                measure.main(['--output', str(output)])
        self.assertFalse(output.exists())

    def test_cli_writes_json_and_prints_metric(self):
        output = self.root / 'nested' / 'report.json'
        report = {'schema_version': 1, 'primary_metric': 'delta_compressed_payload_bytes', 'metric': 123}
        stdout = io.StringIO()
        with patch('measure.build'), patch('measure.create_report', return_value=report):
            with contextlib.redirect_stdout(stdout):
                measure.main(['--output', str(output)])
        self.assertEqual(json.loads(output.read_text()), report)
        self.assertIn('delta_compressed_payload_bytes=123', stdout.getvalue())


if __name__ == '__main__':
    unittest.main()
