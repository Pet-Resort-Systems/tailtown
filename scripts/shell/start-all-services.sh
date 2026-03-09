#!/bin/bash

echo "Starting Tailtown Services..."
echo ""
echo "This will open 3 terminal windows."
echo "Press Ctrl+C in each window to stop the services."
echo ""

# Start customer service in new terminal
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown/apps/customer-service && source ~/.nvm/nvm.sh && pnpm run dev"'

sleep 2

# Start reservation service in new terminal  
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown/apps/reservation-service && source ~/.nvm/nvm.sh && pnpm run dev"'

sleep 2

# Start apps/frontend in new terminal
osascript -e 'tell app "Terminal" to do script "cd /Users/robweinstein/CascadeProjects/tailtown/apps/frontend && source ~/.nvm/nvm.sh && pnpm start"'

echo "✅ All services starting in separate terminal windows!"
echo ""
echo "Services:"
echo "  - Customer Service: http://localhost:4004"
echo "  - Reservation Service: http://localhost:4003"
echo "  - Frontend: http://localhost:3000"
