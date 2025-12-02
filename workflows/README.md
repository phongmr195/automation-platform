# Crypto Price Monitor Workflow

This guide will help you set up an automated workflow that fetches cryptocurrency prices every hour and sends them to your Telegram chat.

## Prerequisites

1. **Telegram Bot**: Create a bot using [@BotFather](https://t.me/BotFather)
2. **Chat ID**: Get your chat ID by messaging your bot and visiting:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```

## Quick Setup

### Step 1: Create Telegram Credential

```bash
curl -X POST http://localhost:3000/credentials \
  -H "Content-Type: application/json" \
  -H "x-owner-id: demo-owner" \
  -d '{
    "name": "My Telegram Bot",
    "provider": "telegram",
    "type": "apiKey",
    "secret": {
      "botToken": "YOUR_BOT_TOKEN_HERE",
      "chatId": "YOUR_CHAT_ID_HERE"
    }
  }'
```

Save the returned `credential.id` for the next step.

### Step 2: Create the Workflow

```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -H "x-owner-id: demo-owner" \
  -d '{
    "name": "Crypto Price Monitor",
    "description": "Hourly crypto price updates to Telegram",
    "trigger": {
      "type": "schedule",
      "config": {
        "cron": "0 * * * *"
      }
    },
    "definition": {
      "nodes": [
        {
          "id": "1",
          "type": "http",
          "name": "Fetch Prices",
          "config": {
            "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana,ripple&vs_currencies=usd&include_24hr_change=true",
            "method": "GET"
          }
        },
        {
          "id": "2",
          "type": "transform",
          "name": "Format Message",
          "config": {
            "code": "const prices = context.nodes[\"1\"]; let msg = \"💰 Crypto Prices\\n\\n\"; for (const [coin, data] of Object.entries(prices)) { const emoji = (data.usd_24h_change || 0) >= 0 ? \"📈\" : \"📉\"; msg += `${emoji} ${coin.toUpperCase()}: $${data.usd} (${data.usd_24h_change?.toFixed(2) || 0}%)\\n`; } return { message: msg };"
          }
        },
        {
          "id": "3",
          "type": "http",
          "name": "Send to Telegram",
          "config": {
            "url": "https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage",
            "method": "POST",
            "body": {
              "chat_id": "YOUR_CHAT_ID",
              "text": "{{nodes.2.message}}"
            }
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "1", "target": "2"},
        {"id": "e2", "source": "2", "target": "3"}
      ]
    }
  }'
```

**Important**: Replace `YOUR_BOT_TOKEN` and `YOUR_CHAT_ID` with your actual values.

Save the returned `workflow.id`.

### Step 3: Publish the Workflow

```bash
curl -X POST http://localhost:3000/workflows/WORKFLOW_ID/publish \
  -H "Content-Type: application/json" \
  -H "x-owner-id: demo-owner" \
  -d '{
    "notes": "Initial deployment"
  }'
```

Replace `WORKFLOW_ID` with the ID from Step 2.

### Step 4: Test Immediately (Optional)

```bash
curl -X POST http://localhost:3000/workflows/WORKFLOW_ID/execute \
  -H "x-owner-id: demo-owner"
```

## Workflow Details

### Nodes

1. **Fetch Prices** (HTTP Node)
   - Calls CoinGecko API to get current prices for major cryptocurrencies
   - Returns price data with 24-hour changes

2. **Format Message** (Transform Node)
   - Processes the price data
   - Formats it into a readable Telegram message
   - Adds emojis based on price movement

3. **Send to Telegram** (HTTP Node)
   - Sends the formatted message to your Telegram chat
   - Uses the Telegram Bot API

### Schedule

The workflow runs on a cron schedule: `0 * * * *`

- This means: Every hour, at minute 0
- Examples: 1:00, 2:00, 3:00, etc.

### Customize

You can modify:

- **Coins**: Edit the `ids` parameter in the CoinGecko URL
- **Schedule**: Change the `cron` value (e.g., `*/30 * * * *` for every 30 minutes)
- **Message Format**: Edit the transformation code in node 2

## Troubleshooting

### Check Workflow Status

```bash
curl http://localhost:3000/workflows/WORKFLOW_ID \
  -H "x-owner-id: demo-owner"
```

### View Execution Logs

```bash
curl http://localhost:3000/workflows/WORKFLOW_ID/executions \
  -H "x-owner-id: demo-owner"
```

### Manual Test

Execute the workflow immediately to test without waiting for the schedule:

```bash
curl -X POST http://localhost:3000/workflows/WORKFLOW_ID/execute \
  -H "x-owner-id: demo-owner"
```

## Example Output

Your Telegram will receive messages like:

```
💰 Crypto Prices

📈 BITCOIN: $42150.00 (+2.34%)
📉 ETHEREUM: $2240.50 (-1.12%)
📈 CARDANO: $0.65 (+0.89%)
📈 SOLANA: $98.23 (+5.67%)
📉 RIPPLE: $0.54 (-0.45%)
```
