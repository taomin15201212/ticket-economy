#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

OUT_ZIP="ticket-economy-docs.zip"
rm -f "$OUT_ZIP"

zip -r "$OUT_ZIP" \
  README.md \
  docs \
  sql \
  openapi \
  scripts/package-docs.sh \
  -x "*.DS_Store"

echo "packed: $ROOT_DIR/$OUT_ZIP"
ls -lh "$OUT_ZIP"
