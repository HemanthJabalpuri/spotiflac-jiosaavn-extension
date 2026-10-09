#!/bin/sh
set -e

DIST="dist"
OUT="$DIST/index.js"
MANIFEST="manifest.json"
EXT_NAME="jiosaavn-songs"

# Clean and create dist
rm -rf "$DIST"
mkdir -p "$DIST"

# Concatenate in dependency order
cat > "$OUT" <<'EOF'
// ============================================================
// JioSaavn Songs Extension – modular build
// ============================================================
EOF

for f in \
    src/api/constants.js \
    src/api/fetch.js \
    src/api/songs.js \
    src/api/collections.js \
    src/api/home.js \
    src/api/artists.js \
    src/libs/des.js \
    src/utils/decrypt.js \
    src/utils/cache.js \
    src/utils/formatters.js \
    src/services/songs.js \
    src/services/collections.js \
    src/services/artists.js \
    src/services/home.js \
    src/services/search.js \
    src/services/url-handler.js \
    src/services/download.js \
    src/spotiflac.js
do
    echo >> "$OUT"
    echo "// ---- $f ----" >> "$OUT"
    cat "$f" >> "$OUT"
done

# Copy manifest into dist
cp "$MANIFEST" "$DIST/"

# Copy manifest into dist
cp "icon.png" "$DIST/"

# Create .sflx (ZIP) from dist contents
cd "$DIST"
if command -v zip >/dev/null 2>&1; then
    zip -r "../$EXT_NAME.sflx" ./*
else
    echo "ERROR: zip command not found. Please install zip."
    exit 1
fi
cd - > /dev/null

echo "✅ Built $EXT_NAME.sflx in dist/ (index.js and .sflx)"
