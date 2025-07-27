# Multi-stage build for production

# ----------------- Build Stage -----------------
# Use Node.js image based on Debian 12 (Bookworm) for better glibc support
FROM node:20-bookworm AS builder

# Install build tools needed for native modules including onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Use npm ci for reproducible builds
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# After build, prune dev dependencies to get production node_modules
RUN npm prune --production

# ----------------- Production Stage -----------------
FROM node:20-bookworm-slim AS production

# Install runtime dependencies for onnxruntime-node and other native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libvips \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# ONNX Runtime compatibility fix - create symbolic link for dynamic loader
RUN mkdir -p /lib64 && ln -sf /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2

WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nestjs

# Copy built application and dependencies from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Copy data model if exists
RUN mkdir -p data_model
COPY --from=builder --chown=nestjs:nodejs /app/src/data_model ./data_model 2>/dev/null || true

# Create uploads directory with proper permissions
RUN mkdir -p uploads/chat uploads/skin-analysis && chown -R nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose port 4090
EXPOSE 4090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 4090, path: '/', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();" || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
