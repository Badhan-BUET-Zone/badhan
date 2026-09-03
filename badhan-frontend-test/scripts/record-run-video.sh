#!/usr/bin/env bash
#
# Run the Cypress suite with video on, then stitch the per-spec recordings into
# one file.
#
# Cypress records one video per spec and offers no way to record a whole run, so
# the joining happens here. ffmpeg is not on PATH in cypress/included; the image
# does ship the static build that Cypress uses for its own video compression, so
# that is what this reaches for.
#
# Runs inside the frontend-test container:
#   docker compose --profile test run --rm frontend-test npm run cypress:video
# Extra arguments go through to `cypress run`, e.g. `-- --spec 'cypress/e2e/auth/**'`.
set -uo pipefail

cd "$(dirname "$0")/.."

VIDEO_DIR="cypress/videos"
OUT="$VIDEO_DIR/full-run.mp4"
INDEX="$VIDEO_DIR/full-run.txt"

npx cypress run --config-file cypress.video.config.ts "$@"
cypress_status=$?

# Locate ffmpeg: the system one if this ever runs somewhere that has it,
# otherwise the static build bundled with the Cypress binary. Its directory is
# named for the platform (linux-x64, linux-arm64, ...), hence the glob.
FFMPEG="$(command -v ffmpeg || true)"
if [ -z "$FFMPEG" ]; then
  cache="${CYPRESS_CACHE_FOLDER:-$HOME/.cache/Cypress}"
  FFMPEG="$(ls "$cache"/*/Cypress/resources/app/node_modules/@ffmpeg-installer/*/ffmpeg 2>/dev/null | head -1)"
fi
if [ -z "$FFMPEG" ]; then
  echo "record-run-video: no ffmpeg found; per-spec videos are in $VIDEO_DIR" >&2
  exit "$cypress_status"
fi

# Ordered by modification time, not by path: each video is written as its spec
# finishes, so this is the order the run actually happened in — which is not the
# alphabetical one Cypress's spec list might suggest.
mapfile -t VIDEOS < <(
  find "$VIDEO_DIR" -name '*.mp4' ! -name 'full-run.mp4' -printf '%T@ %p\n' |
    sort -n | cut -d' ' -f2-
)
if [ "${#VIDEOS[@]}" -eq 0 ]; then
  echo "record-run-video: no per-spec videos were produced" >&2
  exit "$cypress_status"
fi

# Concatenating by stream copy demands identical encoding parameters, so every
# clip is first normalised onto one canvas — letterboxed, never stretched — and
# written as MPEG-TS, the container that concatenates cleanly.
read -r W H < <(
  "$FFMPEG" -hide_banner -i "${VIDEOS[0]}" 2>&1 |
    sed -n 's/.*Video:.*[^0-9]\([0-9]\{2,\}\)x\([0-9]\{2,\}\).*/\1 \2/p' | head -1
)
: "${W:=1280}" "${H:=720}"
W=$(( W / 2 * 2 ))
H=$(( H / 2 * 2 ))

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
: > "$work/list.txt"
: > "$INDEX"

echo "record-run-video: joining ${#VIDEOS[@]} clips at ${W}x${H}"
offset=0
i=0
for video in "${VIDEOS[@]}"; do
  segment="$work/$(printf '%04d' "$i").ts"
  log="$(
    "$FFMPEG" -y -hide_banner -i "$video" \
      -vf "scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \
      -an -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p \
      -f mpegts "$segment" 2>&1
  )"
  if [ ! -s "$segment" ]; then
    echo "record-run-video: skipping unreadable clip $video" >&2
    echo "$log" | tail -5 >&2
    continue
  fi
  echo "file '$segment'" >> "$work/list.txt"

  # An index of where each spec starts, so a two-hour recording stays navigable.
  # The bundled ffmpeg ships no ffprobe, so the duration is read back off the
  # encoder's own last progress line.
  seconds="$(
    printf '%s' "$log" | tr '\r' '\n' | grep -o 'time=[0-9:.]*' | tail -1 | cut -d= -f2 |
      awk -F: '{ print ($1 * 3600) + ($2 * 60) + $3 }'
  )"
  printf '%s  %s\n' \
    "$(awk -v t="$offset" 'BEGIN { printf "%02d:%02d:%05.2f", t / 3600, (t % 3600) / 60, t % 60 }')" \
    "${video#"$VIDEO_DIR"/}" >> "$INDEX"
  offset="$(awk -v a="$offset" -v b="${seconds:-0}" 'BEGIN { print a + b }')"
  i=$((i + 1))
done

"$FFMPEG" -y -hide_banner -loglevel error -f concat -safe 0 -i "$work/list.txt" \
  -c copy -movflags +faststart "$OUT" || exit 1

echo "record-run-video: wrote $OUT (index: $INDEX)"
exit "$cypress_status"
