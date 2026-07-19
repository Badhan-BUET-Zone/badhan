FROM node:22.23.1-bookworm-slim

WORKDIR /app

COPY . .
RUN npm ci

CMD ["npm", "test"]
