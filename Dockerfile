FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install OS deps (optional: for healthchecks/tools)
RUN apk add --no-cache curl

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose app port
EXPOSE 5000

# Environment defaults (override via docker/env)
ENV PORT=5000 \
    RATE_LIMIT_WINDOW_MINUTES=15 \
    RATE_LIMIT_MAX=50 \
    CHAT_RATE_LIMIT_MAX=20

# Start the server
CMD ["node", "src/server.js"]


