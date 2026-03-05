#!/bin/bash

###############################################################################
# Tailtown Server Setup Script
# 
# Initial server configuration for Ubuntu/Debian
# Run this once on a fresh server
# Usage: sudo ./scripts/setup-server.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         🛠️  Tailtown Server Setup 🛠️                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    ufw \
    fail2ban \
    htop \
    vim

# Install Node.js 18.x
log "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PostgreSQL
log "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install Nginx
log "Installing Nginx..."
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Install Certbot for Let's Encrypt
log "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Install PM2 globally
log "Installing PM2..."
pnpm install -g pm2

# Create application user
log "Creating application user..."
if ! id "tailtown" &>/dev/null; then
    useradd -m -s /bin/bash tailtown
    usermod -aG sudo tailtown
fi

# Create directories
log "Creating application directories..."
mkdir -p /var/www/tailtown
mkdir -p /var/log/tailtown
mkdir -p /var/backups/tailtown

# Set permissions
chown -R tailtown:tailtown /var/www/tailtown
chown -R tailtown:tailtown /var/log/tailtown
chown -R tailtown:tailtown /var/backups/tailtown

# Configure firewall
log "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw status

# Configure fail2ban
log "Configuring fail2ban..."
systemctl start fail2ban
systemctl enable fail2ban

# Create PostgreSQL databases and user
log "Setting up PostgreSQL databases..."
sudo -u postgres psql <<EOF
CREATE USER tailtown WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE tailtown_customer_production OWNER tailtown;
CREATE DATABASE tailtown_reservation_production OWNER tailtown;
GRANT ALL PRIVILEGES ON DATABASE tailtown_customer_production TO tailtown;
GRANT ALL PRIVILEGES ON DATABASE tailtown_reservation_production TO tailtown;
EOF

# Configure PostgreSQL for local connections
log "Configuring PostgreSQL..."
PG_HBA="/etc/postgresql/*/main/pg_hba.conf"
if ! grep -q "tailtown" $PG_HBA; then
    echo "local   all             tailtown                                md5" >> $PG_HBA
    systemctl restart postgresql
fi

# Set up log rotation
log "Configuring log rotation..."
cat > /etc/logrotate.d/tailtown <<EOF
/var/log/tailtown/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 tailtown tailtown
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set up cron jobs
log "Setting up cron jobs..."
(crontab -u tailtown -l 2>/dev/null; echo "0 2 * * * /var/www/tailtown/scripts/backup-database.sh") | crontab -u tailtown -
(crontab -u tailtown -l 2>/dev/null; echo "*/5 * * * * /var/www/tailtown/scripts/health-check.sh") | crontab -u tailtown -

# Display summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         ✅ Server Setup Complete! ✅                      ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log "Node.js version: $(node --version)"
log "npm version: $(npm --version)"
log "PostgreSQL version: $(sudo -u postgres psql --version | head -1)"
log "Nginx version: $(nginx -v 2>&1)"
log "PM2 version: $(pm2 --version)"
echo ""
log "Next steps:"
echo "  1. Switch to tailtown user: sudo su - tailtown"
echo "  2. Clone repository: git clone <your-repo-url> /var/www/tailtown"
echo "  3. Configure environment files"
echo "  4. Run deployment script: ./scripts/deploy.sh"
echo "  5. Configure SSL: sudo certbot --nginx -d yourdomain.com"
echo ""
log "IMPORTANT: Change the PostgreSQL password!"
echo "  sudo -u postgres psql"
echo "  ALTER USER tailtown WITH PASSWORD 'your-secure-password';"
echo ""

exit 0
