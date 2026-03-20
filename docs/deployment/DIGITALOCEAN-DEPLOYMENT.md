# DigitalOcean Deployment Guide

**Platform:** DigitalOcean  
**Estimated Cost:** $33-60/month  
**Setup Time:** 30-45 minutes  
**Difficulty:** Easy

---

## 🎯 Recommended DigitalOcean Setup

### **Option 1: Simple & Affordable ($33/month)**
- **Droplet:** Basic - 2GB RAM, 1 vCPU, 50GB SSD ($18/mo)
- **Database:** Managed PostgreSQL - Basic ($15/mo)
- **Total:** $33/month

### **Option 2: Production-Ready ($60/month)**
- **Droplet:** Basic - 4GB RAM, 2 vCPU, 80GB SSD ($36/mo)
- **Database:** Managed PostgreSQL - Basic ($15/mo)
- **Spaces:** Object Storage for backups ($5/mo)
- **Load Balancer:** Optional ($12/mo)
- **Total:** $56-68/month

---

## 📋 Step-by-Step Deployment

### **Step 1: Create Droplet (5 minutes)**

1. **Login to DigitalOcean**
   - Go to https://cloud.digitalocean.com

2. **Create Droplet**
   - Click "Create" → "Droplets"
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic - $18/mo (2GB RAM)
   - **Datacenter:** Choose closest to your users
   - **Authentication:** SSH Key (recommended) or Password
   - **Hostname:** tailtown-production
   - Click "Create Droplet"

3. **Note your IP address**
   - Copy the droplet's IP address

---

### **Step 2: Create Managed Database (5 minutes)**

1. **Create Database**
   - Click "Create" → "Databases"
   - **Engine:** PostgreSQL 14
   - **Plan:** Basic - $15/mo (1GB RAM, 10GB disk)
   - **Datacenter:** Same as your droplet
   - **Database name:** tailtown-db
   - Click "Create Database Cluster"

2. **Configure Database**
   - Wait for database to provision (~5 minutes)
   - Click "Users & Databases" tab
   - Create database: `tailtown_customer_production`
   - Create database: `tailtown_reservation_production`

3. **Get Connection Details**
   - Click "Connection Details"
   - Copy the connection string
   - Note: Use "Private Network" if droplet is in same datacenter

---

### **Step 3: Point Domain to Droplet (5 minutes)**

1. **Add Domain to DigitalOcean**
   - Click "Networking" → "Domains"
   - Add your domain
   - Create A record pointing to droplet IP

2. **Or use your existing DNS**
   - Add A record: `@` → `your-droplet-ip`
   - Add A record: `api` → `your-droplet-ip`

---

### **Step 4: Initial Server Setup (10 minutes)**

1. **SSH into your droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Upload and run setup script**
   ```bash
   # On your local machine
   scp scripts/setup-server.sh root@your-droplet-ip:/root/
   
   # On the droplet
   ssh root@your-droplet-ip
   chmod +x setup-server.sh
   ./setup-server.sh
   ```

   This installs:
   - Node.js 24
   - Nginx
   - PM2
   - Certbot
   - Firewall
   - Security tools

---

### **Step 5: Deploy Application (15 minutes)**

1. **Switch to application user**
   ```bash
   sudo su - tailtown
   ```

