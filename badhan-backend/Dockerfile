FROM node:22.23.1-bookworm-slim

# procps provides `ps`, which nodemon needs to reliably enumerate and kill the
# full process tree it spawns (npm run -> cross-env -> node). Without it,
# nodemon's /proc-based fallback (pstree.remy) misses grandchild processes due
# to a lexicographic (not numeric) sort bug, leaving the old server orphaned
# and holding the port on every restart.
RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN npm ci

CMD ["npx", "nodemon"]
