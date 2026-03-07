# Automated Backup Strategy

**Last Updated:** November 7, 2025  
**Version:** 1.0  
**Status:** 🟢 Production Ready

Complete automated backup solution for code and customer data.

---

## 🎯 Backup Requirements

### What We Need to Backup
1. **PostgreSQL Database** - All customer data, multi-tenant
2. **Code Repository** - Application code
3. **Environment Configuration** - Secrets and settings
4. **User Uploads** - Pet photos, documents
5. **Application Logs** - For debugging and audit

### Backup Objectives
- **RPO (Recovery Point Objective):** 1 hour for database, real-time for code
- **RTO (Recovery Time Objective):** 4 hours for full recovery
- **Retention:** 7 daily, 4 weekly, 12 monthly, 7 yearly
- **Location:** Off-site, encrypted, geographically distributed

---

## 📦 1. Database Backups (PostgreSQL)

### Automated Daily Backups

**Script:** `/scripts/database/backup-database.sh`
```bash
#!/bin/bash

# Database Backup Script
# Runs daily via cron at 2 AM

set -e

# Configuration
BACKUP_DIR="/var/backups/tailtown/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
RETENTION_WEEKS=28
RETENTION_MONTHS=365

# Database credentials (from environment or secure vault)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tailtown}"
DB_USER="${DB_USER:-postgres}"

# S3 Configuration (for off-site backup)
S3_BUCKET="${S3_BUCKET:-tailtown-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Create backup directory
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

echo "🔄 Starting database backup: $DATE"

# 1. Create backup with pg_dump (includes all tenants)
BACKUP_FILE="$BACKUP_DIR/daily/tailtown_backup_$DATE.sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# 2. Verify backup integrity
pg_restore --list "$BACKUP_FILE" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backup verified successfully"
else
    echo "❌ Backup verification failed!"
    exit 1
fi

# 3. Encrypt backup
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "$BACKUP_FILE" \
  -out "$BACKUP_FILE.enc" \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"
rm "$BACKUP_FILE"  # Remove unencrypted version

echo "✅ Backup encrypted"

# 4. Upload to S3 (off-site backup)
aws s3 cp "$BACKUP_FILE.enc" \
  "s3://$S3_BUCKET/database/daily/tailtown_backup_$DATE.sql.enc" \
  --region "$S3_REGION" \
  --storage-class STANDARD_IA

echo "✅ Backup uploaded to S3"

# 5. Create weekly backup (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    cp "$BACKUP_FILE.enc" "$BACKUP_DIR/weekly/tailtown_backup_$DATE.sql.enc"
    aws s3 cp "$BACKUP_FILE.enc" \
      "s3://$S3_BUCKET/database/weekly/tailtown_backup_$DATE.sql.enc" \
      --region "$S3_REGION" \
      --storage-class STANDARD_IA
    echo "✅ Weekly backup created"
fi

# 6. Create monthly backup (first day of month)
if [ $(date +%d) -eq 01 ]; then
    cp "$BACKUP_FILE.enc" "$BACKUP_DIR/monthly/tailtown_backup_$DATE.sql.enc"
    aws s3 cp "$BACKUP_FILE.enc" \
      "s3://$S3_BUCKET/database/monthly/tailtown_backup_$DATE.sql.enc" \
      --region "$S3_REGION" \
      --storage-class GLACIER
    echo "✅ Monthly backup created"
fi

# 7. Cleanup old backups (retention policy)
# Daily: Keep 7 days
find "$BACKUP_DIR/daily" -name "*.enc" -mtime +$RETENTION_DAYS -delete
aws s3 ls "s3://$S3_BUCKET/database/daily/" | \
  awk '{print $4}' | \
  head -n -7 | \
  xargs -I {} aws s3 rm "s3://$S3_BUCKET/database/daily/{}"

# Weekly: Keep 4 weeks
find "$BACKUP_DIR/weekly" -name "*.enc" -mtime +$RETENTION_WEEKS -delete

# Monthly: Keep 12 months
find "$BACKUP_DIR/monthly" -name "*.enc" -mtime +$RETENTION_MONTHS -delete

echo "✅ Old backups cleaned up"

# 8. Log backup completion
echo "$(date): Backup completed successfully" >> /var/log/tailtown-backup.log

# 9. Send notification (optional)
# curl -X POST https://hooks.slack.com/... -d "Backup completed: $DATE"

echo "🎉 Backup process completed!"
```

