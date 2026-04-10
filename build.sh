#!/bin/bash
# Build script for Render deployment

echo "🔧 Installing server dependencies..."
cd server
npm install --legacy-peer-deps
cd ..

echo "🔧 Installing client dependencies..."
cd client
npm install --legacy-peer-deps

echo "🏗️ Building client..."
npm run build
cd ..

# Verify build output
if [ -f "server/public/index.html" ]; then
  echo "✅ Build successful - index.html found in server/public/"
else
  echo "❌ ERROR: index.html not found in server/public/"
  echo "Checking client/dist/..."
  if [ -f "client/dist/index.html" ]; then
    echo "✅ Found in client/dist/ - copying to server/public/"
    rm -rf server/public
    cp -r client/dist server/public
  else
    echo "❌ ERROR: Build output not found!"
    exit 1
  fi
fi

echo "✅ Build complete!"
