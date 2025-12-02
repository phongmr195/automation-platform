# 🎉 Your Automation Platform is Ready!

## ✅ Services Running

All services are up and running:

- **Backend API**: http://localhost:3000
- **Worker**: Processing workflows in the background
- **Frontend**: Vite dev server (check terminal for port)
- **Postgres**: localhost:5432
- **Redis**: localhost:6379

## 🪙 Crypto Price Monitoring Workflow

### Quick Start (Easiest Way)

Run the interactive setup script:

```bash
./setup-crypto-workflow.sh
```

This script will:

1. Guide you through Telegram bot setup
2. Create the workflow automatically
3. Let you choose coins and schedule
4. Test the workflow immediately

### Manual Setup

If you prefer to set up manually, see `workflows/README.md` for detailed instructions.

## 📁 Important Files

- `workflows/README.md` - Complete workflow documentation
- `workflows/crypto-price-monitor.json` - Workflow template
- `setup-crypto-workflow.sh` - Interactive setup script
- `backend/.env` - Backend configuration
- `worker/.env` - Worker configuration

## 🔧 Workflow Components

### Node 1: Fetch Crypto Prices

- **Type**: HTTP Request
- **API**: CoinGecko (free, no API key needed)
- **Data**: Current prices + 24h changes for major cryptocurrencies

### Node 2: Format Message

- **Type**: Transform (JavaScript)
- **Function**: Formats price data into a beautiful Telegram message
- **Features**: Emojis for up/down trends, formatted numbers

### Node 3: Send to Telegram

- **Type**: HTTP Request
- **API**: Telegram Bot API
- **Format**: Markdown for rich formatting

## 📱 Telegram Bot Setup

### 1. Create Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow instructions
4. Save your bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Chat ID

1. Message your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Find your chat ID in the JSON response (under `message.chat.id`)

## 🚀 Testing

### Execute Workflow Manually

```bash
curl -X POST "http://localhost:3000/workflows/YOUR_WORKFLOW_ID/execute" \
  -H "x-owner-id: demo-owner"
```

### Check Execution Status

```bash
curl "http://localhost:3000/workflows/YOUR_WORKFLOW_ID/executions" \
  -H "x-owner-id: demo-owner"
```

### View Workflow Details

```bash
curl "http://localhost:3000/workflows/YOUR_WORKFLOW_ID" \
  -H "x-owner-id: demo-owner"
```

## 🎨 Customization Options

### Change Schedule

Edit the `cron` field in your workflow:

- Every 30 minutes: `*/30 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 9 AM: `0 9 * * *`
- Every Monday at 10 AM: `0 10 * * 1`

### Add More Coins

Update the CoinGecko URL in Node 1:

```
https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,YOUR_COINS_HERE&vs_currencies=usd&include_24hr_change=true
```

Find coin IDs at: https://api.coingecko.com/api/v3/coins/list

### Customize Message Format

Edit the JavaScript code in Node 2 to change:

- Message structure
- Emojis
- Number formatting
- Additional data (volume, market cap, etc.)

## 🛠️ Managing Services

### Stop Services

Find and stop the running processes:

```bash
# Find processes
ps aux | grep -E "npm run dev|node.*vite"

# Kill specific process
kill <PID>
```

### Restart Services

```bash
# Backend
cd backend && npm run dev

# Worker
cd worker && npm run dev

# Frontend
cd frontend && npm run dev
```

### Stop Docker Containers

```bash
docker stop automation-postgres automation-redis
```

### Start Docker Containers

```bash
docker start automation-postgres automation-redis
```

## 📊 Example Telegram Message

```
🪙 *Crypto Price Update*
━━━━━━━━━━━━━━━━

📈 *Bitcoin*
💵 $42,150.00 (+2.34%)

📉 *Ethereum*
💵 $2,240.50 (-1.12%)

📈 *Solana*
💵 $98.23 (+5.67%)

━━━━━━━━━━━━━━━━
🕐 12/2/2025, 3:00 PM UTC
```

## 🐛 Troubleshooting

### Worker not processing

Check the worker logs in the terminal. Make sure:

- Redis is running
- Database migrations are applied
- No errors in the worker terminal

### Telegram messages not sending

1. Verify bot token is correct
2. Check chat ID is a number (not username)
3. Make sure you've messaged the bot first
4. Test the Telegram API directly:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=Test"
```

### Backend API errors

Check `backend/.env` has:

- Correct DATABASE_URL
- Correct REDIS_URL
- CREDENTIAL_ENCRYPTION_KEY set

## 📚 Next Steps

1. **Run the setup script**: `./setup-crypto-workflow.sh`
2. **Test your workflow**: Execute it manually first
3. **Wait for schedule**: Let it run automatically every hour
4. **Customize**: Modify coins, schedule, or message format
5. **Create more workflows**: Build other automation workflows!

## 🌟 Additional Ideas

You can create more workflows for:

- Weather updates
- Stock prices
- News summaries
- GitHub notifications
- Database backups
- API monitoring
- Social media posts

Enjoy your automated crypto price updates! 🚀
