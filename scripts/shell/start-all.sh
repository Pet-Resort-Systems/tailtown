#!/bin/bash

echo "🚀 Starting Tailtown Services..."
echo ""

# Kill existing services
lsof -ti :4004 | xargs kill -9 2>/dev/null
lsof -ti :4003 | xargs kill -9 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 2

# Start services in new terminal windows
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown && ./start-customer.sh"'
sleep 2
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown && ./start-reservation.sh"'
sleep 2
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown && ./start-frontend.sh"'

echo "✅ Services starting in 3 terminal windows"
echo ""
echo "📍 URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Customer Service: http://localhost:4004"
echo "   - Reservation Service: http://localhost:4003"
