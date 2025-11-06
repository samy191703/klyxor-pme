# ---------- BUILD STAGE ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Don't let puppeteer try to download its own Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./

# You can keep npm i if that's what you use today
RUN npm i

COPY . .

RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:18-alpine AS runner

WORKDIR /app

# Install Chromium + deps for headless mode
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    ca-certificates

# Env for Node + Puppeteer
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Alpine's chromium binary path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy built app + node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
# 🔹 Add assets:
COPY --from=builder /app/server/assets ./server/assets

EXPOSE 5000

CMD ["npm", "run", "start"]
