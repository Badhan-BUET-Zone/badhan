#!/bin/bash
# Bake src/assets/certificate-background.png from the supplied Illustrator artwork.
#
# Run from the repo root:
#
#   GH_TOKEN=$(gh auth token) docker compose --profile assets run --rm -e GH_TOKEN \
#     certificate-assets badhan-backend/scripts/certificate-assets/render-background.sh
#
# The artwork lives in certificate-artwork/ of the private secrets repo and is fetched per run.
# GH_TOKEN is how the container reaches a private repo — it has no credentials of its own. A local
# copy in temp/ is used in preference to fetching and never deleted, so a designer iterating on an
# export can drop it there and skip the token entirely.
#
# This is a one-off prep step, not part of any build or request. The render pipeline
# (src/services/certificate/) only ever reads the finished PNG, and neither the artwork nor the PNG
# it bakes are committed — all of it is the designer's licensed work. So re-run this only when the
# designer supplies a new export, then publish the PNG to the ROOT of the same secrets repo (under
# this same name), which is where ../../upload-gcloud.js fetches it from at deploy time.
#
# 300 DPI on an A4 sheet is 3508 x 2480 px. The certificate exists to be printed and then
# photographed by a stranger months later, so the background is prepared at print resolution rather
# than at whatever a screen needs; the PDF places it at 1:1 on the page either way.
set -euo pipefail

ASSETS="badhan-backend/src/assets"
SCRIPTS="badhan-backend/scripts/certificate-assets"

ARTWORK_NAME="Badhan New Certificate"
SECRETS_REPO_URL="${SECRETS_REPO_URL:-https://github.com/Badhan-BUET-Zone/secrets.git}"
SECRETS_BRANCH="${SECRETS_BRANCH:-main}"
SECRETS_SUBDIR="certificate-artwork"

WIDTH=3508
HEIGHT=2480

# Where the artwork is read from this run. A local temp/ copy wins so that iterating on a new export
# needs neither a push nor a token; otherwise it is fetched below into a directory we clean up.
ARTWORK_DIR="temp"
FETCHED_DIR=""

cleanup() {
  if [ -n "$FETCHED_DIR" ]; then
    rm -rf "$FETCHED_DIR"
  fi
}
trap cleanup EXIT

if [ -f "$ARTWORK_DIR/$ARTWORK_NAME.svg" ] && [ -f "$ARTWORK_DIR/$ARTWORK_NAME.pdf" ]; then
  echo "using the artwork already in temp/"
else
  if ! command -v git >/dev/null 2>&1; then
    echo "git is not installed in this image — rebuild it with:" >&2
    echo "  docker compose --profile assets build certificate-assets" >&2
    exit 1
  fi

  # The container carries no credentials of its own. A token in the environment is turned into a
  # URL git can authenticate with; SECRETS_REPO_URL may also already carry its own credentials, or
  # be an SSH remote, in which case it is used untouched.
  url="$SECRETS_REPO_URL"
  token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if [ -n "$token" ] && [ "${url#https://github.com/}" != "$url" ]; then
    url="https://x-access-token:${token}@github.com/${url#https://github.com/}"
  fi

  FETCHED_DIR="$(mktemp -d)"
  echo "fetching the artwork from the secrets repo…"

  # Only the two files the bake reads. The .ai and .eps beside them are archival and together are
  # twenty-odd megabytes, so a blobless sparse checkout keeps this to what is actually rasterised.
  if ! git clone --depth 1 --filter=blob:none --sparse --branch "$SECRETS_BRANCH" "$url" "$FETCHED_DIR" >/dev/null 2>&1; then
    echo "could not clone $SECRETS_REPO_URL (branch $SECRETS_BRANCH)." >&2
    echo "It is private, so pass a token — GH_TOKEN=\$(gh auth token) and 'docker compose run -e GH_TOKEN …'" >&2
    echo "— or put the designer's export in temp/ instead." >&2
    exit 1
  fi
  # Leading slashes matter: without them these read as a match in any directory, and git says so.
  git -C "$FETCHED_DIR" sparse-checkout set --no-cone \
    "/$SECRETS_SUBDIR/$ARTWORK_NAME.svg" "/$SECRETS_SUBDIR/$ARTWORK_NAME.pdf" >/dev/null

  ARTWORK_DIR="$FETCHED_DIR/$SECRETS_SUBDIR"
fi

ARTWORK_SVG="$ARTWORK_DIR/$ARTWORK_NAME.svg"
ARTWORK_PDF="$ARTWORK_DIR/$ARTWORK_NAME.pdf"

for required in "$ARTWORK_SVG" "$ARTWORK_PDF"; do
  if [ ! -f "$required" ]; then
    echo "missing $(basename "$required") — not in temp/ and not in $SECRETS_SUBDIR/ of the secrets repo" >&2
    exit 1
  fi
done

# The PDF is the source of the two commercial faces the SVG names but does not embed.
python3 "$SCRIPTS/install-fonts.py" "$ARTWORK_PDF"

bake() {
  local output="$1"

  python3 "$SCRIPTS/prepare-background-svg.py" "$ARTWORK_SVG" /tmp/certificate-background.svg

  # --background-color white matters: the artwork's own cream fill does not reach the trim edge
  # everywhere, and a transparent margin would print as whatever the paper is under it.
  rsvg-convert \
    --width "$WIDTH" --height "$HEIGHT" \
    --background-color white \
    --output "$output" \
    /tmp/certificate-background.svg

  # Read once per request from local disk, so this is about image size and cold-start reads, not
  # about a payload anyone downloads — but there is no reason to carry the slack either.
  optipng -quiet -o2 "$output"

  echo "wrote $output ($(du -h "$output" | cut -f1), ${WIDTH}x${HEIGHT})"
}

bake "$ASSETS/certificate-background.png"
