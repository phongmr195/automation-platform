# 🚀 Quick Start Guide - Crypto Price Monitor

## ✅ System Status

Your automation platform is **READY**!

- ✅ Backend: http://localhost:3000
- ✅ Worker: Running
- ✅ Postgres: Running
- ✅ Redis: Running

## 📱 Create Your Workflow (3 Steps)

### Step 1: Get Telegram Bot Credentials

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow instructions
3. Save your **Bot Token** (e.g., `123456789:ABCdef...`)
4. Message your bot, then visit:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
5. Find and save your **Chat ID** (a number like `123456789`)

### Step 2: Run Setup Script

```bash
./setup-crypto-workflow.sh
```

The script will:

- Ask for your Telegram credentials
- Let you choose coins and schedule
- Create and deploy the workflow
- Optionally test it immediately

### Step 3: Done! 🎉

You'll receive crypto price updates automatically according to your schedule!

## 🧪 Manual Test

After setup, test your workflow:

```bash
# Replace WORKFLOW_ID with the ID from setup
curl -X POST "http://localhost:3000/workflows/WORKFLOW_ID/execute" \
  -H "x-owner-id: demo-owner"
```

Check your Telegram within 10-30 seconds!

## 📊 Example Output

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

## 🎛️ Customization

### Change Schedule

Common cron patterns:

- `0 * * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes
- `0 */6 * * *` - Every 6 hours
- `0 9 * * *` - Daily at 9 AM

### Add/Remove Coins

Edit the CoinGecko URL to include your preferred coins:

```
bitcoin,ethereum,cardano,solana,ripple,dogecoin,polkadot,chainlink
```

Find more coin IDs: https://api.coingecko.com/api/v3/coins/list

## 🆘 Need Help?

- **Full Documentation**: Read `SETUP_COMPLETE.md`
- **Workflow Details**: See `workflows/README.md`
- **Check Logs**: Look at the backend/worker terminals

## 🔗 API Endpoints

```bash
# List all workflows
curl http://localhost:3000/workflows -H "x-owner-id: demo-owner"

# Get specific workflow
curl http://localhost:3000/workflows/ID -H "x-owner-id: demo-owner"

# Execute workflow
curl -X POST http://localhost:3000/workflows/ID/execute -H "x-owner-id: demo-owner"

# View executions
curl http://localhost:3000/workflows/ID/executions -H "x-owner-id: demo-owner"
```

---

**Ready to start?** Run: `./setup-crypto-workflow.sh`
