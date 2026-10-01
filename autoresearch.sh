#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")" && pwd)
cd "$repo_root"

git diff --check
/opt/dev/bin/dev web build >&2

python3 - <<'PY'
from gzip import compress
from pathlib import Path

files = sorted(Path("platforms/web/dist").rglob("*.js"))
if not files:
    raise SystemExit("production build emitted no runtime JavaScript")

js_bytes = 0
gzip_bytes = 0
for path in files:
    contents = path.read_bytes()
    js_bytes += len(contents)
    gzip_bytes += len(compress(contents, compresslevel=9, mtime=0))
    print(f"BUNDLE {path} bytes={len(contents)}", file=__import__("sys").stderr)

print(f"METRIC js_bytes={js_bytes}")
print(f"METRIC gzip_bytes={gzip_bytes}")
PY
