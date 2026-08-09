FROM node:22.23.1-bookworm-slim AS app

WORKDIR /app

COPY . .
RUN npm ci

CMD ["npm", "run", "serve:local"]

# ---------------------------------------------------------------------------
# Deploy stage: the app image plus firebase-tools, which is the only CLI the
# frontend deploy needs. Built only by the `frontend-deploy` compose service
# under the `deploy` profile, so `docker compose up` never pays for it.
#
# firebase-tools is installed globally rather than as a dependency of the app:
# it is a deploy tool, it has no business in package.json, and a local install
# would land in /app/node_modules, which the frontend service masks with an
# anonymous volume. /usr/local/lib/node_modules is masked by nothing.
#
# The deploy itself runs from /repo (the whole repo, bind-mounted), because the
# dist it uploads is the one the `frontend` service just built onto the host —
# not the /app copy baked in above.
# ---------------------------------------------------------------------------
FROM app AS deploy

# Pinned for the same reason as the gcloud version in badhan-backend's deploy
# stage: an unpinned install makes every rebuild a silent upgrade.
ARG FIREBASE_TOOLS_VERSION=15.24.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} && firebase --version

# A world-writable HOME so the service can run as the host uid on Linux without
# the image having to know that uid. Nothing security-relevant lives here: the
# credentials are reached through XDG_CONFIG_HOME, which points into the
# bind-mounted repo.
ENV HOME=/home/deploy
RUN mkdir -p /home/deploy && chmod 0777 /home/deploy

WORKDIR /repo
