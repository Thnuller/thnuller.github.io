#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUGO_BIN="${HUGO_BIN:-}"
if [[ -z "$HUGO_BIN" ]] && command -v hugo >/dev/null 2>&1; then
  HUGO_BIN="$(command -v hugo)"
fi
if [[ -z "$HUGO_BIN" ]] && [[ -d "$HOME/.npm/_npx" ]]; then
  HUGO_BIN="$(find "$HOME/.npm/_npx" -path '*/hugo-bin/vendor/hugo' -type f -print -quit)"
fi
if [[ -z "$HUGO_BIN" ]]; then
  echo "error: Hugo is required (or set HUGO_BIN=/path/to/hugo)" >&2
  exit 1
fi

"$ROOT_DIR/scripts/subset-font.sh"
"$HUGO_BIN" server --source "$ROOT_DIR" --disableFastRender "$@"
