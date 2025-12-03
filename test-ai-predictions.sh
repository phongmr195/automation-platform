#!/bin/bash

# AI Lottery Prediction Test Script
# This script tests all AI prediction endpoints

echo "🤖 AI Lottery Prediction System - Test Suite"
echo "=============================================="
echo ""

BASE_URL="http://localhost:3000/lottery"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $endpoint"
    echo ""
    
    response=$(curl -sS -X POST "$endpoint" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains error
        if echo "$response" | grep -q '"error"'; then
            echo -e "${RED}❌ FAILED${NC}"
            echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        else
            echo -e "${GREEN}✅ PASSED${NC}"
            echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        fi
    else
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        echo "$response"
    fi
    
    echo ""
    echo "---"
    echo ""
}

# Check if backend is running
echo "Checking if backend is running..."
if ! curl -sS http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running on port 3000${NC}"
    echo "Please start backend: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""
echo "---"
echo ""

# Test 1: Legacy frequency-based prediction
test_endpoint "1. Frequency-based Prediction (NORTH)" \
    "$BASE_URL/predict/NORTH"

# Test 2: Claude AI prediction
test_endpoint "2. Claude AI Prediction (NORTH)" \
    "$BASE_URL/ai/predict/NORTH?provider=claude"

# Test 3: GPT AI prediction
test_endpoint "3. GPT AI Prediction (CENTRAL)" \
    "$BASE_URL/ai/predict/CENTRAL?provider=gpt"

# Test 4: Gemini AI prediction
test_endpoint "4. Gemini AI Prediction (SOUTH)" \
    "$BASE_URL/ai/predict/SOUTH?provider=gemini"

# Test 5: Consensus prediction
test_endpoint "5. AI Consensus Prediction (NORTH)" \
    "$BASE_URL/ai/consensus/NORTH"

# Test 6: Compare all methods
test_endpoint "6. Compare All Methods (NORTH)" \
    "$BASE_URL/compare/NORTH"

echo ""
echo "=============================================="
echo "🏁 Test Suite Completed"
echo ""
echo "📝 Notes:"
echo "  - Errors about API keys mean you need to configure them in .env"
echo "  - Add your API keys to backend/.env:"
echo "    ANTHROPIC_API_KEY=sk-ant-..."
echo "    OPENAI_API_KEY=sk-..."
echo "    GOOGLE_API_KEY=AIza..."
echo ""
echo "📚 See AI_LOTTERY_README.md for setup instructions"
echo "=============================================="
