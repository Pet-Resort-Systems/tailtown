# AWS Migration Guide

**From:** DigitalOcean  
**To:** AWS (Amazon Web Services)  
**Estimated Time:** 4-6 hours  
**Difficulty:** Medium-Hard

---

## 🎯 Why Migrate to AWS?

### **When to Consider AWS:**
- Need global presence (multiple regions)
- Require advanced services (Lambda, SQS, etc.)
- Need enterprise-grade compliance
- Scaling beyond 100+ concurrent users
- Want managed Kubernetes (EKS)
- Need advanced CDN (CloudFront)

### **Cost Comparison:**

**DigitalOcean:** $60/month  
**AWS Equivalent:** $100-200/month

**AWS adds value through:**
- More services (200+ vs 15)
- Better global infrastructure
- Advanced monitoring (CloudWatch)
- Serverless options
- Enterprise support

---

## 📋 AWS Architecture

### **Recommended AWS Setup**

```
┌─────────────────────────────────────────────────┐
│                  Route 53 (DNS)                 │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│           CloudFront (CDN)                      │
│           SSL Certificate (ACM)                 │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│     Application Load Balancer (ALB)             │
└─────┬──────────────────────────────┬────────────┘
      │                              │
┌─────▼──────┐              ┌────────▼──────┐
│   EC2      │              │   EC2         │
│ (Frontend) │              │ (Backend)     │
│  Nginx     │              │  PM2          │
└─────┬──────┘              └────────┬──────┘
      │                              │
      └──────────────┬───────────────┘
                     │
        ┌────────────▼────────────┐
        │   RDS PostgreSQL        │
        │   (Multi-AZ)            │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   S3 (Backups/Files)    │
        └─────────────────────────┘
```

---

## 💰 AWS Cost Estimate

### **Basic Setup ($100/month)**
| Service | Specs | Cost |
|---------|-------|------|
| EC2 (t3.small) | 2GB RAM, 2 vCPU | $17 |
| RDS (db.t3.micro) | 2GB RAM, 20GB | $25 |
| ALB | Load balancer | $16 |
| S3 | 100GB storage | $3 |
| CloudFront | CDN | $10 |
| Route 53 | DNS | $1 |
| Data Transfer | 100GB | $9 |
| **Total** | | **~$81** |

### **Production Setup ($200/month)**
| Service | Specs | Cost |
|---------|-------|------|
| EC2 (t3.medium x2) | 4GB RAM, 2 vCPU | $68 |
| RDS (db.t3.small) Multi-AZ | 4GB RAM, 50GB | $70 |
| ALB | Load balancer | $16 |
| S3 | 500GB storage | $12 |
| CloudFront | CDN | $20 |
| Route 53 | DNS | $1 |
| CloudWatch | Monitoring | $10 |
| Data Transfer | 500GB | $45 |
| **Total** | | **~$242** |

---

## 🔄 Migration Steps

### **Phase 1: Preparation (1-2 hours)**

1. **Create AWS Account**
   - Sign up at https://aws.amazon.com
   - Set up billing alerts
   - Enable MFA on root account

2. **Install AWS CLI**
   ```bash
   # On your local machine
   brew install awscli  # macOS
   # or
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure
   aws configure
   ```

3. **Create IAM User**
   - Go to IAM console
   - Create user with admin access
   - Save access keys

4. **Set up VPC**
   - Use default VPC or create new
   - Create subnets (public + private)
   - Configure security groups

---

### **Phase 2: Database Migration (1-2 hours)**

1. **Create RDS Instance**
   ```bash
   # Via AWS Console
   - Engine: PostgreSQL 14
   - Template: Production
   - Instance: db.t3.small
   - Storage: 50GB GP3
   - Multi-AZ: Yes (for production)
   - VPC: Your VPC
   - Public access: No
   - Security group: Allow from EC2
   ```

2. **Backup DigitalOcean Database**
   ```bash
   # On DigitalOcean droplet
   ./scripts/backup-database.sh
   
   # Download backups
   scp tailtown@do-droplet:/var/backups/tailtown/*.sql.gz ./
   ```

3. **Restore to RDS**
   ```bash
   # Decompress
   gunzip customer_*.sql.gz
   
   # Restore to RDS
   psql -h your-rds-endpoint.rds.amazonaws.com \
        -U postgres \
        -d tailtown_customer_production \
        < customer_*.sql
   
   # Repeat for reservation database
   ```

---

### **Phase 3: EC2 Setup (1 hour)**

