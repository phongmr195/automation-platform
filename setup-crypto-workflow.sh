#!/bin/bash

# Crypto Price Monitor - Interactive Setup Script
# This creates a workflow that sends hourly crypto price updates to Telegram

set -e

API_URL="http://localhost:3000"
OWNER_ID="demo-owner"

echo "════════════════════════════════════════════════════════════"
echo "   🪙  Crypto Price Monitor - Workflow Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if backend is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "❌ Error: Backend API is not running on $API_URL"
    echo "   Please start the backend first: cd backend && npm run dev"
    exit 1
fi

echo "✅ Backend API is running"
echo ""

# Collect Telegram credentials
echo "📱 Telegram Bot Setup"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "If you don't have a Telegram bot yet:"
echo "  1. Message @BotFather on Telegram"
echo "  2. Send /newbot and follow the instructions"
echo "  3. Save the bot token you receive"
echo ""

read -p "Enter your Telegram Bot Token: " TELEGRAM_BOT_TOKEN

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Bot token is required"
    exit 1
fi

echo ""
echo "To get your Chat ID:"
echo "  1. Message your bot on Telegram"
echo "  2. Visit: https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
echo "  3. Look for \"chat\":{\"id\":YOUR_CHAT_ID"
echo ""

read -p "Enter your Telegram Chat ID: " TELEGRAM_CHAT_ID

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "❌ Chat ID is required"
    exit 1
fi

echo ""
echo "🔧 Configuration"
echo "──────────────────────────────────────────────────────────"
read -p "Workflow name (default: Crypto Price Monitor): " WORKFLOW_NAME
WORKFLOW_NAME=${WORKFLOW_NAME:-"Crypto Price Monitor"}

echo ""
echo "Schedule options:"
echo "  1) Every hour (0 * * * *)"
echo "  2) Every 30 minutes (*/30 * * * *)"
echo "  3) Every 6 hours (0 */6 * * *)"
echo "  4) Custom cron expression"
read -p "Select schedule (1-4): " SCHEDULE_CHOICE

case $SCHEDULE_CHOICE in
    1)
        CRON="0 * * * *"
        SCHEDULE_DESC="every hour"
        ;;
    2)
        CRON="*/30 * * * *"
        SCHEDULE_DESC="every 30 minutes"
        ;;
    3)
        CRON="0 */6 * * *"
        SCHEDULE_DESC="every 6 hours"
        ;;
    4)
        read -p "Enter cron expression: " CRON
        SCHEDULE_DESC="custom schedule"
        ;;
    *)
        CRON="0 * * * *"
        SCHEDULE_DESC="every hour"
        ;;
esac

echo ""
echo "💰 Select Cryptocurrencies"
echo "──────────────────────────────────────────────────────────"
echo "  1) Top 5: Bitcoin, Ethereum, Cardano, Solana, Ripple"
echo "  2) Top 10: Add Dogecoin, Polkadot, Polygon, Litecoin, Chainlink"
echo "  3) Custom list"
read -p "Select option (1-3): " COINS_CHOICE

case $COINS_CHOICE in
    1)
        COINS="bitcoin,ethereum,cardano,solana,ripple"
        ;;
    2)
        COINS="bitcoin,ethereum,cardano,solana,ripple,dogecoin,polkadot,matic-network,litecoin,chainlink"
        ;;
    3)
        echo "Enter coin IDs separated by commas (e.g., bitcoin,ethereum)"
        echo "Find coin IDs at: https://api.coingecko.com/api/v3/coins/list"
        read -p "Coins: " COINS
        ;;
    *)
        COINS="bitcoin,ethereum,cardano,solana,ripple"
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📝 Creating workflow..."
echo "════════════════════════════════════════════════════════════"
echo ""

