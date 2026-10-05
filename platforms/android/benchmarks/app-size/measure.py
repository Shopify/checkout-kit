#!/usr/bin/env python3

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import zipfile


FIXTURE = Path(__file__).resolve().parent
ANDROID = FIXTURE.parents[1]


def apk_metrics(path):
    with zipfile.ZipFile(path) as apk:
        entries = [entry for entry in apk.infolist() if not entry.is_dir()]
        names = {entry.filename for entry in entries}
        if len(names) != len(entries):
            raise ValueError(f'{path}: duplicate APK entries')
        if not {'AndroidManifest.xml', 'classes.dex', 'resources.arsc'} <= names:
            raise ValueError(f'{path}: missing manifest, DEX, or resources')
        invalid_entry = apk.testzip()
        if invalid_entry:
            raise ValueError(f'{path}: corrupt APK entry {invalid_entry}')
        return {
            'apk_bytes': path.stat().st_size,
            'compressed_payload_bytes': sum(entry.compress_size for entry in entries),
            'uncompressed_payload_bytes': sum(entry.file_size for entry in entries),
            'dex_bytes': sum(entry.file_size for entry in entries if re.fullmatch(r'classes\d*\.dex', entry.filename)),
            'resource_bytes': sum(entry.file_size for entry in entries if entry.filename == 'resources.arsc' or entry.filename.startswith(('res/', 'assets/'))),
            'native_bytes': sum(entry.file_size for entry in entries if entry.filename.startswith('lib/')),
        }


def validate_mapping(path, checkout):
    text = path.read_text()
    if '# compiler: R8' not in text or not re.search(r'^\S+ -> \S+:$', text, re.MULTILINE):
        raise ValueError(f'{path}: missing R8 mapping')
    has_sdk = re.search(r'^com\.shopify\.checkoutkit\.\S+ -> ', text, re.MULTILINE) is not None
    if checkout and not re.search(r'^com\.shopify\.checkoutkit\.ShopifyCheckoutKit -> ', text, re.MULTILINE):
        raise ValueError(f'{path}: Checkout Kit entry point was not retained')
    if not checkout and has_sdk:
        raise ValueError(f'{path}: baseline unexpectedly contains Checkout Kit')


def create_report(baseline_apk, checkout_apk, baseline_mapping, checkout_mapping):
    validate_mapping(baseline_mapping, checkout=False)
    validate_mapping(checkout_mapping, checkout=True)
    baseline = apk_metrics(baseline_apk)
    checkout = apk_metrics(checkout_apk)
    delta = {key: checkout[key] - baseline[key] for key in baseline}
    return {
        'schema_version': 1,
        'primary_metric': 'delta_compressed_payload_bytes',
        'metric': delta['compressed_payload_bytes'],
        'unit': 'bytes',
        'baseline': baseline,
        'checkout': checkout,
        'delta': delta,
    }


def build(android):
    subprocess.run([
        str(android / 'gradlew'), '-p', str(android),
        '-PappSizeBenchmark=true',
        ':lib:verifyPublishedProtocol',
        ':app-size-benchmark:assembleBaselineRelease',
        ':app-size-benchmark:assembleCheckoutRelease',
        '--rerun-tasks', '--no-build-cache', '--console=plain',
    ], check=True, stdout=sys.stderr)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Measure the incremental R8 APK payload of Checkout Kit.')
    parser.add_argument('--output', type=Path, default=FIXTURE / 'build' / 'report.json')
    args = parser.parse_args(argv)
    args.output.unlink(missing_ok=True)
    build(ANDROID)
    outputs = FIXTURE / 'build' / 'outputs'
    report = create_report(
        outputs / 'apk' / 'baseline' / 'release' / 'app-size-benchmark-baseline-release-unsigned.apk',
        outputs / 'apk' / 'checkout' / 'release' / 'app-size-benchmark-checkout-release-unsigned.apk',
        outputs / 'mapping' / 'baselineRelease' / 'mapping.txt',
        outputs / 'mapping' / 'checkoutRelease' / 'mapping.txt',
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
    print(f"{report['primary_metric']}={report['metric']}")
    print(f'report={args.output}')


if __name__ == '__main__':
    main()
