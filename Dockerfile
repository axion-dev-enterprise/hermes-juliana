# HERMES CENTRAL JULIANA - DOCKERFILE V4.2.0
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

CMD ["node", "server.js"]
