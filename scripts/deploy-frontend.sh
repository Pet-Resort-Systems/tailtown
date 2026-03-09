#!/bin/bash
# Frontend Deployment Script for Tailtown
# This script builds and deploys the apps/frontend to production

set -e

# Configuration
REMOTE_HOST="129.212.178.244"
REMOTE_USER="root"
SSH_KEY="~/ttkey"
REMOTE_BUILD_DIR="/opt/tailtown/apps/frontend/build"
FRONTEND_DIR="$(dirname "$0")/../apps/frontend"

echo "🚀 Tailtown Frontend Deployment"
echo "================================"

# Change to apps/frontend directory
cd "$FRONTEND_DIR"

# Step 1: Build with production environment
echo ""
echo "📦 Building apps/frontend for production..."
echo "   (Temporarily removing .env.development to prevent localhost URLs)"

# CRITICAL: Temporarily rename .env.development so it doesn't get loaded
# CRA loads .env.development even during production builds if it exists
if [ -f .env.development ]; then
    mv .env.development .env.development.bak
    RESTORE_ENV=true
fi

# Build for production
pnpm run build

# Restore .env.development
if [ "$RESTORE_ENV" = true ]; then
    mv .env.development.bak .env.development
fi

# Verify build was created
if ls build/static/js/*.js 1> /dev/null 2>&1; then
    # Check for either hashed main.*.js or bundle.js (both are valid production builds)
    if ls build/static/js/main.*.js 1> /dev/null 2>&1; then
        MAIN_FILE=$(ls build/static/js/main.*.js | head -1)
        echo "✅ Production build created: $(basename $MAIN_FILE)"
    elif [ -f build/static/js/bundle.js ]; then
        echo "✅ Production build created: bundle.js"
    else
        echo "❌ Error: No main entry point found"
        exit 1
    fi
else
    echo "❌ Error: Build failed - no JS files found"
    exit 1
fi

# Step 2: Deploy to server
echo ""
echo "📤 Deploying to $REMOTE_HOST..."

scp -i $SSH_KEY -r build/* ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BUILD_DIR}/

# Step 3: Restart serve process
echo ""
echo "🔄 Restarting apps/frontend server..."

ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
pkill -f "serve -s build" || true
cd /opt/tailtown/apps/frontend
nohup serve -s build -l 3000 > /var/log/frontend.log 2>&1 &
sleep 2

# Verify server is running
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Frontend server running on port 3000"
    # Show the main.js being served
    SERVED_MAIN=$(curl -s http://localhost:3000/ | grep -o "main\.[a-z0-9]*\.js" | head -1)
    echo "   Serving: $SERVED_MAIN"
else
    echo "❌ Error: Frontend server failed to start"
    exit 1
fi
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 To verify, check: https://tailtown.canicloud.com"
echo "   - Open DevTools Console"
echo "   - Look for 'main.XXXXXX.js' (hashed filename = production)"
echo "   - API calls should go to https://tailtown.canicloud.com/api/..."
