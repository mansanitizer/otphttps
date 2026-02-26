#!/bin/bash

# Configuration
REPO_URL="https://github.com/mansanitizer/otphttps.git"
PROJECT_DIR="$HOME/sms-api-backend"
DEFAULT_API_KEY="super-secret-api-key"
PORT=3000

echo "🚀 Starting Termux SMS API Automated Setup..."

# 1. Prevent Android from sleeping on Termux
termux-wake-lock
echo "✅ Wakelock acquired."

# 2. Update and Install Missing Packages non-interactively
echo "🔄 Updating packages and installing dependencies (Git, Node.js, Termux-API, Cloudflared)..."
pkg update -y && pkg upgrade -y
pkg install -y git nodejs termux-api cloudflared

# 3. Handle the Git Repository
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Directory $PROJECT_DIR already exists. Pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "⬇️ Cloning repository from $REPO_URL..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# 4. Install Node modules (assuming you have a package.json)
echo "📦 Installing npm dependencies..."
npm install

# 5. Stop existing instances (if rerunning the script)
echo "🛑 Stopping any existing Node.js or Cloudflared processes..."
pkill -f "node server.js" || true
pkill -f "cloudflared tunnel" || true

# 6. Start the Node Server in the background
echo "🟢 Starting Node API Server..."
export API_KEY=$DEFAULT_API_KEY
export PORT=$PORT

# Run server in the background and pipe output to server.log
nohup node server.js > server.log 2>&1 &

# 7. Start Cloudflared tunnel in the background
echo "🌎 Starting Cloudflared Tunnel..."
nohup cloudflared tunnel --url http://localhost:$PORT > tunnel.log 2>&1 &

# 8. Wait for Cloudflared to generate the Public URL
echo "⏳ Waiting for Cloudflare to assign a Public URL..."
sleep 6 

# Extract the Cloudflare URL from the logs
CLOUDFLARE_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' tunnel.log | head -n 1)

echo "======================================================"
echo "🎉 SETUP COMPLETE!"
echo ""
if [ -z "$CLOUDFLARE_URL" ]; then
    echo "⚠️ Could not automatically parse the Cloudflare URL."
    echo "Please check the logs manually with: cat $PROJECT_DIR/tunnel.log"
else
    echo "🔗 Public Endpoint:   $CLOUDFLARE_URL/api/sms"
fi
echo "🔑 Your API Key:      $API_KEY"
echo "📜 Server Logs:       tail -f $PROJECT_DIR/server.log"
echo "======================================================"
