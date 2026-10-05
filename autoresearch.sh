#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
benchmark=platforms/android/benchmarks/app-size
mkdir -p "$benchmark/build"
log="$benchmark/build/autoresearch-checks.log"
: > "$log"
trap 'tail -n 100 "$log" >&2' ERR

python3 -B -m unittest discover -s "$benchmark" -p 'test_*.py' >> "$log" 2>&1
platforms/android/gradlew -p platforms/android \
  :lib:testDebugUnitTest :lib:apiCheck :lib:detekt :lib:lintRelease \
  --console=plain >> "$log" 2>&1
python3 -B "$benchmark/measure.py" >> "$log" 2>&1
platforms/android/gradlew -p platforms/android -PappSizeBenchmark=true \
  :app-size-benchmark:lintBaselineRelease :app-size-benchmark:lintCheckoutRelease \
  --console=plain >> "$log" 2>&1
python3 -B - <<'PY'
import json
from pathlib import Path

report = json.loads(Path('platforms/android/benchmarks/app-size/build/report.json').read_text())
assert report['baseline']['compressed_payload_bytes'] == 590590, 'Baseline host changed; do not compare this run'
for name in ['compressed_payload_bytes', 'dex_bytes', 'resource_bytes', 'apk_bytes']:
    print(f'METRIC delta_{name}={report["delta"][name]}')
PY
