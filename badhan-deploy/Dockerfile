FROM node:22.23.1-bookworm-slim

# The Google Cloud CLI ships via Google's apt repo. python3 comes in as a
# dependency of google-cloud-cli; do not install it separately.
#
# Pinned for the same reason as FIREBASE_TOOLS_VERSION below: an unpinned
# apt install makes every rebuild a silent gcloud upgrade. This is the version
# `gcloud version` reported on the host when the deploy moved into a container;
# find the exact apt version string with `apt-cache madison google-cloud-cli`
# inside the image. Google's repo eventually prunes old versions, at which point
# the build fails loudly with "Version '…' was not found" — that is the right
# failure, because it forces a deliberate bump rather than an unnoticed one.
ARG GCLOUD_VERSION=529.0.0-0
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg; \
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg; \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] \
https://packages.cloud.google.com/apt cloud-sdk main" \
      > /etc/apt/sources.list.d/google-cloud-sdk.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends "google-cloud-cli=${GCLOUD_VERSION}"; \
    apt-get purge -y --auto-remove gnupg; \
    rm -rf /var/lib/apt/lists/*; \
    gcloud version

# firebase-tools is global, exactly as it was on the host: it is a deploy tool,
# not a dependency of the frontend app, and a local install would be masked by
# the frontend container's anonymous node_modules volume.
ARG FIREBASE_TOOLS_VERSION=15.24.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} && firebase --version

# Usage-reporting prompts block a non-interactive `run --rm -T`.
RUN gcloud config set disable_usage_reporting true --installation

# A world-writable HOME so the service can run as the host uid on Linux without
# the image having to know that uid. Nothing security-relevant lives here: the
# credentials are reached through CLOUDSDK_CONFIG / XDG_CONFIG_HOME, which point
# into the bind-mounted repo.
ENV HOME=/home/deploy
RUN mkdir -p /home/deploy && chmod 0777 /home/deploy

WORKDIR /repo