### Setup Cron Job
```bash
# Add to crontab
crontab -e

# Run daily at 2 AM
0 2 * * * /path/to/scripts/database/backup-database.sh >> /var/log/tailtown-backup.log 2>&1
```

---

## 💾 2. Continuous Database Backups (Point-in-Time Recovery)

### PostgreSQL WAL Archiving

**Enable WAL archiving in `postgresql.conf`:**
```conf
# Enable WAL archiving for point-in-time recovery
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://tailtown-backups/wal/%f --region us-east-1'
archive_timeout = 300  # Archive every 5 minutes

# Retention
wal_keep_size = 1GB
```

**Benefits:**
- Can restore to any point in time
- Minimal data loss (5 minute RPO)
- Continuous protection

---

## 📁 3. Code Repository Backups

### GitHub (Primary)
- **Automatic:** GitHub already backs up your code
- **Redundancy:** GitHub has multiple data centers
- **Access:** Always available via git

### Additional Off-Site Backup

**Script:** `/scripts/shell/backup-repository.sh`
```bash
#!/bin/bash

# Repository Backup Script
# Runs daily via cron at 3 AM

BACKUP_DIR="/var/backups/tailtown/repository"
DATE=$(date +%Y%m%d)
REPO_URL="https://github.com/moosecreates/tailtown.git"
S3_BUCKET="tailtown-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Clone/update repository
if [ -d "$BACKUP_DIR/tailtown" ]; then
    cd "$BACKUP_DIR/tailtown"
    git pull
else
    git clone "$REPO_URL" "$BACKUP_DIR/tailtown"
fi

# Create archive
cd "$BACKUP_DIR"
tar -czf "tailtown_repo_$DATE.tar.gz" tailtown/

# Encrypt
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "tailtown_repo_$DATE.tar.gz" \
  -out "tailtown_repo_$DATE.tar.gz.enc" \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"

# Upload to S3
aws s3 cp "tailtown_repo_$DATE.tar.gz.enc" \
  "s3://$S3_BUCKET/repository/tailtown_repo_$DATE.tar.gz.enc"

# Cleanup (keep last 30 days)
find "$BACKUP_DIR" -name "tailtown_repo_*.tar.gz*" -mtime +30 -delete

echo "Repository backup completed: $DATE"
```

---

## 🖼️ 4. User Uploads Backup (Pet Photos, Documents)

### S3 with Versioning (Recommended)

**Setup S3 bucket with versioning:**
```bash
# Create S3 bucket for uploads
aws s3 mb s3://tailtown-uploads --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket tailtown-uploads \
  --versioning-configuration Status=Enabled

# Enable lifecycle policy for old versions
aws s3api put-bucket-lifecycle-configuration \
  --bucket tailtown-uploads \
  --lifecycle-configuration file://s3-lifecycle.json
```

**Lifecycle policy (`s3-lifecycle.json`):**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "TransitionToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### Cross-Region Replication
```bash
# Enable replication to another region
aws s3api put-bucket-replication \
  --bucket tailtown-uploads \
  --replication-configuration file://replication.json
```

---

## 🔐 5. Secrets and Configuration Backup

### Environment Variables

**Script:** `/scripts/shell/backup-secrets.sh`
```bash
#!/bin/bash

# Backup environment variables (encrypted)
# Run manually or via secure automation

BACKUP_DIR="/var/backups/tailtown/secrets"
DATE=$(date +%Y%m%d)
S3_BUCKET="tailtown-backups"

mkdir -p "$BACKUP_DIR"

# Collect .env files (DO NOT commit to git!)
tar -czf "$BACKUP_DIR/env_files_$DATE.tar.gz" \
  apps/customer-service/.env \
  apps/reservation-service/.env \
  apps/frontend/.env

# Encrypt with strong password
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "$BACKUP_DIR/env_files_$DATE.tar.gz" \
  -out "$BACKUP_DIR/env_files_$DATE.tar.gz.enc" \
  -pass pass:"${SECRETS_BACKUP_KEY}"

# Upload to S3 (private bucket)
aws s3 cp "$BACKUP_DIR/env_files_$DATE.tar.gz.enc" \
  "s3://$S3_BUCKET/secrets/env_files_$DATE.tar.gz.enc" \
  --sse AES256

# Remove unencrypted version
rm "$BACKUP_DIR/env_files_$DATE.tar.gz"

echo "Secrets backup completed: $DATE"
```

**⚠️ IMPORTANT:** Store `SECRETS_BACKUP_KEY` in a secure password manager!

---

