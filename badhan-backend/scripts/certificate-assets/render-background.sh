#!/bin/bash
# Bake src/assets/certificate-background.png from the supplied Illustrator artwork.
#
# Run from the repo root, with the artwork in temp/:
#
#   docker compose --profile assets run --rm certificate-assets \
#     badhan-backend/scripts/certificate-assets/render-background.sh
#
# This is a one-off prep step, not part of any build or request. The render pipeline
# (src/services/certificate/) only ever reads the finished PNG, and neither the artwork nor the PNG
# it bakes is committed — both are the designer's licensed work. So re-run this only when the
# designer supplies a new export, then publish the PNG it produces to the private secrets repo
# (Badhan-BUET-Zone/secrets, at its root as certificate-background.png), which is where
# ../../upload-gcloud.js fetches it from at deploy time.
#
# 300 DPI on an A4 sheet is 3508 x 2480 px. The certificate exists to be printed and then
# photographed by a stranger months later, so the background is prepared at print resolution rather
# than at whatever a screen needs; the PDF places it at 1:1 on the page either way.
set -euo pipefail

ARTWORK_SVG="temp/Badhan New Certificate.svg"
ARTWORK_PDF="temp/Badhan New Certificate.pdf"
OUTPUT="badhan-backend/src/assets/certificate-background.png"
SCRIPTS="badhan-backend/scripts/certificate-assets"

WIDTH=3508
HEIGHT=2480

for required in "$ARTWORK_SVG" "$ARTWORK_PDF"; do
  if [ ! -f "$required" ]; then
    echo "missing $required — the supplied artwork is not committed; put the designer's export in temp/ first" >&2
    exit 1
  fi
done

# The PDF is the source of the two commercial faces the SVG names but does not embed.
python3 "$SCRIPTS/install-fonts.py" "$ARTWORK_PDF"

python3 "$SCRIPTS/prepare-background-svg.py" "$ARTWORK_SVG" /tmp/certificate-background.svg

# --background-color white matters: the artwork's own cream fill does not reach the trim edge
# everywhere, and a transparent margin would print as whatever the paper is under it.
rsvg-convert \
  --width "$WIDTH" --height "$HEIGHT" \
  --background-color white \
  --output "$OUTPUT" \
  /tmp/certificate-background.svg

# Read once per request from local disk, so this is about image size and cold-start reads, not
# about a payload anyone downloads — but there is no reason to carry the slack either.
optipng -quiet -o2 "$OUTPUT"

echo "wrote $OUTPUT ($(du -h "$OUTPUT" | cut -f1), ${WIDTH}x${HEIGHT})"
