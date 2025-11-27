#!/bin/bash
# BoilerBrain Quick Start Script
# Starts both servers and runs immediate tests

echo "🔥 BoilerBrain Quick Start"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Kill any existing processes
print_status "Cleaning up existing processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Step 2: Check environment
print_status "Checking environment..."
if [ ! -f ".env" ]; then
    print_error "Missing .env file!"
    echo "Please create .env file with required API keys"
    exit 1
fi

# Step 3: Start backend server
print_status "Starting backend server..."
cd server
PORT=3001 node index.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3

# Step 4: Test backend health
print_status "Testing backend health..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Backend server is running!"
else
    print_error "Backend server failed to start!"
    echo "Check backend.log for details"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Step 5: Start frontend server
print_status "Starting frontend server..."
npm run dev -- --port 5179 > frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# Step 6: Test frontend
print_status "Testing frontend..."
if curl -s http://localhost:5179/ | grep -q "BoilerBrain"; then
    print_success "Frontend server is running!"
else
    print_error "Frontend server failed to start!"
    echo "Check frontend.log for details"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Step 7: Test API connectivity
print_status "Testing API connectivity..."
API_TEST=$(curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test-123"}')

if echo "$API_TEST" | grep -q "reply"; then
    print_success "API connectivity working!"
else
    print_warning "API connectivity issues detected"
    echo "Response: $API_TEST"
fi

# Step 8: Test proxy connection
print_status "Testing frontend-backend proxy..."
PROXY_TEST=$(curl -s -X POST http://localhost:5179/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Proxy test","sessionId":"proxy-test"}')

if echo "$PROXY_TEST" | grep -q "reply"; then
    print_success "Proxy connection working!"
else
    print_warning "Proxy connection issues detected"
    echo "Response: $PROXY_TEST"
fi

# Final status
echo ""
echo "🎉 BoilerBrain Startup Complete!"
echo "================================="
echo "📍 Frontend: http://localhost:5179"
echo "🔧 Backend:  http://localhost:3001"
echo "📊 API Health: http://localhost:3001/api/health"
echo ""
echo "📝 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📋 Test the Chat Dock at: http://localhost:5179"
echo "   1. Open browser to localhost:5179"
echo "   2. Send a test message like 'Vaillant F28 error'"
echo "   3. Check browser console (F12) for any errors"

# Keep processes running
wait