## 📊 6. Application Logs Backup

### Centralized Logging (Recommended)

**Option 1: CloudWatch Logs (AWS)**
```javascript
// In your application
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: 'tailtown-production',
      logStreamName: 'customer-service',
      awsRegion: 'us-east-1',
      retentionInDays: 30
    })
  ]
});
```

**Option 2: Local Log Rotation + S3**
```bash
# /etc/logrotate.d/tailtown
/var/log/tailtown/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 tailtown tailtown
    postrotate
        # Upload to S3
        aws s3 sync /var/log/tailtown/ s3://tailtown-backups/logs/
    endscript
}
```

---

## 🔄 7. Complete Backup Automation Setup

### Master Backup Script

**File:** `/scripts/database/master-backup.sh`
```bash
#!/bin/bash

# Master Backup Orchestration Script
# Runs all backup tasks in sequence

set -e

echo "🚀 Starting Tailtown Master Backup Process"
echo "=========================================="

# 1. Database backup
echo "📦 1/4: Database backup..."
/scripts/database/backup-database.sh

# 2. Repository backup
echo "📁 2/4: Repository backup..."
/scripts/shell/backup-repository.sh

# 3. Verify S3 uploads are healthy
echo "✅ 3/4: Verifying backups..."
LATEST_DB_BACKUP=$(aws s3 ls s3://tailtown-backups/database/daily/ | tail -1 | awk '{print $4}')
if [ -z "$LATEST_DB_BACKUP" ]; then
    echo "❌ Database backup verification failed!"
    exit 1
fi

# 4. Send success notification
echo "📧 4/4: Sending notification..."
# Add your notification logic here (Slack, email, etc.)

echo "✅ Master backup completed successfully!"
echo "Latest database backup: $LATEST_DB_BACKUP"
```

### Cron Schedule
```bash
# Add to crontab
crontab -e

# Master backup at 2 AM daily
0 2 * * * /scripts/database/master-backup.sh >> /var/log/tailtown-backup.log 2>&1

# Secrets backup weekly (Sunday 3 AM)
0 3 * * 0 /scripts/shell/backup-secrets.sh >> /var/log/tailtown-backup.log 2>&1
```

---

## 🧪 8. Backup Testing & Verification

### Monthly Restore Test

**Script:** `/scripts/database/test-restore.sh`
```bash
#!/bin/bash

# Test database restore (run monthly)

TEST_DB="tailtown_restore_test"
LATEST_BACKUP=$(aws s3 ls s3://tailtown-backups/database/daily/ | tail -1 | awk '{print $4}')

echo "Testing restore of: $LATEST_BACKUP"

# Download backup
aws s3 cp "s3://tailtown-backups/database/daily/$LATEST_BACKUP" /tmp/

# Decrypt
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in "/tmp/$LATEST_BACKUP" \
  -out "/tmp/backup.sql" \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"

# Create test database
createdb "$TEST_DB"

# Restore
pg_restore -d "$TEST_DB" "/tmp/backup.sql"

# Verify data
CUSTOMER_COUNT=$(psql -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"Customer\"")
echo "Customers in backup: $CUSTOMER_COUNT"

if [ "$CUSTOMER_COUNT" -gt 0 ]; then
    echo "✅ Restore test passed!"
else
    echo "❌ Restore test failed!"
    exit 1
fi

# Cleanup
dropdb "$TEST_DB"
rm /tmp/backup.sql /tmp/$LATEST_BACKUP

echo "Restore test completed successfully"
```

---

## 📋 9. Backup Monitoring & Alerts

### Health Check Script

**File:** `/scripts/database/check-backup-health.sh`
```bash
#!/bin/bash

# Check backup health and send alerts if issues found

S3_BUCKET="tailtown-backups"
MAX_AGE_HOURS=26  # Alert if backup older than 26 hours

# Check latest backup age
LATEST_BACKUP=$(aws s3 ls s3://$S3_BUCKET/database/daily/ | tail -1)
BACKUP_DATE=$(echo $LATEST_BACKUP | awk '{print $1" "$2}')
BACKUP_AGE=$(( ($(date +%s) - $(date -d "$BACKUP_DATE" +%s)) / 3600 ))

if [ $BACKUP_AGE -gt $MAX_AGE_HOURS ]; then
    echo "❌ ALERT: Latest backup is $BACKUP_AGE hours old!"
    # Send alert (Slack, PagerDuty, email, etc.)
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
      -d "{\"text\":\"🚨 Tailtown backup is $BACKUP_AGE hours old!\"}"
    exit 1
fi

echo "✅ Backup health check passed (age: $BACKUP_AGE hours)"
```

