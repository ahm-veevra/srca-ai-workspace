# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# In dev, docker-compose mounts the source and runs `npm run dev`. This image
# installs dependencies; a production build target is added in Phase 11.
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3010
CMD ["npm", "run", "dev"]
