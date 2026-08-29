# MudahSewa Deployment Guide

## Overview

This guide covers deploying MudahSewa (rental management system) to production environments, including WhatsApp integration via OpenWA.

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL or SQLite support
- Redis (optional, for queues)
- SSL certificate (for HTTPS)
- Domain name with DNS configured

## Development Environment

### Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run db:push

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

Access at http://localhost:3000

### LAN Access from Other Devices

```bash
npx next dev --hostname 0.0.0.0
```

Find your IP address and access `http://<YOUR_IP>:3000` from other devices on the same network.

## Production Deployment

### Option 1: Docker Deployment (Recommended)

#### Directory Structure

```bash
mudahsewa/
├── docker-compose.yml
├── Dockerfile
├── .env.production
├── nginx/
│   └── nginx.conf
└── scripts/
    └── deploy.sh
```

#### Dockerfile

```dockerfile
FROM node:22-alpine AS base

LABEL maintainer="mudahsewa@example.com"

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mudahsewa-app
    restart: always
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@postgres:5432/mudahsewa
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXT_PUBLIC_APP_URL=https://mudahsewa.example.com
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    networks:
      - mudahsewa-network

  postgres:
    image: postgres:15-alpine
    container_name: mudahsewa-db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: mudahsewa
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - mudahsewa-network

  openwa:
    image: rmyndharis/openwa-server:latest
    container_name: mudahsewa-whatsapp
    restart: always
    environment:
      - PORT=8080
      - AUTH_TOKEN=${OPENWA_AUTH_TOKEN}
    ports:
      - "8080:8080"
    depends_on:
      - app
    networks:
      - mudahsewa-network

networks:
  mudahsewa-network:
    driver: bridge

volumes:
  postgres_data:
```

#### Environment Variables (.env.production)

```bash
# Application
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@postgres:5432/mudahsewa

# NextAuth
NEXTAUTH_URL=https://mudahsewa.example.com
NEXTAUTH_SECRET=your_super_secret_key_here

# OpenWA WhatsApp
OPENWA_API_URL=http://openwa:8080
OPENWA_AUTH_TOKEN=your_openwa_token

# Payment Gateways (Optional)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=true

# File Upload
MAX_FILE_SIZE=5242880  # 5MB in bytes

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name mudahsewa.example.com www.mudahsewa.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mudahsewa.example.com www.mudahsewa.example.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/mudahsewa_access.log;
    error_log /var/log/nginx/mudahsewa_error.log;

    # Static Files
    location /public {
        alias /app/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API Routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # WebSocket Support (if needed)
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# WhatsApp Gateway Proxy
server {
    listen 80;
    server_name wa.mudahsewa.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: VPS Deployment (DigitalOcean, Linode, etc.)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo systemctl enable docker

# Install PM2 for process management
sudo npm install -g pm2
```

#### Step 2: Clone Repository

```bash
git clone https://github.com/your-org/mudahsewa.git
cd mudahsewa
npm install
npm run db:push
npm run db:seed
```

#### Step 3: Configure Environment

```bash
cp .env.example .env.production
nano .env.production
# Edit environment variables as needed
```

#### Step 4: Build and Run

```bash
npm run build
pm2 start npm --name "mudahsewa" -- start
pm2 save
pm2 startup
```

#### Step 5: Set up Nginx

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/mudahsewa
# Copy nginx config from above
sudo ln -s /etc/nginx/sites-available/mudahsewa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mudahsewa.example.com -d www.mudahsewa.example.com
```

### Option 3: Cloud Platform Deployment

#### AWS EC2 + RDS

**EC2 Instance:**
- t3.medium minimum
- Ubuntu 22.04 LTS
- Security Group: Allow port 3000, 80, 443

**RDS PostgreSQL:**
- db.t3.micro minimum
- Enable automated backups
- Create security group rule allowing EC2 access

**Deployment Steps:**
```bash
# On EC2 instance
./deploy.sh --aws --profile easy-sewa
```

#### Google Cloud Platform (GCP)

**Compute Engine:**
```bash
gcloud compute instances create mudahsewa-instance \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server
```

**Cloud SQL:**
- PostgreSQL database instance
- Enable private IP only

**App Engine Alternative:**
```yaml
# app.yaml
runtime: nodejs22
env: standard

automatic_scaling:
  min_instances: 1
  max_instances: 10

env_variables:
  NODE_ENV: 'production'
  DATABASE_URL: '${DATABASE_URL}'
```

### Option 4: Railway/Vercel/Render

#### Vercel (Serverless)

```bash
vercel deploy --prod
```

Add to `package.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

#### Railway

1. Create new project on railway.app
2. Connect GitHub repository
3. Add PostgreSQL database
4. Set environment variables
5. Deploy automatically on push

#### Render

```yaml
# render.yaml
services:
  - type: web
    name: mudahsewa
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
```

## WhatsApp Integration (OpenWA) Setup

### Production WhatsApp Setup

1. **Obtain WhatsApp Business Number:**
   - Use dedicated business phone number
   - Verify with WhatsApp Business API
   - Get approval for message templates

2. **OpenWA Configuration:**