1. **Launch EC2 Instance**
   ```bash
   # Via AWS Console
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.small (or t3.medium)
   - VPC: Your VPC
   - Subnet: Public subnet
   - Auto-assign public IP: Yes
   - Storage: 30GB GP3
   - Security group: Allow 22, 80, 443
   - Key pair: Create or use existing
   ```

2. **Connect and Setup**
   ```bash
   # SSH to EC2
   ssh -i your-key.pem ubuntu@ec2-ip
   
   # Upload setup script
   scp -i your-key.pem scripts/setup-server.sh ubuntu@ec2-ip:~/
   
   # Run setup
   sudo ./setup-server.sh
   ```

3. **Deploy Application**
   ```bash
   sudo su - tailtown
   cd /var/www
   git clone https://github.com/yourusername/tailtown.git
   cd tailtown
   
   # Configure environment (use RDS endpoint)
   cp .env.production.example .env.production
   nano .env.production
   # Set DATABASE_URL to RDS endpoint
   
   # Deploy
   ./scripts/deploy.sh
   ```

---

### **Phase 4: Load Balancer & SSL (30 minutes)**

1. **Create Application Load Balancer**
   ```bash
   # Via AWS Console
   - Type: Application Load Balancer
   - Scheme: Internet-facing
   - VPC: Your VPC
   - Subnets: Select 2+ availability zones
   - Security group: Allow 80, 443
   ```

2. **Create Target Group**
   ```bash
   - Target type: Instance
   - Protocol: HTTP
   - Port: 80
   - Health check: /health
   - Register EC2 instance
   ```

3. **Request SSL Certificate (ACM)**
   ```bash
   # Via AWS Console - Certificate Manager
   - Request certificate
   - Domain: yourdomain.com, *.yourdomain.com
   - Validation: DNS
   - Add CNAME records to Route 53
   ```

4. **Configure ALB Listeners**
   ```bash
   - HTTP:80 → Redirect to HTTPS
   - HTTPS:443 → Forward to target group
   - SSL certificate: Select ACM certificate
   ```

---

### **Phase 5: CloudFront CDN (30 minutes)**

1. **Create CloudFront Distribution**
   ```bash
   # Via AWS Console
   - Origin: ALB DNS name
   - Viewer protocol: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache policy: CachingOptimized
   - Alternate domain: yourdomain.com
   - SSL certificate: Use ACM certificate
   ```

2. **Configure Behaviors**
   ```bash
   # Static files (cache)
   Path: *.js, *.css, *.png, *.jpg
   TTL: 1 year
   
   # API (no cache)
   Path: /api/*
   TTL: 0
   ```

---

### **Phase 6: Route 53 DNS (15 minutes)**

1. **Create Hosted Zone**
   ```bash
   # Via AWS Console - Route 53
   - Create hosted zone
   - Domain: yourdomain.com
   ```

2. **Update Name Servers**
   ```bash
   # At your domain registrar
   - Update name servers to Route 53 NS records
   ```

3. **Create Records**
   ```bash
   # A record (or Alias)
   yourdomain.com → CloudFront distribution
   
   # API subdomain
   api.yourdomain.com → ALB
   ```

---

### **Phase 7: S3 for Backups (15 minutes)**

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://tailtown-backups
   ```

2. **Configure Lifecycle**
   ```bash
   # Via AWS Console
   - Transition to Glacier after 30 days
   - Delete after 1 year
   ```

3. **Update Backup Script**
   ```bash
   # Add to scripts/backup-database.sh
   aws s3 sync /var/backups/tailtown/ s3://tailtown-backups/
   ```

---

### **Phase 8: Testing & Cutover (1 hour)**

1. **Test Everything**
   ```bash
   # Health checks
   curl https://yourdomain.com/health
   
   # Login
   # Test super admin login
   # Test tenant operations
   # Test impersonation
   ```

2. **Monitor CloudWatch**
   ```bash
   # Check metrics
   - EC2 CPU/Memory
   - RDS connections
   - ALB requests
   - Errors
   ```

3. **Update DNS**
   ```bash
   # Point domain to CloudFront
   # Wait for DNS propagation (5-30 minutes)
   ```

4. **Decommission DigitalOcean**
   ```bash
   # After 24-48 hours of successful AWS operation
   # Keep final backup
   # Delete droplet and database
   ```

---

## 🔧 AWS-Specific Optimizations

### **Auto Scaling**
```bash
# Create Auto Scaling Group
- Min: 1 instance
- Desired: 2 instances
- Max: 4 instances
- Scale on CPU > 70%
```

### **RDS Read Replicas**
```bash
# For read-heavy workloads
- Create read replica
- Point read queries to replica
- Reduces load on primary
```

### **ElastiCache (Redis)**
```bash
# For session storage
- Create Redis cluster
- Update session config
- Improves performance
```

### **Lambda Functions**
```bash
# For background jobs
- Image processing
- Email sending
- Report generation
```

---

## 📊 Monitoring

### **CloudWatch Dashboards**
```bash
# Create custom dashboard
- EC2 metrics
- RDS metrics
- ALB metrics
- Custom application metrics
```

### **CloudWatch Alarms**
```bash
# Set up alerts
- High CPU (>80%)
- High memory (>90%)
- Database connections (>80%)
- 5xx errors (>10/min)
```

### **CloudWatch Logs**
```bash
# Send application logs
aws logs create-log-group --log-group-name /tailtown/application
aws logs create-log-stream --log-group-name /tailtown/application --log-stream-name production
```

---

## 🔐 Security Best Practices

### **IAM Roles**
```bash
# EC2 instance role
- S3 access for backups
- CloudWatch logs
- Secrets Manager

