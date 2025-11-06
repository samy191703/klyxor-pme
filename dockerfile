# ---------- BUILD STAGE ----------
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copy package files and install deps (this will download Chromium for puppeteer)
COPY package*.json ./

RUN npm install

# Copy the rest of the source and build
COPY . .

RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# Install system dependencies required by Chromium (as recommended by Puppeteer)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# ⛔️ IMPORTANT:
# - No PUPPETEER_SKIP_DOWNLOAD
# - No PUPPETEER_EXECUTABLE_PATH
# Puppeteer will use its own bundled Chromium.

# Copy built app + node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server/assets ./server/assets

EXPOSE 5000

CMD ["npm", "run", "start"]
