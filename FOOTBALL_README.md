# ⚽ Football Results Daily Notification

Automatically fetch and send football results from major European leagues to Telegram every day at 7:00 AM.

## 🏆 Supported Leagues

- **UEFA Champions League** 🏆
- **UEFA Europa League** 🏆
- **Premier League** 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (England)
- **La Liga** 🇪🇸 (Spain)
- **Bundesliga** 🇩🇪 (Germany)
- **Serie A** 🇮🇹 (Italy)
- **Ligue 1** 🇫🇷 (France)

---

## 🚀 Quick Start

### Option 1: FREE Public API (football-data.org) - Recommended

**Free tier: 10 requests/minute, no credit card required!**

1. Visit: https://www.football-data.org/client/register
2. Register for free account
3. Copy your API key from your account dashboard
4. Add to `.env`:

```bash
FOOTBALL_API_KEY="your-football-data-org-key"
FOOTBALL_API_PROVIDER="football-data"
```

### Option 2: API-FOOTBALL via RapidAPI

1. Visit: https://rapidapi.com/api-sports/api/api-football
2. Click **"Subscribe to Test"**
3. Select the **FREE** plan (Basic - 100 requests/day)
4. Copy your API key from the dashboard
5. Add to `.env`:

```bash
FOOTBALL_API_KEY="your-rapidapi-key-here"
FOOTBALL_API_PROVIDER="rapidapi"
```

### Run Setup Script

```bash
cd /Users/phongvu/Documents/Work/automation-platform
./setup-football-workflow.sh
```

This will:
- Create the football workflow
- Publish the workflow version
- Test the workflow immediately
- Set up daily schedule (7:00 AM)

---

## 📡 API Endpoints

### Get Supported Leagues
```bash
curl http://localhost:3000/football/leagues
```

**Response:**
```json
[
  {
    "id": 2,
    "name": "UEFA Champions League",
    "flag": "🏆"
  },
  {
    "id": 39,
    "name": "Premier League",
    "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
  }
]
```

### Get Yesterday's Results
```bash
curl http://localhost:3000/football/results/yesterday
```

**Response:**
```json
[
  {
    "league": "Premier League",
    "leagueFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "matches": [
      {
        "id": 1234567,
        "date": "2025-12-02",
        "time": "22:00",
        "homeTeam": "Manchester United",
        "awayTeam": "Liverpool",
        "homeScore": 2,
        "awayScore": 1,
        "status": "Match Finished",
        "league": "Premier League",
        "leagueFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
      }
    ]
  }
]
```

### Send Results to Telegram
```bash
curl -X POST http://localhost:3000/football/notify
```

**Response:**
```json
{
  "success": true,
  "message": "Football results sent to Telegram",
  "matchesCount": 8,
  "leaguesCount": 3
}
```

---

## 🔧 Workflow Configuration

The workflow is defined in `football-workflow.json`:

```json
{
  "name": "Football Results Daily Notification",
  "schedule": {
    "cron": "0 7 * * *",
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

### Workflow Steps

1. **Fetch Football Results** - GET yesterday's matches from all leagues
2. **Format Message** - Create formatted Telegram message
3. **Send to Telegram** - Send notification

---

## 📱 Telegram Message Format

```
⚽ KẾT QUẢ BÓNG ĐÁ
Thứ Tư, ngày 2 tháng 12 năm 2025

🏴󠁧󠁢󠁥󠁮󠁧󠁿 PREMIER LEAGUE
────────────────────────────────────────
22:00 ✅
Manchester United 2 - 1 Liverpool

22:00 ✅
Arsenal 3 - 0 Chelsea

🇪🇸 LA LIGA
────────────────────────────────────────
23:00 ✅
Real Madrid 2 - 2 Barcelona

23:00 🤝
Atletico Madrid 1 - 1 Sevilla

━━━━━━━━━━━━━━━━━━━━━━
📊 Tổng số trận: 4
```

**Emojis:**
- ✅ Win
- 🤝 Draw
- 🏆 Champions/Europa League
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🇪🇸 🇩🇪 🇮🇹 🇫🇷 Country flags

---

## ⏰ Schedule

The workflow runs automatically **every day at 7:00 AM** (Vietnam time) to send yesterday's results.

### Change Schedule

To modify the schedule, edit the cron pattern in `football-workflow.json`:

```json
"schedule": {
  "cron": "0 7 * * *",  // Minute Hour Day Month DayOfWeek
  "timezone": "Asia/Ho_Chi_Minh"
}
```

**Examples:**
- `0 7 * * *` - Every day at 7:00 AM
- `0 8 * * 1-5` - Weekdays at 8:00 AM
- `0 6,18 * * *` - Daily at 6:00 AM and 6:00 PM
- `0 7 * * 2,6` - Tuesday and Saturday at 7:00 AM

---

## 🧪 Manual Testing

### Test API Connection
```bash
curl http://localhost:3000/football/leagues
```

### Test Yesterday's Results
```bash
curl http://localhost:3000/football/results/yesterday
```

### Test Telegram Notification
```bash
curl -X POST http://localhost:3000/football/notify
```

### Test Workflow Execution
```bash
# Get workflow ID from setup script output
WORKFLOW_ID="your-workflow-id"

