# Docker Deployment Guide

## Cách deploy ứng dụng Pharmaceutical Shop Backend

### 1. Build và chạy với Docker Compose (Khuyến nghị)

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 2. Build và chạy Docker container riêng lẻ

```bash
# Build Docker image
docker build -t pharmaceutical-shop-backend .

# Chạy container
docker run -d \
  --name pharmaceutical-shop \
  -p 4090:4090 \
  -e NODE_ENV=production \
  -e PORT=4090 \
  -e MONGODB_URI=mongodb://localhost:27017/pharmaceutical_shop \
  pharmaceutical-shop-backend
```

### 3. Cấu hình biến môi trường

Tạo file `.env` với các biến sau:

```env
NODE_ENV=production
PORT=4090
MONGODB_URI=mongodb://mongo:27017/pharmaceutical_shop

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# VNPay Configuration
VNPAY_TMN_CODE=your_vnpay_terminal_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:4090/api/payments/vnpay/return

# Email Configuration with Resend
RESEND_API_KEY=your_resend_api_key_here

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

### 4. Endpoints quan trọng

- Application: http://localhost:4090
- API Documentation (Swagger): http://localhost:4090/api
- Health Check: http://localhost:4090/health (nếu có endpoint health)

### 5. Database

MongoDB sẽ chạy trên port 27018 (để tránh conflict với MongoDB instance khác) và có thể truy cập từ host machine.

### 6. Troubleshooting

```bash
# Kiểm tra logs
docker-compose logs app

# Kiểm tra container status
docker ps

# Restart services
docker-compose restart

# Rebuild và restart
docker-compose up --build -d
```

### 7. Production Deployment

Để deploy production, hãy:

1. Đảm bảo tất cả biến môi trường production được cấu hình
2. Sử dụng MongoDB Atlas hoặc MongoDB instance production
3. Cấu hình reverse proxy (nginx) nếu cần
4. Cấu hình SSL/TLS certificates
5. Set up monitoring và logging

### 8. File Structure

```
├── Dockerfile              # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── .dockerignore          # Files to ignore in Docker build
├── package.json           # Node.js dependencies
└── src/                   # Source code
```
