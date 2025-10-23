# VR Genesis Frame - Deployment Guide

This guide covers the deployment process for the VR Genesis Frame NFT Portfolio Integration system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Deployment](#backend-deployment)
5. [Database Setup](#database-setup)
6. [Blockchain Configuration](#blockchain-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Security Configuration](#security-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Docker**: v20.0.0 or higher (optional)
- **Redis**: v6.0.0 or higher (for caching)
- **PostgreSQL**: v13.0.0 or higher (for transaction storage)

### Domain and SSL

- Domain name configured with DNS
- SSL certificate (Let's Encrypt recommended)
- CDN setup (Cloudflare recommended)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/vr-genesis-frame.git
cd vr-genesis-frame
```

### 2. Environment Variables

Create production environment files:

#### Frontend (.env.production)

```env
# API Configuration
VITE_API_BASE_URL=https://api.vrgenesisframe.com
VITE_APP_NAME=VR Genesis Frame
VITE_APP_VERSION=1.0.0

# Blockchain Configuration
VITE_POLKADOT_WS_URL=wss://rpc.polkadot.io
VITE_KUSAMA_WS_URL=wss://kusama-rpc.polkadot.io
VITE_ASSETHUB_WS_URL=wss://polkadot-asset-hub-rpc.polkadot.io

# Feature Flags
VITE_ENABLE_VR=true
VITE_ENABLE_AR=false
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true

# Performance
VITE_MAX_CONCURRENT_MODELS=3
VITE_MODEL_CACHE_SIZE=30
VITE_ENABLE_SERVICE_WORKER=true

# Security
VITE_MAX_FILE_SIZE=52428800
VITE_ALLOWED_FILE_TYPES=glb,gltf,obj,fbx
```

#### Backend (.env.production)

```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/vrgenesisframe
REDIS_URL=redis://localhost:6379

# Blockchain
POLKADOT_WS_URL=wss://rpc.polkadot.io
KUSAMA_WS_URL=wss://kusama-rpc.polkadot.io
ASSETHUB_WS_URL=wss://polkadot-asset-hub-rpc.polkadot.io

# IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Security
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://vrgenesisframe.com,https://www.vrgenesisframe.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=your-sentry-dsn

# Performance
MAX_CONCURRENT_OPERATIONS=10
CACHE_TTL=300
QUERY_TIMEOUT=30000
```

## Frontend Deployment

### 1. Build for Production

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Build for production
npm run build

# Preview build (optional)
npm run preview
```

### 2. Deploy to Static Hosting

#### Option A: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
netlify deploy --prod --dir=dist
```

#### Option C: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 3. Configure CDN

Set up CDN for static assets:

```nginx
# Nginx configuration for CDN
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    gzip_static on;
}
```

## Backend Deployment

### 1. Prepare Backend

```bash
cd backend

# Install production dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Run database migrations
npm run migrate

# Seed initial data (if needed)
npm run seed
```

### 2. Deploy Options

#### Option A: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY public/ ./public/

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t vr-genesis-backend .
docker run -d -p 3001:3001 --env-file .env.production vr-genesis-backend
```

#### Option B: PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'vr-genesis-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Option C: Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vr-genesis-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vr-genesis-backend
  template:
    metadata:
      labels:
        app: vr-genesis-backend
    spec:
      containers:
      - name: backend
        image: vr-genesis-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: vr-genesis-backend-service
spec:
  selector:
    app: vr-genesis-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

## Database Setup

### 1. PostgreSQL Setup

```sql
-- Create database
CREATE DATABASE vrgenesisframe;

-- Create user
CREATE USER vrgenesis WITH ENCRYPTED PASSWORD 'your-secure-password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vrgenesisframe TO vrgenesis;

-- Connect to database
\c vrgenesisframe;

-- Create tables (run migrations)
-- This will be handled by the application migrations
```

### 2. Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-redis-password

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Blockchain Configuration

### 1. Node Connections

Configure reliable blockchain node connections:

```typescript
// Production blockchain configuration
const blockchainConfig = {
  polkadot: {
    primary: 'wss://rpc.polkadot.io',
    fallbacks: [
      'wss://polkadot.api.onfinality.io/public-ws',
      'wss://polkadot-rpc.dwellir.com'
    ]
  },
  assethub: {
    primary: 'wss://polkadot-asset-hub-rpc.polkadot.io',
    fallbacks: [
      'wss://asset-hub-polkadot.api.onfinality.io/public-ws'
    ]
  }
};
```

### 2. Connection Monitoring

Set up blockchain connection monitoring:

```bash
# Create monitoring script
cat > monitor-blockchain.sh << EOF
#!/bin/bash
while true; do
  if ! curl -s -f "http://localhost:3001/api/blockchain/health" > /dev/null; then
    echo "Blockchain connection failed, restarting service..."
    pm2 restart vr-genesis-backend
  fi
  sleep 30
done
EOF

chmod +x monitor-blockchain.sh
nohup ./monitor-blockchain.sh &
```

## Performance Optimization

### 1. Enable Compression

```nginx
# Nginx configuration
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/json
  application/javascript
  application/xml+rss
  application/atom+xml
  image/svg+xml;
```

### 2. Configure Caching

```nginx
# Static asset caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|glb|gltf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API response caching
location /api/ {
    proxy_pass http://backend;
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 3. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_nft_owner ON nfts(owner_address);
CREATE INDEX idx_nft_created ON nfts(created_at);
CREATE INDEX idx_transaction_status ON transactions(status);
CREATE INDEX idx_transaction_wallet ON transactions(wallet_address);

-- Analyze tables
ANALYZE nfts;
ANALYZE transactions;
```

## Security Configuration

### 1. SSL/TLS Setup

```nginx
# SSL configuration
ssl_certificate /etc/letsencrypt/live/vrgenesisframe.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/vrgenesisframe.com/privkey.pem;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# Security headers
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### 2. Content Security Policy

```html
<!-- CSP Header -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' wss: https:;
  worker-src 'self' blob:;
  frame-src 'none';
">
```

### 3. Rate Limiting

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
}

location /api/upload {
    limit_req zone=upload burst=5 nodelay;
    proxy_pass http://backend;
}
```

## Monitoring Setup

### 1. Health Checks

```typescript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    // Check blockchain connection
    const isConnected = await blockchainService.isConnected();
    
    if (isConnected) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'blockchain disconnected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### 2. Logging Configuration

```typescript
// Production logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vr-genesis-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 3. Metrics Collection

```bash
# Install monitoring tools
npm install -g @prometheus/node_exporter
npm install -g grafana-server

# Start monitoring
node_exporter &
grafana-server &
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

```bash
# Monitor memory usage
free -h
ps aux --sort=-%mem | head

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=2048"
```

#### 2. Slow 3D Model Loading

```typescript
// Optimize model loading
const optimizedConfig = {
  maxConcurrentModels: 2, // Reduce concurrent loading
  modelCacheSize: 20,     // Reduce cache size
  enableCompression: true, // Enable model compression
  enableLOD: true         // Enable Level of Detail
};
```

#### 3. Blockchain Connection Issues

```bash
# Check blockchain connectivity
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"system_health","params":[],"id":1}' \
  https://rpc.polkadot.io

# Monitor connection status
tail -f logs/blockchain.log | grep "connection"
```

#### 4. Database Performance

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Optimize queries
EXPLAIN ANALYZE SELECT * FROM nfts WHERE owner_address = 'address';
```

### Performance Monitoring

```bash
# Monitor application performance
npm install -g clinic
clinic doctor -- node dist/server.js

# Monitor database performance
pg_stat_activity
pg_stat_statements
```

### Backup and Recovery

```bash
# Database backup
pg_dump vrgenesisframe > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli BGSAVE

# Application backup
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz dist/ public/ logs/
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Redis configured and running
- [ ] Blockchain connections tested
- [ ] CDN configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Health checks working
- [ ] Backup strategy implemented
- [ ] Performance optimizations applied
- [ ] Load testing completed
- [ ] Documentation updated

## Support

For deployment issues:

1. Check logs: `tail -f logs/combined.log`
2. Monitor health: `curl http://localhost:3001/health`
3. Check system resources: `htop`
4. Review configuration: Verify all environment variables
5. Contact support: Create an issue in the repository

---

**Note**: This deployment guide assumes a Linux-based production environment. Adjust commands and configurations as needed for your specific infrastructure.