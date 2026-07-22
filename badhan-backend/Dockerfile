FROM node:22.23.1-bookworm-slim

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