2. **Clone repository**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/tailtown.git
   cd tailtown
   ```

3. **Configure environment variables**
   ```bash
   # Copy example files
   cp .env.production.example .env.production
   cp frontend/.env.production.example frontend/.env.production
   cp services/customer/.env.production.example services/customer/.env.production
   cp services/reservation-service/.env.production.example services/reservation-service/.env.production
   ```

4. **Edit environment files**
   ```bash
   nano .env.production
   ```

   **Critical values to set:**
   ```bash
   # Database (from DigitalOcean connection string)
   DATABASE_URL="postgresql://user:password@host:25060/tailtown_customer_production?sslmode=require"
   
   # Generate secrets (run: openssl rand -base64 32)
   JWT_SECRET="your-generated-secret-here"
   JWT_REFRESH_SECRET="different-secret-here"
   SUPER_ADMIN_JWT_SECRET="another-secret-here"
   
   # Your domain
   FRONTEND_URL="https://yourdomain.com"
   CORS_ORIGIN="https://yourdomain.com"
   ```

5. **Deploy**
   ```bash
   ./scripts/deploy.sh
   ```

---

### **Step 6: Configure Nginx (5 minutes)**

1. **Copy Nginx configuration**
   ```bash
   sudo cp config/nginx/tailtown.conf /etc/nginx/sites-available/tailtown
   ```

2. **Edit configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/tailtown
   ```
   
   Replace `yourdomain.com` with your actual domain

3. **Enable site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/tailtown /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

### **Step 7: Setup SSL Certificate (5 minutes)**

```bash
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

Follow prompts:
- Enter email address
- Agree to terms
- Choose to redirect HTTP to HTTPS

Certificate auto-renews!

---

### **Step 8: Create Super Admin (2 minutes)**

```bash
cd /var/www/tailtown
node scripts/create-super-admin.js
```

Follow prompts to create your admin account.

---

### **Step 9: Verify Deployment (5 minutes)**

1. **Check services**
   ```bash
   pm2 status
   ```

2. **Run health check**
   ```bash
   ./scripts/health-check.sh
   ```

3. **Test in browser**
   - Go to https://yourdomain.com
   - Login at https://yourdomain.com/super-admin/login

---

## 🔧 DigitalOcean-Specific Features

### **Managed Database Benefits**
- ✅ Automatic backups (daily)
- ✅ Point-in-time recovery
- ✅ Automatic updates
- ✅ Connection pooling
- ✅ Monitoring dashboard
- ✅ High availability option

### **Droplet Features**
- ✅ Easy scaling (resize anytime)
- ✅ Snapshots for backups
- ✅ Monitoring included
- ✅ Firewall management
- ✅ Load balancer ready

### **Spaces (Object Storage)**
For file uploads and backups:

```bash
# Install s3cmd
sudo apt install s3cmd

# Configure
s3cmd --configure

# Backup to Spaces
s3cmd sync /var/backups/tailtown/ s3://your-space-name/backups/
```

---

## 💰 Cost Breakdown

### **Starter Plan ($33/month)**
| Service   | Specs           | Cost    |
| --------- | --------------- | ------- |
| Droplet   | 2GB RAM, 1 vCPU | $18     |
| Database  | 1GB RAM, 10GB   | $15     |
| **Total** |                 | **$33** |

### **Production Plan ($60/month)**
| Service   | Specs             | Cost    |
| --------- | ----------------- | ------- |
| Droplet   | 4GB RAM, 2 vCPU   | $36     |
| Database  | 1GB RAM, 10GB     | $15     |
| Spaces    | 250GB storage     | $5      |
| Backups   | Droplet snapshots | $4      |
| **Total** |                   | **$60** |

### **Enterprise Plan ($150/month)**
| Service       | Specs             | Cost     |
| ------------- | ----------------- | -------- |
| Droplet       | 8GB RAM, 4 vCPU   | $84      |
| Database      | 4GB RAM, 25GB     | $60      |
| Load Balancer | High availability | $12      |
| Spaces        | 250GB storage     | $5       |
| **Total**     |                   | **$161** |

---

## 📊 Monitoring

### **DigitalOcean Monitoring (Free)**
- CPU usage
- Memory usage
- Disk usage
- Bandwidth
- Alerts

### **Enable Monitoring**
1. Go to your droplet
2. Click "Monitoring" tab
3. Enable metrics
4. Set up alerts

---

## 🔄 Scaling Guide

### **Vertical Scaling (Easy)**
Increase droplet resources:

1. **Power off droplet**
   ```bash
   sudo poweroff
   ```

2. **Resize in DigitalOcean**
   - Droplet → "Resize"
   - Choose new plan
   - Click "Resize"

3. **Power on**
   - Click "Power On"

**Downtime:** 5-10 minutes

### **Horizontal Scaling (Advanced)**
Add more droplets with load balancer:

1. Create load balancer
2. Create multiple droplets
3. Configure PM2 cluster mode
4. Point load balancer to droplets

---

## 🔐 Security Best Practices

### **Firewall (Already configured by setup script)**
```bash
# View rules
sudo ufw status

