# Production Deployment Guide

## Overview

This guide covers deploying the BoilerBrain application to production environments with proper security, performance, and monitoring configurations.

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 14+ (via Supabase)
- Redis 6+ (for session storage)
- SSL certificate
- Domain name

### Environment Setup
- Production server (minimum 2GB RAM, 2 CPU cores)
- Load balancer (recommended)
- CDN for static assets
- Monitoring tools (optional)

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3204
DOMAIN=your-domain.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Data Paths
FAULT_CODES_PATH=/app/data/fault-codes
STRUCTURED_DATA_PATH=/app/data/structured-data

# Security
CSRF_SECRET=your-csrf-secret-key
SESSION_SECRET=your-session-secret-key

# External Services
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./

EXPOSE 3204
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3204:3204"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

## Nginx Configuration

```nginx
upstream boilerbrain_backend {
    server app:3204;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static files
    location /static/ {
        alias /app/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://boilerbrain_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Frontend application
    location / {
        proxy_pass http://boilerbrain_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Rate limiting zones
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Database Setup

### Supabase Configuration

1. **Create Production Project**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login and create project
   supabase login
   supabase projects create boilerbrain-prod
   ```

2. **Run Migrations**
   ```bash
   # Apply database schema
   supabase db push --project-ref your-project-ref

   # Import initial data
   node server/scripts/import_knowledge_data.js
   ```

3. **Configure RLS Policies**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE boiler_fault_codes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Public read access" ON boiler_fault_codes FOR SELECT USING (true);
   CREATE POLICY "Authenticated write access" ON chat_sessions FOR ALL USING (auth.uid() IS NOT NULL);
   ```

## Security Hardening

### 1. Server Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2. Application Security
- Enable HTTPS only
- Implement CSRF protection
- Use secure session cookies
- Validate all inputs
- Sanitize outputs
- Regular security updates

### 3. Database Security
- Use connection pooling
- Enable SSL connections
- Implement RLS policies
- Regular backups
- Monitor access logs

## Performance Optimization

### 1. Application Level
```javascript
// Enable compression
app.use(compression());

// Set cache headers
app.use('/static', express.static('dist', {
  maxAge: '1y',
  etag: false
}));

// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Database Level
```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_fault_codes_manufacturer ON boiler_fault_codes(manufacturer);
CREATE INDEX CONCURRENTLY idx_fault_codes_code ON boiler_fault_codes(fault_code);
CREATE INDEX CONCURRENTLY idx_sessions_created ON chat_sessions(created_at);

-- Analyze tables
ANALYZE boiler_fault_codes;
ANALYZE chat_sessions;
```

### 3. Caching Strategy
- Redis for session storage
- Application-level caching
- CDN for static assets
- Database query caching

## Monitoring and Logging

### 1. Application Monitoring
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### 2. Error Tracking
```javascript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.errorHandler());
```

### 3. Log Management
```javascript
// Winston logger configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Deployment Process

### 1. Automated Deployment (GitHub Actions)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            git pull origin main
            npm ci --production
            npm run build
            pm2 restart boilerbrain
```

### 2. Manual Deployment Steps
```bash
# 1. Clone repository
git clone https://github.com/your-org/boilerbrain.git
cd boilerbrain

# 2. Install dependencies
npm ci --production

# 3. Build application
npm run build

# 4. Set up environment
cp .env.example .env.production
# Edit .env.production with production values

# 5. Start application with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Backup and Recovery

### 1. Database Backups
```bash
# Automated daily backups
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Supabase backup
supabase db dump --project-ref your-project-ref > $BACKUP_DIR/database.sql

# Compress and upload to S3
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
aws s3 cp $BACKUP_DIR.tar.gz s3://your-backup-bucket/
```

### 2. Application Backups
```bash
# Code and configuration backup
tar -czf app-backup-$(date +%Y-%m-%d).tar.gz \
  /app \
  /etc/nginx/sites-available/boilerbrain \
  /etc/systemd/system/boilerbrain.service
```

## Scaling Considerations

### 1. Horizontal Scaling
- Load balancer configuration
- Session storage externalization
- Database read replicas
- CDN implementation

### 2. Vertical Scaling
- Resource monitoring
- Performance profiling
- Memory optimization
- CPU utilization

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   # Check logs
   pm2 logs boilerbrain
   
   # Check environment variables
   pm2 env 0
   
   # Restart application
   pm2 restart boilerbrain
   ```

2. **Database Connection Issues**
   ```bash
   # Test connection
   psql $DATABASE_URL
   
   # Check connection pool
   SELECT * FROM pg_stat_activity;
   ```

3. **High Memory Usage**
   ```bash
   # Monitor memory
   pm2 monit
   
   # Check for memory leaks
   node --inspect server/index.js
   ```

### Performance Issues
- Check database query performance
- Monitor cache hit rates
- Analyze network latency
- Review error rates

## Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Monitor performance metrics daily
- [ ] Backup verification weekly
- [ ] SSL certificate renewal (automated)

### Security Updates
- [ ] Apply OS security patches
- [ ] Update Node.js runtime
- [ ] Review access logs
- [ ] Rotate secrets quarterly
