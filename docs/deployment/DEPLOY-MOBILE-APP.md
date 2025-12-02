# Deploy Mobile App to Production

## Quick Deployment Guide

Since the `main` branch is protected, we need to either:
1. Create a Pull Request and merge
2. Deploy directly from the server

---

## Option 1: Create Pull Request (Recommended)

### Step 1: Push branch to GitHub
```bash
git checkout add-deployment-docs
git push origin add-deployment-docs
```

### Step 2: Create PR on GitHub
1. Go to: https://github.com/moosecreates/tailtown/pulls
2. Click "New Pull Request"
3. Base: `main` ← Compare: `add-deployment-docs`
4. Title: "feat: Mobile Web App MVP + Security Fixes"
5. Description:
   ```
   ## Mobile Web App MVP (v1.1.0)
   
   ### Features Added
   - Mobile dashboard with stats, schedule, and tasks
   - Checklists with task management
   - Team chat interface
   - My Schedule with day/week views
   - Bottom navigation with badge counts
   - Device detection and responsive layouts
   - ~2,500 lines of production-ready code
   
   ### Security Fixes
   - Removed 127 instances of insecure 'dev' fallbacks
   - Fixed tenant isolation vulnerabilities
   - Added automated fix script
   
   ### Documentation
   - Complete ROADMAP cleanup
   - Detailed changelog entries
   - Mobile app documentation
   
   Ready for production deployment.
   ```
6. Click "Create Pull Request"
7. Merge the PR

### Step 3: Deploy from Server
SSH into production and run:
```bash
ssh root@canicloud.com
cd /root/tailtown
git pull origin main
./scripts/deploy.sh
```

---

## Option 2: Deploy Directly from Server (Faster)

If you have SSH access to the production server:

### Step 1: SSH into server
```bash
ssh root@canicloud.com
```

### Step 2: Navigate to project
```bash
cd /root/tailtown
```

### Step 3: Check current branch
```bash
git branch
git status
```

### Step 4: Pull latest from your branch
```bash
# If main is checked out, pull from main
git pull origin main

# Or pull from your feature branch directly
git fetch origin add-deployment-docs
git merge origin/add-deployment-docs
```

### Step 5: Run deployment script
```bash
./scripts/deploy.sh
```

This will:
- Install dependencies
- Run database migrations
- Build frontend (with mobile app)
- Build backend services
- Deploy with zero downtime
- Reload PM2 services
- Reload Nginx
- Run health checks

### Step 6: Verify deployment
```bash
# Check service status
pm2 status

# Check logs
pm2 logs --lines 50

# Test mobile app
curl -I https://dev.canicloud.com/mobile/dashboard
```

---

## Option 3: Manual Frontend Deployment (Quick Fix)

If you just want to deploy the frontend without running the full deployment:

### On your local machine:
```bash
# Build frontend
cd frontend
npm run build

# Create tarball
tar -czf frontend-build.tar.gz build/

# Copy to server
scp frontend-build.tar.gz root@canicloud.com:/tmp/
```

### On the server:
```bash
ssh root@canicloud.com

# Backup current build
cd /var/www/tailtown-frontend
mv build build-backup-$(date +%Y%m%d-%H%M%S)

# Extract new build
cd /tmp
tar -xzf frontend-build.tar.gz
mv build /var/www/tailtown-frontend/

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Verify
curl -I https://dev.canicloud.com/mobile/dashboard
```

---

## Verification Steps

After deployment, verify the mobile app works:

### 1. Check routes exist
```bash
curl -I https://dev.canicloud.com/mobile/dashboard
curl -I https://brangro.canicloud.com/mobile/dashboard
```

Should return `200 OK`

### 2. Test in browser
1. Go to: https://dev.canicloud.com/login
2. Login with staff credentials
3. Navigate to: https://dev.canicloud.com/mobile/dashboard
4. Verify all 5 tabs work (Dashboard, Checklists, Chat, Schedule, Profile)

### 3. Test on mobile device
1. Open on phone: https://dev.canicloud.com/mobile/dashboard
2. Verify responsive layout
3. Test touch interactions
4. Test bottom navigation

---

## Troubleshooting

### 404 on mobile routes
- Frontend not rebuilt/deployed
- Nginx cache issue: `sudo systemctl reload nginx`
- Check build folder: `ls -la /var/www/tailtown-frontend/build/`

### Mobile app shows but looks broken
- CSS not loading
- Check browser console for errors
- Clear browser cache
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Authentication issues
- Clear cookies
- Login again
- Check backend services: `pm2 status`

---

## Current Status

- ✅ Mobile app code complete locally
- ✅ Merged to main branch locally
- ⚠️ Need to push to GitHub (via PR)
- ❌ Not deployed to production yet

## Next Steps

Choose one of the options above to deploy!
