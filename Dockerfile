FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Cài chromium và libs cần thiết cho puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# (tuỳ chọn) fonts Việt hoá tốt hơn
# RUN apk add --no-cache font-noto font-noto-cjk

# Puppeteer dùng system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose app port
EXPOSE 5000


# Start the server
CMD ["node", "src/server.js"]