### Run health check every 6 hours
```bash
# Add to crontab
0 */6 * * * /scripts/database/check-backup-health.sh
```

---

## 💰 10. Cost Optimization

### S3 Storage Classes
- **Daily backups:** STANDARD_IA (Infrequent Access)
- **Weekly backups:** STANDARD_IA
- **Monthly backups:** GLACIER
- **Yearly backups:** GLACIER Deep Archive

### Estimated Costs (for 100GB database)
- **Daily backups (7 days):** ~$5/month
- **Weekly backups (4 weeks):** ~$2/month
- **Monthly backups (12 months):** ~$1/month
- **WAL archives:** ~$3/month
- **Total:** ~$11/month

---

## 🔐 11. Security Best Practices

### Encryption
- ✅ Encrypt backups at rest (AES-256)
- ✅ Encrypt backups in transit (SSL/TLS)
- ✅ Use strong encryption keys
- ✅ Rotate encryption keys annually

### Access Control
- ✅ Limit S3 bucket access (IAM policies)
- ✅ Enable MFA for bucket deletion
- ✅ Use separate AWS account for backups
- ✅ Audit access logs

### Compliance
- ✅ GDPR: Can delete customer data from backups
- ✅ HIPAA: Encrypted, access-controlled
- ✅ SOC 2: Audit trail, retention policy

---

## 📊 12. Backup Dashboard

### Create monitoring dashboard

**File:** `/scripts/database/backup-status.sh`
```bash
#!/bin/bash

# Display backup status dashboard

echo "📊 Tailtown Backup Status Dashboard"
echo "===================================="
echo ""

# Database backups
echo "💾 Database Backups:"
DAILY_COUNT=$(aws s3 ls s3://tailtown-backups/database/daily/ | wc -l)
WEEKLY_COUNT=$(aws s3 ls s3://tailtown-backups/database/weekly/ | wc -l)
MONTHLY_COUNT=$(aws s3 ls s3://tailtown-backups/database/monthly/ | wc -l)
echo "  Daily: $DAILY_COUNT backups"
echo "  Weekly: $WEEKLY_COUNT backups"
echo "  Monthly: $MONTHLY_COUNT backups"

# Latest backup
LATEST=$(aws s3 ls s3://tailtown-backups/database/daily/ | tail -1 | awk '{print $1" "$2}')
echo "  Latest: $LATEST"

# Repository backups
echo ""
echo "📁 Repository Backups:"
REPO_COUNT=$(aws s3 ls s3://tailtown-backups/repository/ | wc -l)
echo "  Total: $REPO_COUNT backups"

# Storage usage
echo ""
echo "💰 Storage Usage:"
aws s3 ls s3://tailtown-backups/ --recursive --summarize | grep "Total Size"

echo ""
echo "✅ Dashboard complete"
```

---

## 🚀 Quick Start Guide

### 1. Install Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### 2. Create S3 Bucket
```bash
aws s3 mb s3://tailtown-backups --region us-east-1
aws s3api put-bucket-versioning --bucket tailtown-backups --versioning-configuration Status=Enabled
```

### 3. Set Environment Variables
```bash
export BACKUP_ENCRYPTION_KEY="your-strong-encryption-key"
export SECRETS_BACKUP_KEY="different-strong-key"
export S3_BUCKET="tailtown-backups"
```

### 4. Make Scripts Executable
```bash
chmod +x scripts/database/backup-database.sh
chmod +x scripts/database/master-backup.sh
chmod +x scripts/database/test-restore.sh
chmod +x scripts/database/check-backup-health.sh
```

### 5. Setup Cron Jobs
```bash
crontab -e
# Add the cron jobs from above
```

### 6. Test Backup
```bash
./scripts/database/master-backup.sh
```

### 7. Test Restore
```bash
./scripts/database/test-restore.sh
```

---

## ✅ Checklist

- [ ] S3 bucket created and configured
- [ ] Backup scripts installed
- [ ] Encryption keys generated and stored securely
- [ ] Cron jobs configured
- [ ] First backup completed successfully
- [ ] Restore test passed
- [ ] Monitoring/alerts configured
- [ ] Team trained on restore procedures
- [ ] Documented in disaster recovery plan

---

**Last Updated:** November 7, 2025  
**Next Review:** December 7, 2025  
**Status:** ✅ Ready for production deployment