curl -X POST "http://localhost:3000/workflows/$WORKFLOW_ID/execute" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 🔍 Troubleshooting

### Error: "Football API not configured"

**Solution:** Add `FOOTBALL_API_KEY` to `backend/.env`

```bash
FOOTBALL_API_KEY="your-rapidapi-key-here"
```

### Error: "Telegram not configured"

**Solution:** Add Telegram credentials to `backend/.env`

```bash
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
```

### Error: "Rate limit reached"

**Solution:** The free tier allows 100 requests/day. Each workflow run uses ~7 requests (one per league). Consider:
- Upgrading to paid plan
- Reducing checked leagues
- Running less frequently

### No Results Found

**Possible causes:**
- No matches played yesterday
- Matches still in progress
- League season break
- API data delay

**Check:**
```bash
# View raw API response
curl http://localhost:3000/football/results/yesterday | python3 -m json.tool
```

---

## 📊 API Rate Limits

### Free Options Comparison

| Provider | Free Tier | Rate Limit | Registration |
|----------|-----------|------------|--------------|
| **football-data.org** | ✅ Free forever | 10 req/min | Email only |
| **API-FOOTBALL (RapidAPI)** | 100 req/day | 7 leagues = ~14 runs/day | Email + Card |

**Recommendation:** Use **football-data.org** for unlimited free access with no credit card required!

### Usage Tips

- **Football-data.org**: 10 requests/minute = plenty for daily workflow
- **RapidAPI**: 100 requests/day, each workflow run uses ~7 requests
- Run once daily at 7:00 AM = ~1-7 requests depending on matches
- Monitor usage on respective dashboards

---

## 🔐 Security

### API Key Protection

✅ API key stored in `.env` file (gitignored)  
✅ Never commit API keys to repository  
✅ Use environment variables in workflow

### Best Practices

1. **Rotate keys regularly** - Change API key every 90 days
2. **Monitor usage** - Check RapidAPI dashboard
3. **Separate environments** - Use different keys for dev/prod
4. **Limit permissions** - Only subscribe to necessary APIs

---

## 🎯 Advanced Configuration

### Filter Specific Leagues

Edit `backend/src/services/footballService.ts` to comment out unwanted leagues:

```typescript
export const FOOTBALL_LEAGUES = {
  CHAMPIONS_LEAGUE: { id: 2, name: 'UEFA Champions League', flag: '🏆' },
  // EUROPA_LEAGUE: { id: 3, name: 'UEFA Europa League', flag: '🏆' },
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  // ... comment out leagues you don't want
};
```

### Send to Multiple Telegram Chats

Modify `backend/src/services/telegramBot.ts` to support multiple chat IDs:

```typescript
const chatIds = [
  process.env.TELEGRAM_CHAT_ID,
  process.env.TELEGRAM_GROUP_ID,
];

for (const chatId of chatIds) {
  await this.sendMessage(message, chatId);
}
```

### Add More Leagues

Find league IDs from API-Football documentation:
https://www.api-football.com/documentation-v3#tag/Leagues

Add to `FOOTBALL_LEAGUES` in `footballService.ts`:

```typescript
SERIE_B: { id: 136, name: 'Serie B', flag: '🇮🇹' },
CHAMPIONSHIP: { id: 40, name: 'Championship', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
```

---

## 📝 Files Created

| File | Description |
|------|-------------|
| `backend/src/services/footballService.ts` | Football API service |
| `backend/src/routes/football.ts` | Football API endpoints |
| `football-workflow.json` | Workflow definition |
| `setup-football-workflow.sh` | Setup automation script |
| `FOOTBALL_README.md` | This documentation |

---

## ✅ Setup Checklist

- [ ] Get RapidAPI Football API key
- [ ] Add `FOOTBALL_API_KEY` to `.env`
- [ ] Verify Telegram configured (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- [ ] Run `./setup-football-workflow.sh`
- [ ] Test with `curl -X POST http://localhost:3000/football/notify`
- [ ] Check Telegram for results
- [ ] Verify workflow scheduled (7:00 AM daily)

---

## 🆘 Support

### Quick Test
```bash
# Test everything
curl -X POST http://localhost:3000/football/notify
```

### Check Logs
```bash
# Backend logs
cd backend
npm run dev

# Worker logs (for scheduled execution)
cd worker
npm run dev
```

### API Documentation
- Football API: https://www.api-football.com/documentation-v3
- RapidAPI Dashboard: https://rapidapi.com/developer/dashboard

---

## 🎉 Next Steps

1. **Wait for tomorrow** - Workflow runs at 7:00 AM automatically
2. **Check Telegram** - Results will appear in your chat
3. **Monitor usage** - Watch RapidAPI dashboard
4. **Customize** - Adjust leagues, schedule, or message format as needed

---

**Created:** December 3, 2025  
**Status:** ✅ Ready to use  
**Schedule:** Daily at 7:00 AM Vietnam time