# Create the workflow
WORKFLOW_DATA=$(cat <<EOF
{
  "name": "$WORKFLOW_NAME",
  "description": "Fetches cryptocurrency prices and sends to Telegram $SCHEDULE_DESC",
  "trigger": {
    "type": "schedule",
    "config": {
      "cron": "$CRON"
    }
  },
  "definition": {
    "nodes": [
      {
        "id": "1",
        "type": "http",
        "name": "Fetch Crypto Prices",
        "position": {"x": 100, "y": 100},
        "config": {
          "url": "https://api.coingecko.com/api/v3/simple/price?ids=$COINS&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
          "method": "GET",
          "headers": {
            "Accept": "application/json"
          }
        }
      },
      {
        "id": "2",
        "type": "transform",
        "name": "Format Message",
        "position": {"x": 350, "y": 100},
        "config": {
          "code": "const prices = context.nodes['1']; let message = '🪙 *Crypto Price Update*\\\\n━━━━━━━━━━━━━━━━\\\\n\\\\n'; const coins = []; for (const [coin, data] of Object.entries(prices)) { coins.push({ name: coin, price: data.usd, change: data.usd_24h_change || 0, cap: data.usd_market_cap }); } coins.sort((a, b) => (b.cap || 0) - (a.cap || 0)); for (const coin of coins) { const change = coin.change; const emoji = change >= 0 ? '📈' : '📉'; const coinName = coin.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); const formattedPrice = coin.price >= 1 ? coin.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : coin.price.toFixed(6); message += \\\`\\\${emoji} *\\\${coinName}*\\\\n💵 $\\\${formattedPrice} (\\\${change >= 0 ? '+' : ''}\\\${change.toFixed(2)}%)\\\\n\\\\n\\\`; } message += '━━━━━━━━━━━━━━━━\\\\n🕐 ' + new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: true }) + ' UTC'; return { message };"
        }
      },
      {
        "id": "3",
        "type": "http",
        "name": "Send to Telegram",
        "position": {"x": 600, "y": 100},
        "config": {
          "url": "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "chat_id": "$TELEGRAM_CHAT_ID",
            "text": "{{nodes.2.message}}",
            "parse_mode": "Markdown",
            "disable_web_page_preview": true
          }
        }
      }
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2"},
      {"id": "e2-3", "source": "2", "target": "3"}
    ]
  }
}
EOF
)

WORKFLOW_RESPONSE=$(curl -s -X POST "$API_URL/workflows" \
  -H "Content-Type: application/json" \
  -H "x-owner-id: $OWNER_ID" \
  -d "$WORKFLOW_DATA")

WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$WORKFLOW_ID" ]; then
    echo "❌ Failed to create workflow"
    echo "Response: $WORKFLOW_RESPONSE"
    exit 1
fi

echo "✅ Workflow created: $WORKFLOW_ID"

# Publish the workflow
echo ""
echo "📤 Publishing workflow..."

PUBLISH_RESPONSE=$(curl -s -X POST "$API_URL/workflows/$WORKFLOW_ID/publish" \
  -H "Content-Type: application/json" \
  -H "x-owner-id: $OWNER_ID" \
  -d '{"notes": "Initial deployment"}')

echo "✅ Workflow published and scheduled"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Workflow Details:"
echo "   • Name: $WORKFLOW_NAME"
echo "   • ID: $WORKFLOW_ID"
echo "   • Schedule: $CRON ($SCHEDULE_DESC)"
echo "   • Coins: $COINS"
echo ""
echo "📱 You will receive crypto price updates in your Telegram chat!"
echo ""
echo "🧪 Test it now (optional):"
echo "   curl -X POST \"$API_URL/workflows/$WORKFLOW_ID/execute\" \\"
echo "     -H \"x-owner-id: $OWNER_ID\""
echo ""

read -p "Would you like to test the workflow now? (y/n): " TEST_NOW

if [[ "$TEST_NOW" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Executing workflow..."
    EXEC_RESPONSE=$(curl -s -X POST "$API_URL/workflows/$WORKFLOW_ID/execute" \
      -H "x-owner-id: $OWNER_ID")
    
    EXEC_ID=$(echo "$EXEC_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$EXEC_ID" ]; then
        echo "✅ Execution started: $EXEC_ID"
        echo "   Check your Telegram for the message!"
    else
        echo "⚠️  Execution may have failed: $EXEC_RESPONSE"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Happy crypto tracking! 🚀"
echo "════════════════════════════════════════════════════════════"
