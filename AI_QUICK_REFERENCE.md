# 🚀 Quick Reference - AI Lottery Predictions

## 📋 API Endpoints Cheat Sheet

### Legacy (No API Key Needed)
```bash
# Frequency-based prediction
POST /lottery/predict/:region
curl -X POST http://localhost:3000/lottery/predict/NORTH
```

### AI Predictions (Requires API Key)

```bash
# Single AI Model
POST /lottery/ai/predict/:region?provider={claude|gpt|gemini}

# Examples:
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=claude"
curl -X POST "http://localhost:3000/lottery/ai/predict/CENTRAL?provider=gpt"
curl -X POST "http://localhost:3000/lottery/ai/predict/SOUTH?provider=gemini"

# With Telegram notification:
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini&telegram=true"
```

```bash
# Consensus (All AI Models Combined)
POST /lottery/ai/consensus/:region

curl -X POST http://localhost:3000/lottery/ai/consensus/NORTH
curl -X POST "http://localhost:3000/lottery/ai/consensus/NORTH?telegram=true"
```

```bash
# Compare All Methods
POST /lottery/compare/:region

curl -X POST http://localhost:3000/lottery/compare/NORTH | python3 -m json.tool
```

---

## 🔑 Get API Keys (1 minute setup)

### Gemini (FREE - Recommended!) ⭐
```
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy key → Add to backend/.env:
   GOOGLE_API_KEY="AIza..."
```

### Claude ($5 free credit)
```
1. Visit: https://console.anthropic.com/
2. Sign up → Get API key
3. Add to backend/.env:
   ANTHROPIC_API_KEY="sk-ant-..."
```

### GPT ($5 free trial)
```
1. Visit: https://platform.openai.com/api-keys
2. Create API key
3. Add to backend/.env:
   OPENAI_API_KEY="sk-..."
```

---

## ⚡ Quick Setup (30 seconds)

```bash
# 1. Get Gemini key (free!)
# → https://aistudio.google.com/app/apikey

# 2. Add to .env
cd backend
echo 'GOOGLE_API_KEY="your-key-here"' >> .env

# 3. Restart backend
npm run dev

# 4. Test!
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini" | python3 -m json.tool
```

---

## 📊 Response Structure

```json
{
  "region": "NORTH",
  "bachThuLo": ["12", "34", "56", "78", "90"],  // Top 5 numbers
  "lo3So": ["123", "456", ...],                  // 10 3-digit numbers
  "loXien2": [["12", "34"], ...],                // 10 pairs
  "xien3": [["12", "34", "56"], ...],            // 8 triplets
  "xien4": [["12", "34", "56", "78"], ...],      // 5 quadruplets
  "confidence": 85,                               // 0-100
  "aiProvider": "gemini",                         // Which AI used
  "reasoning": "Pattern analysis shows..."        // AI explanation
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Quick AI Prediction
```bash
# Get Gemini prediction for North region
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini"
```

### Use Case 2: Best Accuracy (Consensus)
```bash
# Get consensus from all configured AI models
curl -X POST http://localhost:3000/lottery/ai/consensus/NORTH
```

### Use Case 3: Compare Everything
```bash
# See all methods side-by-side
curl -X POST http://localhost:3000/lottery/compare/NORTH | python3 -m json.tool
```

### Use Case 4: Send to Telegram
```bash
# AI prediction + Telegram notification
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini&telegram=true"
```

---

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| "API key not configured" | Add API key to `backend/.env` |
| "All AI predictions failed" | Configure at least one AI provider |
| Backend not responding | Restart: `cd backend && npm run dev` |
| "Missing script: dev" | Wrong directory - cd to `backend/` first |

---

## 💰 Costs

| Provider | Free Tier | Paid |
|----------|-----------|------|
| **Gemini** | ✅ 15 req/min | $0.35/M tokens |
| **Claude** | ✅ $5 credit | $3-15/M tokens |
| **GPT-4o** | ✅ $5 trial | $2.5-10/M tokens |

**Typical cost per prediction:** $0.001 - $0.01 (less than 1 cent!)

---

## 📁 Files Created

```
backend/
├── src/
│   ├── services/
│   │   ├── aiPredictionService.ts    ← NEW: AI integration
│   │   └── lotteryPrediction.ts      ← UPDATED: AI methods
│   └── routes/
│       └── lottery.ts                ← UPDATED: AI endpoints
├── .env                              ← UPDATED: API keys
└── package.json                      ← UPDATED: AI packages

docs/
├── AI_LOTTERY_README.md              ← NEW: Full guide
├── AI_INTEGRATION_SUMMARY.md         ← NEW: Quick start
└── AI_QUICK_REFERENCE.md             ← NEW: This file

scripts/
└── test-ai-predictions.sh            ← NEW: Test script
```

---

## ⚡ Testing Commands

```bash
# Test all endpoints
./test-ai-predictions.sh

# Or manually:

# 1. Health check
curl http://localhost:3000/

# 2. Legacy prediction (no API key needed)
curl -X POST http://localhost:3000/lottery/predict/NORTH

# 3. Gemini AI (if configured)
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini"

# 4. Consensus (if any AI configured)
curl -X POST http://localhost:3000/lottery/ai/consensus/NORTH

# 5. Compare all
curl -X POST http://localhost:3000/lottery/compare/NORTH | python3 -m json.tool
```

---

## 🎓 How AI Makes Predictions

1. **Analyzes historical data** (last 30 days)
2. **Identifies patterns:**
   - Which numbers appear most frequently
   - Which pairs/triplets appear together
   - Recent trends vs historical averages
3. **Applies statistical reasoning:**
   - Probability calculations
   - Pattern recognition
   - Cycle detection
4. **Generates predictions** with confidence scores
5. **Explains reasoning** in Vietnamese

---

## 🌟 Pro Tips

1. **Start with Gemini** - It's free!
2. **Use consensus mode** - More accurate than single AI
3. **Compare methods** - See which works best
4. **Monitor confidence scores** - Higher = stronger patterns
5. **Check reasoning** - Understand why AI chose those numbers

---

## 📚 More Info

- **Full Guide:** `AI_LOTTERY_README.md`
- **Setup Instructions:** `AI_INTEGRATION_SUMMARY.md`
- **General Lottery Docs:** `LOTTERY_README.md`
- **Test Results:** `TEST_RESULTS.md`

---

**Ready to try?** Get a free Gemini API key and test in 30 seconds! 🚀
