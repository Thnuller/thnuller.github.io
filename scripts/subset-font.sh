#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_FONT="$ROOT_DIR/assets/fonts/LXGWWenKai-Regular.ttf"
OUTPUT_FONT="$ROOT_DIR/themes/thnuller/static/fonts/LXGWWenKai-Regular.woff2"
GLYPH_FILE="$(mktemp)"
trap 'rm -f "$GLYPH_FILE"' EXIT

subset_command=(pyftsubset)
if ! pyftsubset --help >/dev/null 2>&1; then
  if command -v pyenv >/dev/null 2>&1; then
    fonttools_version="$(pyenv whence pyftsubset 2>/dev/null | tail -n 1)"
    if [[ -n "$fonttools_version" ]]; then
      subset_command=(env "PYENV_VERSION=$fonttools_version" pyftsubset)
    fi
  fi
fi

if ! "${subset_command[@]}" --help >/dev/null 2>&1; then
  echo "error: pyftsubset is required (install fonttools with WOFF2 support)" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FONT")"

while IFS= read -r -d '' file; do
  cat "$file" >> "$GLYPH_FILE"
done < <(find \
  "$ROOT_DIR/content" \
  "$ROOT_DIR/themes/thnuller/layouts" \
  "$ROOT_DIR/themes/thnuller/static/js" \
  -type f \( -name '*.md' -o -name '*.html' -o -name '*.js' \) -print0)

cat "$ROOT_DIR/hugo.toml" >> "$GLYPH_FILE"

"${subset_command[@]}" "$SOURCE_FONT" \
  --text-file="$GLYPH_FILE" \
  --unicodes='U+0000-00FF,U+2000-206F,U+3000-303F' \
  --layout-features='*' \
  --flavor=woff2 \
  --output-file="$OUTPUT_FONT"

source_size=$(wc -c < "$SOURCE_FONT")
output_size=$(wc -c < "$OUTPUT_FONT")
printf 'Font subset: %s -> %s bytes\n' "$source_size" "$output_size"
