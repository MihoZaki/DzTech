# Stage 1: Build the React app
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build  # This will create a 'dist' directory

# Stage 2: Serve the app with Caddy
FROM caddy:2-alpine

# Copy the built app to the Caddy web root
COPY --from=build /app/dist /usr/share/caddy

# Copy the Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443
