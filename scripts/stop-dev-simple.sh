#!/bin/bash

# Simple Tailtown Server Stopper
# Reliable script to stop all development servers

echo "🛑 Stopping Tailtown Development Servers..."
echo ""

# Kill all development processes
echo "Stopping ts-node-dev processes..."
pkill -9 -f "ts-node-dev" 2>/dev/null || true

echo "Stopping react-scripts processes..."
pkill -9 -f "react-scripts" 2>/dev/null || true

# Kill by port as backup
echo "Checking ports..."
for port in 3000 4003 4004; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo "  Killing process on port $port (PID: $pid)"
        kill -9 "$pid" 2>/dev/null || true
    fi
done

sleep 2

echo ""
echo "✅ All servers stopped"
echo ""

# Check if any are still running
remaining=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')
if [ "$remaining" -gt 0 ]; then
    echo "⚠️  Warning: $remaining processes still running"
    echo "Run again if needed: pnpm run dev:stop"
else
    echo "✓ No zombie processes remaining"
fi
