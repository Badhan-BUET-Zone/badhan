# The certificate background is baked from the supplied Illustrator SVG by this image, not exported
# by hand, so the PNG committed under src/assets/ can always be rebuilt from the artwork it came
# from. Nothing here runs per request or ships anywhere — the render pipeline only ever reads the
# finished PNG. The `assets` profile keeps it out of `docker compose up`.
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      librsvg2-bin \
      mupdf-tools \
      poppler-utils \
      fontconfig \
      python3 \
      ca-certificates \
      curl \
      optipng \
 && rm -rf /var/lib/apt/lists/*

# The freely licensed half of the artwork's type. The other half — Futura, Palatino — is
# commercial, is not downloadable, and is recovered from the supplied PDF at run time instead
# (see install-fonts.py). Baked into the image rather than fetched per run so a rebuild of the
# background does not depend on four hosts still being up.
#
# Kalpurush is the Bangla face in the corner slogans, free to use from its author's own site.
# Playfair Display carries the heading, the body and the signature block; Illustrator's SVG export
# left those runs with no font-family at all, which is half of why the old certificate never
# matched the PDF (prepare-background-svg.py puts the names back).
RUN mkdir -p /usr/local/share/fonts/certificate \
 && curl -fsSL -o /usr/local/share/fonts/certificate/kalpurush.ttf \
      https://www.omicronlab.com/download/fonts/kalpurush.ttf \
 && curl -fsSL -o /usr/local/share/fonts/certificate/PlayfairDisplay.ttf \
      'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf' \
 && curl -fsSL -o /usr/local/share/fonts/certificate/PlayfairDisplay-Italic.ttf \
      'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf' \
 && curl -fsSL -o /usr/local/share/fonts/certificate/GreatVibes-Regular.ttf \
      https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf \
 && fc-cache -f

WORKDIR /repo
