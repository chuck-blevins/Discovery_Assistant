# Development: run Vite dev server so frontend starts with docker compose.
# Not for production (use build + nginx for that).
# Use slim (Debian) instead of Alpine so esbuild native bindings run reliably; Alpine can cause "The service was stopped".
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
EXPOSE 5173

# Give Node more heap so Vite/esbuild don't get killed during startup in the container
ENV NODE_OPTIONS="--max-old-space-size=1024"

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