# Add custom rule
sudo ufw allow from trusted-ip to any port 22
```

### **Database Security**
- ✅ Use private network connection
- ✅ Enable SSL (required by default)
- ✅ Whitelist droplet IP only
- ✅ Use strong password

### **SSH Security**
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## 📦 Backup Strategy

### **Automated Backups**

1. **Database** (Managed by DigitalOcean)
   - Automatic daily backups
   - 7-day retention
   - Point-in-time recovery

2. **Droplet** (Snapshots)
   ```bash
   # Create snapshot via API or dashboard
   # Schedule weekly snapshots
   ```

3. **Application Data** (Our script)
   ```bash
   # Already configured in cron
   # Runs daily at 2 AM
   # 30-day retention
   ```

4. **Off-site Backup** (Spaces)
   ```bash
   # Add to backup script
   s3cmd sync /var/backups/tailtown/ s3://your-space/backups/
   ```

---

## 🚀 Quick Commands

### **Deployment**
```bash
cd /var/www/tailtown
git pull
./scripts/deploy.sh
```

### **Monitoring**
```bash
pm2 monit                    # Live monitoring
pm2 logs                     # View logs
./scripts/health-check.sh    # Health check
htop                         # System resources
```

### **Database**
```bash
# Connect to database
psql "postgresql://user:pass@host:25060/dbname?sslmode=require"

# Backup
./scripts/backup-database.sh

# Restore
./scripts/restore-database.sh /path/to/backup.sql.gz
```

### **Services**
```bash
pm2 restart all              # Restart all
pm2 stop all                 # Stop all
pm2 start ecosystem.config.js # Start all
pm2 save                     # Save config
```

---

## 🆘 Troubleshooting

### **Service won't start**
```bash
pm2 logs customer-service    # Check logs
pm2 restart customer-service # Restart
```

### **Database connection issues**
```bash
# Test connection
psql "your-connection-string"

# Check firewall
sudo ufw status

# Verify environment variables
cat services/customer/.env.production | grep DATABASE_URL
```

### **Nginx errors**
```bash
sudo nginx -t                # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
sudo systemctl restart nginx # Restart
```

### **Out of disk space**
```bash
df -h                        # Check space
du -sh /var/www/tailtown/*   # Find large dirs
./scripts/backup-database.sh # Clean old backups
```

---

## 📞 Support

### **DigitalOcean Support**
- **Community:** https://www.digitalocean.com/community
- **Tutorials:** https://www.digitalocean.com/community/tutorials
- **Support Tickets:** Available on paid plans

### **Application Support**
- **Documentation:** `/docs` folder
- **Health Checks:** `./scripts/health-check.sh`
- **Logs:** `pm2 logs` or `/var/log/tailtown/`

---

## ✅ Deployment Checklist

- [ ] Droplet created (2GB minimum)
- [ ] Managed database created
- [ ] Domain DNS configured
- [ ] SSH access working
- [ ] Setup script run
- [ ] Repository cloned
- [ ] Environment files configured
- [ ] Secrets generated
- [ ] Application deployed
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Super admin created
- [ ] Health check passing
- [ ] Backups configured
- [ ] Monitoring enabled

---

**Estimated Total Time:** 45 minutes  
**Monthly Cost:** $33-60  
**Difficulty:** Easy ⭐⭐☆☆☆

**You're ready to deploy to DigitalOcean!** 🚀