```yaml
# docker-compose.yml
services:
  openwa:
    image: rmyndharis/openwa-server:latest
    environment:
      - PORT=8080
      - AUTH_TOKEN=${OPENWA_AUTH_TOKEN}
      - WEBHOOK_URL=https://mudahsewa.example.com/api/webhooks/whatsapp
```

3. **Register Webhook Endpoints:**

```typescript
// src/app/api/webhooks/whatsapp/route.ts
import { handleWhatsAppWebhook } from '@/lib/whatsapp-webhook-handler';

export async function POST(request: Request) {
  const body = await request.json();
  await handleWhatsAppWebhook(body);
  return Response.json({ received: true });
}
```

4. **Message Templates Approval:**

Prepare templates in WhatsApp Business Manager:
- Booking Confirmation
- Payment Reminder
- Return Notification
- Late Fee Notice

### Testing WhatsApp Before Production

```bash
# Start OpenWA locally
docker-compose -f docker-compose.openwa.yml up -d

# Run test script
npx tsx scripts/openwa-test.ts

# Verify messages arrive at test phone
```

## Backup Strategy

### Database Backups

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/mudahsewa"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p $BACKUP_DIR

# SQLite backup
cp /app/data/mudahsewa.db $BACKUP_DIR/mudahsewa_$DATE.db

# MySQL/PostgreSQL backup
pg_dump -U mudahsewa_user mudahsewa > $BACKUP_DIR/db_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/sudahsewa_$DATE.db s3://mudahsewa-backups/db/
aws s3 cp $BACKUP_DIR/db_$DATE.sql s3://mudahsewa-backups/db/

# Keep last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
echo "$TIMESTAMP - Backup completed successfully" >> $BACKUP_DIR/backup.log
```

Add to crontab:
```bash
0 2 * * * /path/to/scripts/backup.sh
```

### Automated Backups with Docker

```yaml
# docker-compose.backup.yml
version: '3.8'
services:
  backup:
    image: alpine:latest
    command: ["/bin/sh", "-c", "/scripts/backup.sh"]
    volumes:
      - ./scripts:/scripts
      - ./data:/app/data
      - ./backups:/backups
    environment:
      - BACKUP_SCHEDULE=0 2 * * *
    restart: unless-stopped
```

## Monitoring & Alerting

### Health Checks

```typescript
// src/app/api/health/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
```

### Log Management

```bash
# Centralized logging with ELK Stack
sudo docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions

# Or use cloud logging (AWS CloudWatch, GCP Logging)
```

### Metrics Collection

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mudahsewa'
    static_configs:
      - targets: ['localhost:3000']
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
```

## Performance Optimization

### Caching Strategy

```typescript
// Redis cache configuration
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCached(key: string, ttl: number = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  return null;
}

async function setCached(key: string, value: any, ttl: number = 300) {
  await redis.setex(key, ttl, JSON.stringify(value));
}
```

### CDN for Static Assets

Configure Cloudflare or similar CDN:
- Cache static assets (images, CSS, JS)
- Enable gzip compression
- Set appropriate Cache-Control headers

### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_orders_customer ON Orders(customerId);
CREATE INDEX idx_orders_status ON Orders(status);
CREATE INDEX idx_units_product ON Units(productName);
CREATE INDEX idx_payments_order ON Payments(orderId);
```

## Security Checklist

### Pre-Deployment

- [ ] Rotate all default passwords
- [ ] Generate secure secrets for JWT, session, and API keys
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Disable directory listing
- [ ] Configure rate limiting
- [ ] Enable fail2ban

### Post-Deployment

- [ ] Monitor logs for suspicious activity
- [ ] Regular security audits
- [ ] Update dependencies monthly
- [ ] Test disaster recovery
- [ ] Review access logs weekly

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string
psql "$(cat .env.production | grep DATABASE_URL)"
```

#### WhatsApp Not Sending Messages
1. Verify token is valid
2. Check OpenWA service is running
3. Review webhook endpoints
4. Test with curl:
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"6281234567890","message":"Test"}'
```

#### High Memory Usage
```bash
# Monitor memory usage
pm2 monit

# Restart services
pm2 restart all
```

## Rollback Procedure

```bash
# Emergency rollback script
#!/bin/bash
BRANCH=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Stop current service
pm2 stop semua

# Restore previous version
git checkout $BRANCH

# Restore database from backup
pg_restore -U mudahsewa_user -d mudahsewa backup_$TIMESTAMP.sql

# Restart service
pm2 start semua
pm2 save

echo "Rollback completed at $TIMESTAMP"
```

## Maintenance Tasks

### Weekly
- Check disk space usage
- Review error logs
- Test critical workflows
- Verify backups are working

### Monthly
- Update Node.js dependencies
- Rotate secrets and tokens
- Review and clean old logs
- Performance testing

### Quarterly
- Security audit
- Disaster recovery test
- Capacity planning review
- User feedback analysis

## Support Resources

### Documentation
- [Main README](./README.md)
- [WhatsApp Integration Guide](./docs/WHATSAPP-INTEGRATION.md)
- [API Reference](./docs/API.md)

### Contact
- Email: support@mudahsewa.com
- GitHub Issues: github.com/your-org/mudahsewa/issues
- Slack: #mudahsewa-support

---

**Last Updated:** August 27, 2026  
**Version:** 1.0.0
