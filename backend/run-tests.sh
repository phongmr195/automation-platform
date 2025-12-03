#!/bin/bash

# Test Runner Script for Automation Platform Backend
# This script helps you run tests with the server running

set -e

echo "🧪 Automation Platform Backend Test Runner"
echo "=========================================="
echo ""

# Check if server is running
echo "📡 Checking if backend server is running on http://localhost:3000..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running!"
else
    echo "❌ Server is not running!"
    echo ""
    echo "Please start the server in another terminal with:"
    echo "  cd backend && npm run dev"
    echo ""
    read -p "Press Enter once the server is running, or Ctrl+C to exit..."
fi

echo ""
echo "🏃 Running tests..."
echo ""

# Run the tests
if [ -z "$1" ]; then
    # Run all tests
    npm test
else
    # Run specific test file
    npm test -- "$1"
fi

echo ""
echo "✨ Testing complete!"
