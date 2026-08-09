FROM node:22.23.1-bookworm-slim AS app

# procps provides `ps`, which nodemon needs to reliably enumerate and kill the
# full process tree it spawns (npm run -> cross-env -> node). Without it,
# nodemon's /proc-based fallback (pstree.remy) misses grandchild processes due
# to a lexicographic (not numeric) sort bug, leaving the old server orphaned
# and holding the port on every restart.
RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*

# Bake the MongoDB database tools (mongodump/mongorestore) into the image so the
# backup/restore internal server never has to download them at runtime. MongoDB
# does not publish these via apt for debian arm64, so fetch the official
# ubuntu2204 tarball for the image's architecture (its binaries run on this
# bookworm base) and install the two binaries onto PATH.
ARG MONGODB_TOOLS_VERSION=100.9.4
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates; \
    case "$(dpkg --print-architecture)" in \
      amd64) tools_arch=x86_64 ;; \
      arm64) tools_arch=arm64 ;; \
      *) echo "unsupported architecture: $(dpkg --print-architecture)" >&2; exit 1 ;; \
    esac; \
    file="mongodb-database-tools-ubuntu2204-${tools_arch}-${MONGODB_TOOLS_VERSION}.tgz"; \
    curl -fsSL "https://fastdl.mongodb.org/tools/db/${file}" -o /tmp/mongotools.tgz; \
    tar -xzf /tmp/mongotools.tgz -C /tmp; \
    cp /tmp/mongodb-database-tools-*/bin/mongodump /tmp/mongodb-database-tools-*/bin/mongorestore /usr/local/bin/; \
    chmod +x /usr/local/bin/mongodump /usr/local/bin/mongorestore; \
    rm -rf /tmp/mongotools.tgz /tmp/mongodb-database-tools-*; \
    apt-get purge -y --auto-remove curl; \
    rm -rf /var/lib/apt/lists/*; \
    mongodump --version | head -1

WORKDIR /app

COPY . .
RUN npm ci

CMD ["npx", "nodemon"]

# ---------------------------------------------------------------------------
# Deploy stage: the app image plus gcloud, which is the only CLI the backend
# deploy needs. Built only by the `backend-deploy` compose service under the
# `deploy` profile, so `docker compose up` never pays for it, and every layer
# above is shared with the image the dev stack already built.
#
# It runs from /repo (the whole repo, bind-mounted) rather than the /app copy
# baked in above: `gcloud app deploy` must upload the working tree as it is on
# the host, not a snapshot taken at image build time.
# ---------------------------------------------------------------------------
FROM app AS deploy

# The Google Cloud CLI ships via Google's apt repo. python3 comes in as a
# dependency of google-cloud-cli; do not install it separately.
#
# Pinned because an unpinned apt install makes every rebuild a silent gcloud
# upgrade. This is the version `gcloud version` reported on the host when the
# deploy moved into a container; find the exact apt version string with
# `apt-cache madison google-cloud-cli` inside the image. Google's repo
# eventually prunes old versions, at which point the build fails loudly with
# "Version '…' was not found" — that is the right failure, because it forces a
# deliberate bump rather than an unnoticed one.
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

# Usage-reporting prompts block a non-interactive `run --rm -T`.
RUN gcloud config set disable_usage_reporting true --installation

# A world-writable HOME so the service can run as the host uid on Linux without
# the image having to know that uid. Nothing security-relevant lives here: the
# credentials are reached through CLOUDSDK_CONFIG, which points into the
# bind-mounted repo.
ENV HOME=/home/deploy
RUN mkdir -p /home/deploy && chmod 0777 /home/deploy

WORKDIR /repo
