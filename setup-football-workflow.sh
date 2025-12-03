#!/bin/bash

# Football Results Workflow Setup Script
echo "⚽ Football Results Workflow Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if backend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Backend is not running!"
    echo "Please start the backend first:"
    echo "  cd backend && npm run dev"
    exit 1
fi

echo "✅ Backend is running"

# Check environment variables
echo ""
echo "📝 Checking configuration..."

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "⚠️  Telegram not configured in .env file"
    echo "Please add these to backend/.env:"
    echo "  TELEGRAM_BOT_TOKEN=\"your-bot-token\""
    echo "  TELEGRAM_CHAT_ID=\"your-chat-id\""
    echo ""
fi

if [ -z "$FOOTBALL_API_KEY" ]; then
    echo "⚠️  Football API key not configured"
    echo ""
    echo "📌 Get your FREE Football API key (100 requests/day):"
    echo "1. Visit: https://rapidapi.com/api-sports/api/api-football"
    echo "2. Click 'Subscribe to Test'"
    echo "3. Select the FREE plan (Basic - 100 requests/day)"
    echo "4. Copy your API key"
    echo "5. Add to backend/.env:"
    echo "   FOOTBALL_API_KEY=\"your-api-key-here\""
    echo ""
    read -p "Do you want to continue without API key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🔧 Creating Football Results Workflow..."

# Create workflow
WORKFLOW_RESPONSE=$(curl -s -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d @football-workflow.json)

WORKFLOW_ID=$(echo $WORKFLOW_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WORKFLOW_ID" ]; then
    echo "❌ Failed to create workflow"
    echo "Response: $WORKFLOW_RESPONSE"
    exit 1
fi

echo "✅ Workflow created with ID: $WORKFLOW_ID"

# Get the latest version ID
VERSION_RESPONSE=$(curl -s "http://localhost:3000/workflows/$WORKFLOW_ID")
VERSION_ID=$(echo $VERSION_RESPONSE | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)

if [ -z "$VERSION_ID" ]; then
    echo "❌ Failed to get version ID"
    exit 1
fi

echo "✅ Version ID: $VERSION_ID"

# Publish the workflow
echo ""
echo "📤 Publishing workflow..."
curl -s -X POST "http://localhost:3000/workflow-version/$VERSION_ID/publish" > /dev/null

echo "✅ Workflow published!"

# Test the workflow
echo ""
echo "🧪 Testing workflow..."
echo ""

EXECUTION_RESPONSE=$(curl -s -X POST "http://localhost:3000/workflows/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -d '{}')

EXECUTION_ID=$(echo $EXECUTION_RESPONSE | grep -o '"executionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EXECUTION_ID" ]; then
    echo "❌ Failed to execute workflow"
    echo "Response: $EXECUTION_RESPONSE"
    exit 1
fi

echo "✅ Workflow execution started: $EXECUTION_ID"
echo ""
echo "⏳ Waiting for execution to complete..."

# Wait and check execution status
for i in {1..10}; do
    sleep 2
    STATUS=$(curl -s "http://localhost:3000/workflows/$WORKFLOW_ID" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "success" ]; then
        echo "✅ Workflow completed successfully!"
        echo ""
        echo "📱 Check your Telegram for football results!"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "❌ Workflow failed"
        break
    fi
    
    echo "   Status: ${STATUS:-pending}... (${i}/10)"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo ""
echo "📊 Workflow Details:"
echo "   Name: Football Results Daily Notification"
echo "   ID: $WORKFLOW_ID"
echo "   Schedule: Every day at 7:00 AM (Vietnam time)"
echo ""
echo "📝 Supported Leagues:"
echo "   🏆 UEFA Champions League"
echo "   🏆 UEFA Europa League"
echo "   🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League"
echo "   🇪🇸 La Liga"
echo "   🇩🇪 Bundesliga"
echo "   🇮🇹 Serie A"
echo "   🇫🇷 Ligue 1"
echo ""
echo "🔧 Manual Test:"
echo "   curl -X POST http://localhost:3000/football/notify"
echo ""
echo "📱 The workflow will automatically run at 7am daily!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
