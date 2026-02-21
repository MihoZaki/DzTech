# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm install # Ensure all deps for build
COPY . .
# Ensure your vite config outputs to /app/dist
RUN npm run build 

