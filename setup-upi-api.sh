#!/bin/bash

# Configuration
PROJECT_DIR="$HOME/upi-https-backend"
DEFAULT_API_KEY="super-secret-api-key"
PORT=3000

echo "🚀 Starting Termux UPI API Automated Setup..."

# 1. Sanity: Stop any existing Node.js processes for upihttps
echo "🛑 Sanity Check: Stopping any existing Node.js or Cloudflared processes..."
pkill -f "node server.js" || true
pkill -f "cloudflared tunnel" || true
sleep 1

# 2. Prevent Android from sleeping on Termux
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock
    echo "✅ Wakelock acquired (Prevents Termux from sleeping)."
fi

# 3. Update and Install Missing Packages non-interactively
echo "🔄 Ensuring dependencies are installed (Node.js, OpenSSL)..."
if command -v pkg &> /dev/null; then
    pkg update -y && pkg upgrade -y
    pkg install -y nodejs openssl
fi

# 4. Create Server Directory and move files
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Download the latest files from your repo (otphttps) for reliability
echo "⬇️ Fetching latest server code..."
curl -s -o server.js https://raw.githubusercontent.com/mansanitizer/otphttps/main/server.js
curl -s -o package.json https://raw.githubusercontent.com/mansanitizer/otphttps/main/package.json

# 5. Install Node modules
echo "📦 Installing npm dependencies..."
npm install --silent

# 6. Start the Node Server in the background with persistent logging
echo "🟢 Starting Node API Server on port $PORT..."
export API_KEY=$DEFAULT_API_KEY
export PORT=$PORT
export NODE_ENV=production

# Clear old logs
rm -f server.log

# Use nohup to keep it open even after terminal closes
# Using 'while' loop to automatically restart if it crashes (Heartbeat)
nohup sh -c "until node server.js; do echo 'Server crashed, restarting...' >> server.log; sleep 1; done" > server.log 2>&1 &

echo "======================================================"
echo "🎉 SETUP COMPLETE & PERSISTENT!"
echo ""
echo "🔗 Local HTTPS Endpoint: https://localhost:$PORT"
echo "🔑 Your API Key:      $API_KEY"
echo "📜 Monitoring Logs:   tail -f $PROJECT_DIR/server.log"
echo ""
echo "💡 The server is now running in the background."
echo "   It will automatically restart if it crashes."
echo "======================================================"
