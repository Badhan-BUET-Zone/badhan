FROM cypress/included:15.1.0

WORKDIR /app

COPY . .
RUN npm ci

# cypress/included sets `cypress run` as the entrypoint; clear it so the CMD
# below runs through the project's own npm script (and its node_modules).
ENTRYPOINT []
CMD ["npx", "cypress", "run"]
