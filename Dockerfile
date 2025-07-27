# Multi-stage build cho tối ưu hóa production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init để xử lý signal đúng cách
RUN apk add --no-cache dumb-init

# Tạo user app để bảo mật
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install chỉ production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application từ builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy data model nếu có
COPY --from=builder --chown=nestjs:nodejs /app/src/data_model ./data_model

# Tạo thư mục uploads cho lưu trữ file
RUN mkdir -p uploads && chown nestjs:nodejs uploads

# Switch sang non-root user
USER nestjs

# Expose port 4090
EXPOSE 4090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 4090, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();" || exit 1

# Sử dụng dumb-init để xử lý signals đúng cách
ENTRYPOINT ["dumb-init", "--"]

# Start ứng dụng
CMD ["node", "dist/main.js"]
