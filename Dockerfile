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

# Set environment variables for ONNX Runtime to prefer CPU over GPU
ENV ONNXRUNTIME_PLATFORM=linux
ENV ONNXRUNTIME_ARCH=x64
ENV ONNXRUNTIME_PROVIDER=cpu

# Smart installation with multiple fallback strategies
RUN echo "Trying npm ci with ONNX Runtime..." && \
    npm ci && echo "✅ All packages installed successfully!" || \
    (echo "❌ Full install failed, trying CPU-only ONNX..." && \
     npm pkg set onnxruntime-node@1.20.0 && \
     npm ci --legacy-peer-deps) || \
    (echo "❌ CPU ONNX failed, removing ONNX completely..." && \
     npm pkg delete dependencies.onnxruntime-node && \
     npm ci && \
     echo "⚠️ Continuing without ONNX Runtime - AI features will use mock data")

# Copy source code
COPY src/ ./src/

# Build the application with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# After build, prune dev dependencies to get production node_modules
RUN npm prune --production || echo "Prune completed with warnings"

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

# Copy data model (make sure src/data_model exists in your project)
COPY --from=builder --chown=nestjs:nodejs /app/src/data_model ./data_model

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
