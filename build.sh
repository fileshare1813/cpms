#!/bin/bash

echo "🔧 Starting CPMS Full Stack Build Process..."

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: frontend or backend directory not found"
    echo "📍 Current directory: $(pwd)"
    echo "📁 Contents: $(ls -la)"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend npm install failed"
    exit 1
fi

# Go back to root and install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend npm install failed"
    exit 1
fi

# Build React frontend
echo "🏗️ Building React frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Check if build folder was created
if [ ! -d "build" ]; then
    echo "❌ Error: Frontend build folder not created"
    exit 1
fi

# Create backend build directory if it doesn't exist
echo "📋 Creating backend build directory..."
mkdir -p ../backend/build

# Copy build to backend folder
echo "📋 Copying frontend build to backend..."
cp -r build/* ../backend/build/
if [ $? -ne 0 ]; then
    echo "❌ Failed to copy build files"
    exit 1
fi

# Go to backend directory
cd ../backend

# Verify build files were copied
if [ -f "build/index.html" ]; then
    echo "✅ Build process completed successfully!"
    echo "📁 Build files verified in backend/build/"
    echo "📄 Files copied: $(ls -la build/)"
else
    echo "❌ Error: index.html not found in backend/build/"
    echo "📁 Backend build contents: $(ls -la build/ 2>/dev/null || echo 'Directory not found')"
    exit 1
fi

echo "🚀 Ready to start server!"
echo "📍 Current directory: $(pwd)"
echo "📁 Build files: $(ls -la build/ | head -5)"
