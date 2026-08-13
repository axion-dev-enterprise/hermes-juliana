# HERMES CENTRAL JULIANA - DOCKERFILE V5.2.0
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache docker-cli python3 py3-pip curl wget bash git
RUN npm install --global npm@latest

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

CMD ["node", "server.js"]
