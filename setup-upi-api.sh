#!/bin/bash

# Configuration
PROJECT_DIR="$HOME/upi-https-backend"
DEFAULT_API_KEY="super-secret-api-key"
PORT=3000

echo "🚀 Starting Termux/Mac UPI API Automated Setup..."

# 1. Prevent Android from sleeping on Termux (if running on Android Termux)
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock
    echo "✅ Wakelock acquired."
fi

# 2. Update and Install Missing Packages non-interactively
echo "🔄 Updating packages and installing dependencies (Node.js, OpenSSL)..."
if command -v pkg &> /dev/null; then
    pkg update -y && pkg upgrade -y
    pkg install -y nodejs openssl
elif command -v brew &> /dev/null; then
    # MacOS Support
    brew install node openssl
fi

# 3. Create Server Directory if it doesnt exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📂 Creating directory $PROJECT_DIR..."
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Copy or download package.json and server.js here...
if [ ! -f "server.js" ]; then
    echo "⚠️ Make sure to copy server.js and package.json into $PROJECT_DIR."
    # Since this is local, we just assume the script is executed in the directory containing server.js
    cp -r "$PWD"/* "$PROJECT_DIR/" 2>/dev/null || true
fi

# 4. Install Node modules
echo "📦 Installing npm dependencies..."
npm install

# 5. Stop existing instances
echo "🛑 Stopping any existing Node.js processes for upihttps..."
pkill -f "node server.js" || true

# 6. Start the Node Server in the background
echo "🟢 Starting Node API Server..."
export API_KEY=$DEFAULT_API_KEY
export PORT=$PORT

# Clean previous logs
rm -f server.log tunnel.log

# Run server in the background and pipe output to server.log
nohup node server.js > server.log 2>&1 &

echo "======================================================"
echo "🎉 SETUP COMPLETE!"
echo ""
echo "🔗 Local HTTPS Endpoint: https://localhost:$PORT"
echo "   (Wait 2-3 seconds for OpenSSL to generate self-signed certs first time)"
echo "🔑 Your API Key:      $API_KEY"
echo "📜 Server Logs:       tail -f $PROJECT_DIR/server.log"
echo "💡 To use in Apple Shortcuts/Tasker:"
echo "   - URL: https://localhost:$PORT/api/balance"
echo "   - Headers: { 'x-api-key': 'super-secret-api-key' }"
echo "   - Feature: Read 'voiceResponse' out loud to the user"
echo "======================================================"
