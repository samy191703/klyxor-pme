# ---------- BUILD STAGE ----------
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# 1) Install deps (this will install puppeteer 24.28.0)
COPY package*.json ./
RUN npm install

# 2) Pre-download Chromium that puppeteer expects
#    This populates /root/.cache/puppeteer with Chrome 142.x
RUN npx puppeteer browsers install chrome

# 3) Copy sources and build
COPY . .
RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# System dependencies required by Chromium (from Puppeteer docs)
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

# 4) Copy app, deps and assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server/assets ./server/assets

# 5) 🔥 Copy Puppeteer's browser cache (Chrome 142.x) into runtime
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer

EXPOSE 5000

CMD ["npm", "run", "start"]