# No hardcoded credentials!
```

### **Security Groups**
```bash
# ALB security group
- Inbound: 80, 443 from 0.0.0.0/0

# EC2 security group
- Inbound: 80 from ALB security group
- Inbound: 22 from your IP only

# RDS security group
- Inbound: 5432 from EC2 security group only
```

### **Secrets Manager**
```bash
# Store sensitive data
aws secretsmanager create-secret \
  --name tailtown/production/database \
  --secret-string '{"password":"your-db-password"}'
```

---

## 💡 Cost Optimization

### **Reserved Instances**
```bash
# Save 30-60% on EC2/RDS
# Commit to 1 or 3 years
# Best for stable workloads
```

### **Savings Plans**
```bash
# Flexible commitment
# Save 20-40%
# Good for growing workloads
```

### **Spot Instances**
```bash
# Save up to 90%
# For non-critical workloads
# Can be terminated
```

### **Right-Sizing**
```bash
# Use AWS Compute Optimizer
# Identifies over-provisioned resources
# Recommends optimal instance types
```

---

## 🆘 Rollback Plan

If migration fails:

1. **Keep DigitalOcean running** during migration
2. **DNS cutover is last step** - easy to revert
3. **Database backup** before migration
4. **Test thoroughly** before DNS change

**Rollback:**
```bash
# Point DNS back to DigitalOcean
# Takes 5-30 minutes to propagate
# No data loss if you haven't deleted DO resources
```

---

## 📋 Migration Checklist

### **Pre-Migration**
- [ ] AWS account created
- [ ] Billing alerts set
- [ ] IAM users created
- [ ] VPC configured
- [ ] Cost estimate approved

### **Migration**
- [ ] RDS instance created
- [ ] Database backup completed
- [ ] Database restored to RDS
- [ ] EC2 instance launched
- [ ] Application deployed
- [ ] ALB configured
- [ ] SSL certificate issued
- [ ] CloudFront distribution created
- [ ] Route 53 configured
- [ ] S3 bucket created

### **Testing**
- [ ] Health checks passing
- [ ] Super admin login works
- [ ] All features tested
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Backups working

### **Cutover**
- [ ] DNS updated
- [ ] SSL working
- [ ] 24-hour monitoring
- [ ] No errors in logs
- [ ] Performance metrics good

### **Post-Migration**
- [ ] DigitalOcean decommissioned
- [ ] Final backup saved
- [ ] Documentation updated
- [ ] Team trained on AWS

---

## 🎓 Learning Resources

### **AWS Training**
- **Free:** AWS Skill Builder
- **Certification:** AWS Certified Solutions Architect
- **Tutorials:** AWS Well-Architected Labs

### **Cost Management**
- **AWS Cost Explorer:** Analyze spending
- **AWS Budgets:** Set spending limits
- **AWS Trusted Advisor:** Optimization recommendations

---

## 📞 Support

### **AWS Support Plans**
- **Basic:** Free (community forums)
- **Developer:** $29/month (business hours)
- **Business:** $100/month (24/7, <1hr response)
- **Enterprise:** $15,000/month (dedicated TAM)

---

**Migration Difficulty:** Medium-Hard ⭐⭐⭐⭐☆  
**Estimated Time:** 4-6 hours  
**Cost Increase:** +$40-140/month  
**Benefits:** Scalability, reliability, global reach

**You're ready to migrate to AWS when needed!** ☁️
