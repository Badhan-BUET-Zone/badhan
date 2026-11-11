# Same base as the frontend, so the agent shares its pulled layers.
FROM node:22.23.1-bookworm-slim

WORKDIR /app

# Dependencies first, so editing the source does not re-run `npm ci` on a rebuild.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8090
CMD ["npm", "run", "dev"]
