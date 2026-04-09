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

echo "✅ Build complete!"
