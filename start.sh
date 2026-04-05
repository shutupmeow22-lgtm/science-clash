#!/bin/bash
# Science Clash — Quick Start
# Runs server + client in parallel

echo "⚔️  Science Clash — Starting..."
echo ""

# Install server deps
echo "📦 Installing server dependencies..."
cd server && npm install --silent
cd ..

# Install client deps
echo "📦 Installing client dependencies..."
cd client && npm install --silent
cd ..

echo ""
echo "🚀 Starting server on http://localhost:3001"
echo "🎮 Starting client on http://localhost:5173"
echo ""
echo "Teacher:  open http://localhost:5173 → 'I'm the Teacher'"
echo "Students: open http://localhost:5173 → 'I'm a Student'"
echo ""

# Start both
cd server && node server.js &
SERVER_PID=$!

cd client && npm run dev -- --host &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID" EXIT
wait
