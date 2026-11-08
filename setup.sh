#!/bin/bash

# AIOps Agentic UI - Quick Start Script
# This script helps you set up and run the application

set -e

echo "🚀 AIOps Agentic UI - Quick Start"
echo "=================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.11+"
    exit 1
fi

echo "✅ Prerequisites satisfied"

# Check for .env files
if [ ! -f "backend/node-api/.env" ]; then
    echo "📝 Creating backend/node-api/.env from template..."
    cp backend/node-api/.env.example backend/node-api/.env
    echo "⚠️  Please edit backend/node-api/.env with your API keys"
fi

if [ ! -f "backend/python-agent/.env" ]; then
    echo "📝 Creating backend/python-agent/.env from template..."
    cp backend/python-agent/.env.example backend/python-agent/.env
    echo "⚠️  Please edit backend/python-agent/.env with your API keys"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

echo "Installing Node API dependencies..."
cd backend/node-api
npm install --silent

echo "Installing Python Agent dependencies..."
cd ../python-agent
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q

echo "Installing Frontend dependencies..."
cd ../../frontend
npm install --silent

cd ..

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env files with your API keys:"
echo "   - backend/node-api/.env"
echo "   - backend/python-agent/.env"
echo ""
echo "2. Start the services in 3 separate terminals:"
echo ""
echo "   Terminal 1 (Node API):"
echo "   cd backend/node-api && npm run dev"
echo ""
echo "   Terminal 2 (Python Agent):"
echo "   cd backend/python-agent && source venv/bin/activate && python main.py"
echo ""
echo "   Terminal 3 (Frontend):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open http://localhost:3001 in your browser"
echo ""
echo "🎉 Happy AIOps!"
