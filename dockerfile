# --------- BUILD STAGE ----------
FROM node:18-slim AS builder

WORKDIR /app

# Avoid Puppeteer trying to download its own Chrome during npm install
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./

# Use ci in CI/CD (deterministic)
RUN npm ci

COPY . .

RUN npm run build


# --------- RUNTIME STAGE ----------
FROM node:18-slim AS runner

WORKDIR /app

# Install Chromium + required libs for headless mode
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libnss3 \
    libxss1 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Let Puppeteer know we’re using system Chromium
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy built app + node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 5000

CMD ["npm", "run", "start"]
