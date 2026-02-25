# Development: run Vite dev server so frontend starts with docker compose.
# Not for production (use build + nginx for that).
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
