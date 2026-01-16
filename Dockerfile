# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS deps

# Install native dependencies for @napi-rs/canvas and sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    python3 \
    # Canvas dependencies (cairo, pango, etc.)
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    # Sharp dependencies
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including optional)
RUN npm ci --include=optional

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:20-slim AS runner

# Install runtime dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # FFmpeg for video rendering
    ffmpeg \
    # Runtime libraries for canvas
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    # Runtime libraries for sharp
    libvips42 \
    # Fonts for canvas text rendering
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules for native modules (@napi-rs/canvas)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create output directory for video rendering
RUN mkdir -p /app/output && chown nextjs:nodejs /app/output

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

