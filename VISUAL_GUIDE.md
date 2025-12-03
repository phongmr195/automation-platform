# 🎯 AI Lottery System - Visual Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOTTERY PREDICTION SYSTEM                        │
│                     AI-Powered & Traditional                        │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
         ┌───────▼────────┐             ┌───────▼────────┐
         │   API ROUTES   │             │  TELEGRAM BOT  │
         │  (Hono.js)     │             │   (Notifier)   │
         └───────┬────────┘             └────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ Legacy │  │   AI   │  │Consen- │  │Compare │
│ /pred  │  │/ai/pred│  │ sus    │  │  All   │
└────────┘  └───┬────┘  └───┬────┘  └───┬────┘
                │            │           │
                └────────┬───┴───────────┘
                         ▼
              ┌─────────────────────┐
              │ LotteryPredictor    │
              │ Service             │
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Frequency   │  │  AI Service  │  │  Historical  │
│  Analysis    │  │              │  │     Data     │
└──────────────┘  └──────┬───────┘  └──────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
      ┌────────┐    ┌────────┐    ┌────────┐
      │ Claude │    │  GPT   │    │ Gemini │
      │Sonnet 4│    │  4-o   │    │2.0Flash│
      └────┬───┘    └───┬────┘    └───┬────┘
           │            │             │
           └────────────┼─────────────┘
                        ▼
                 ┌─────────────┐
                 │  Consensus  │
                 │  Algorithm  │
                 └─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Final Prediction│
              │  • Bạch thủ lô   │
              │  • Lô 3 số       │
              │  • Xiên 2/3/4    │
              │  • Confidence    │
              │  • Reasoning     │
              └──────────────────┘
```

---

## 📊 Data Flow

### 1. Traditional Method (No AI)
```
User Request → API Route → Frequency Analysis → Prediction
                              ↓
                      Historical Data
```

### 2. AI Method (Single Model)
```
User Request → API Route → AI Service → Claude/GPT/Gemini
                              ↓              ↓
                      Historical Data    AI Analysis
                                            ↓
                                    Smart Prediction
```

### 3. Consensus Method (All Models)
```
User Request → API Route → AI Service ─┬→ Claude
                              ↓        ├→ GPT
                      Historical Data  └→ Gemini
                                            ↓
                                    Consensus Algorithm
                                            ↓
                                   Combined Prediction
```

---

## 🔄 Request Flow Examples

### Example 1: AI Prediction with Claude
```
┌─────────────┐
│   Client    │
│ (curl/web)  │
└──────┬──────┘
       │ POST /lottery/ai/predict/NORTH?provider=claude
       ▼
┌─────────────┐
│ Hono Router │
│ lottery.ts  │
└──────┬──────┘
       │ Call predictor.predictWithAI('NORTH', date, 'claude')
       ▼
┌──────────────────┐
│ LotteryPredictor │
│   Service        │
└──────┬───────────┘
       │ Get historical data (30 days)
       ▼
┌─────────────────┐
│ AIPrediction    │
│   Service       │
└──────┬──────────┘
       │ Build Vietnamese prompt with historical data
       ▼
┌─────────────────┐
│ Claude API      │
│ (Anthropic)     │
└──────┬──────────┘
       │ AI analyzes patterns and generates predictions
       ▼
┌─────────────────┐
│ Parse Response  │
│ Extract JSON    │
└──────┬──────────┘
       │ Return prediction with reasoning
       ▼
┌─────────────────┐
│ Client Response │
│ {bachThuLo:..} │
└─────────────────┘
```

### Example 2: Consensus Prediction
```
Client → Router → Predictor → AI Service ─┬→ Claude ─┐
                                          ├→ GPT ───┤→ Consensus → Response
                                          └→ Gemini ┘   Algorithm
```

### Example 3: Compare All
```
Client → Router → Predictor ─┬→ Frequency Analysis ─┐
                             ├→ Claude AI ──────────┤
                             ├→ GPT AI ─────────────┤→ Combined → Response
                             ├→ Gemini AI ──────────┤   Results
                             └→ Consensus ──────────┘
```

---

## 🎨 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (backend/)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              src/routes/lottery.ts               │  │
│  │  • POST /predict/:region (legacy)                │  │
│  │  • POST /ai/predict/:region (single AI)          │  │
│  │  • POST /ai/consensus/:region (all AI)           │  │
│  │  • POST /compare/:region (compare all)           │  │
│  │  • GET /schedules (view draw times)              │  │
│  │  • POST /telegram/test (test Telegram)           │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │       src/services/lotteryPrediction.ts          │  │
│  │  • predictForRegion() - Frequency-based          │  │
│  │  • predictWithAI() - Single AI model             │  │
│  │  • predictWithConsensus() - All AI models        │  │
│  │  • getHistoricalResults() - Data fetcher         │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │       src/services/aiPredictionService.ts        │  │
│  │  • predictWithClaude() - Anthropic API           │  │
│  │  • predictWithGPT() - OpenAI API                 │  │
│  │  • predictWithGemini() - Google API              │  │
│  │  • predictWithAll() - Run all models             │  │
│  │  • createConsensus() - Combine predictions       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         src/services/telegramBot.ts              │  │
│  │  • sendPrediction() - Send to Telegram           │  │
│  │  • formatPredictionMessage() - Vietnamese format │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 External Integrations

```
Your System                  External APIs
───────────                  ─────────────

┌──────────────┐            ┌──────────────────┐
│   Backend    │───────────→│ Anthropic Cloud  │
│              │            │ Claude Sonnet 4  │
│              │            └──────────────────┘
│              │
│              │            ┌──────────────────┐
│   AI Service │───────────→│  OpenAI Cloud    │
│              │            │    GPT-4o        │
│              │            └──────────────────┘
│              │
│              │            ┌──────────────────┐
│              │───────────→│  Google Cloud    │
│              │            │ Gemini 2.0 Flash │
└──────┬───────┘            └──────────────────┘
       │
       │                    ┌──────────────────┐
       └───────────────────→│  Telegram API    │
                            │  Bot Messages    │
                            └──────────────────┘
```

---

## 🎯 Prediction Types

```
┌─────────────────────────────────────────────────────────┐
│                LOTTERY PREDICTION TYPES                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. BẠCH THỦ LÔ (Top 5 Numbers)                        │
│     ┌────┬────┬────┬────┬────┐                        │
│     │ 12 │ 34 │ 56 │ 78 │ 90 │                        │
│     └────┴────┴────┴────┴────┘                        │
│                                                         │
│  2. LÔ 3 SỐ (10 Three-Digit Numbers)                   │
│     ┌─────┬─────┬─────┬─────┬─────┐                   │
│     │ 123 │ 456 │ 789 │ 012 │ 345 │ ...                │
│     └─────┴─────┴─────┴─────┴─────┘                   │
│                                                         │
│  3. XIÊN 2 (10 Pairs)                                  │
│     ┌────────┬────────┬────────┐                       │
│     │ 12, 34 │ 12, 56 │ 34, 56 │ ...                   │
│     └────────┴────────┴────────┘                       │
│                                                         │
│  4. XIÊN 3 (8 Triplets)                                │
│     ┌──────────────┬──────────────┐                    │
│     │ 12, 34, 56   │ 12, 34, 78   │ ...                │
│     └──────────────┴──────────────┘                    │
│                                                         │
│  5. XIÊN 4 (5 Quadruplets)                             │
│     ┌──────────────────┐                               │
│     │ 12, 34, 56, 78   │ ...                           │
│     └──────────────────┘                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Telegram Integration

```
┌───────────────────────────────────────────────┐
│         Telegram Notification Flow            │
└───────────────────────────────────────────────┘

User Request
     │
     │ ?telegram=true
     ▼
┌─────────────┐
│ Generate    │
│ Prediction  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Format      │
│ Vietnamese  │
│ Message     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Send via    │
│ Telegram    │
│ Bot API     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ User Phone  │
│ Receives    │
│ Prediction  │
└─────────────┘

Message Format:
┌─────────────────────────────────┐
│ 🎰 DỰ ĐOÁN XỔ SỐ 🔵 MIỀN BẮC   │
│ 📅 Ngày: 03/12/2025            │
│ 📊 Độ tin cậy: 85%             │
│ 🤖 AI Model: Gemini            │
│                                 │
│ 🎯 BẠCH THỦ LÔ:                │
│ 12, 34, 56, 78, 90             │
│                                 │
│ 📋 LÔ 3 SỐ:                    │
│ 123, 456, 789...               │
│                                 │
│ 🔗 XIÊN 2:                     │
│ 12-34, 12-56, 34-56...         │
│                                 │
│ 💡 Lý do: Pattern analysis...  │
└─────────────────────────────────┘
```

---

## 🚀 Quick Start Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│               30-SECOND SETUP GUIDE                     │
└─────────────────────────────────────────────────────────┘

Step 1: Get API Key (Gemini - FREE!)
┌───────────────────────────────────────┐
│  https://aistudio.google.com/apikey   │
│  ➜ Click "Create API Key"             │
│  ➜ Copy: AIza...                      │
└───────────────────────────────────────┘
           │
           ▼
Step 2: Add to .env
┌───────────────────────────────────────┐
│  cd backend                            │
│  echo 'GOOGLE_API_KEY="AIza..."' >> .env│
└───────────────────────────────────────┘
           │
           ▼
Step 3: Restart Backend
┌───────────────────────────────────────┐
│  npm run dev                           │
└───────────────────────────────────────┘
           │
           ▼
Step 4: Test!
┌───────────────────────────────────────┐
│  curl -X POST "http://localhost:3000/ │
│  lottery/ai/predict/NORTH?            │
│  provider=gemini" | python3 -m json.tool│
└───────────────────────────────────────┘
           │
           ▼
     🎉 SUCCESS!
```

---

## 📊 Decision Tree: Which Endpoint to Use?

```
Do you need a prediction?
         │
    ┌────┴────┐
    │         │
   YES       NO → Use /schedules (view draw times)
    │
    │ Do you have API keys?
    │
    ┌────┴────┐
   YES       NO → Use /predict/:region (frequency-based)
    │
    │ How many AI models?
    │
    ┌────┴────┬────────┐
    │         │        │
   ONE       ALL     COMPARE
    │         │        │
    │         │        └→ Use /compare/:region
    │         │
    │         └→ Use /ai/consensus/:region
    │
    │ Which model?
    │
    ┌────┴────┬────────┐
    │         │        │
  Claude    GPT    Gemini
    │         │        │
    └─────────┴────────┘
              │
              └→ Use /ai/predict/:region?provider=XXX
```

---

## 💰 Cost Comparison

```
┌─────────────────────────────────────────────────────────┐
│                    MONTHLY COSTS                        │
│         (3 predictions per day, 30 days/month)          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Gemini (Google)                                        │
│  ┌────────────────────────────────────────┐            │
│  │ FREE TIER: 15 req/min                  │            │
│  │ Cost: $0.00 ✅                          │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  Claude (Anthropic)                                     │
│  ┌────────────────────────────────────────┐            │
│  │ $5 free credit, then ~$0.015/day       │            │
│  │ Monthly: ~$0.45 💰                      │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  GPT-4o (OpenAI)                                        │
│  ┌────────────────────────────────────────┐            │
│  │ $5 free trial, then ~$0.009/day        │            │
│  │ Monthly: ~$0.27 💰                      │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  Consensus (All 3)                                      │
│  ┌────────────────────────────────────────┐            │
│  │ Uses Gemini (free) for final result    │            │
│  │ Monthly: ~$0.72 💰                      │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  ⭐ RECOMMENDATION: Start with Gemini (FREE!)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Learning Path

```
┌─────────────────────────────────────────────────────────┐
│              RECOMMENDED LEARNING PATH                  │
└─────────────────────────────────────────────────────────┘

Level 1: Beginner (No API Keys)
┌────────────────────────────────────┐
│ ✓ Test /predict/:region            │
│ ✓ Test /compare/:region            │
│ ✓ Understand frequency method      │
│ ✓ Read AI_QUICK_REFERENCE.md      │
└────────────────────────────────────┘
         │
         ▼
Level 2: Intermediate (1 API Key)
┌────────────────────────────────────┐
│ ✓ Get Gemini API key (free!)       │
│ ✓ Test /ai/predict with Gemini     │
│ ✓ Compare AI vs frequency          │
│ ✓ Send to Telegram (?telegram=true)│
└────────────────────────────────────┘
         │
         ▼
Level 3: Advanced (All API Keys)
┌────────────────────────────────────┐
│ ✓ Get Claude & GPT keys             │
│ ✓ Test all 3 AI models              │
│ ✓ Use /ai/consensus                 │
│ ✓ Compare accuracy over time        │
└────────────────────────────────────┘
         │
         ▼
Level 4: Expert (Production Use)
┌────────────────────────────────────┐
│ ✓ Set up automated scheduling       │
│ ✓ Integrate historical data API     │
│ ✓ Track prediction accuracy         │
│ ✓ Optimize costs                    │
│ ✓ Build custom ML models            │
└────────────────────────────────────┘
```

---

## 📚 Documentation Map

```
┌─────────────────────────────────────────────────────────┐
│                  DOCUMENTATION FILES                    │
└─────────────────────────────────────────────────────────┘

Quick Start (5 min read)
├─ AI_QUICK_REFERENCE.md ⭐ START HERE!
│  • All endpoints at a glance
│  • 30-second setup guide
│  • Common use cases

Getting Started (15 min read)
├─ AI_INTEGRATION_SUMMARY.md
│  • Step-by-step setup
│  • Example responses
│  • Troubleshooting

Complete Guide (30 min read)
├─ AI_LOTTERY_README.md
│  • How to get API keys
│  • Detailed API docs
│  • Best practices
│  • Cost analysis

System Overview
├─ COMPLETION_SUMMARY.md
│  • What was built
│  • Architecture
│  • Success metrics

Original Lottery Docs
├─ LOTTERY_README.md
│  • Lottery system basics
│  • Vietnamese lottery format
├─ LOTTERY_QUICKSTART.md
│  • Quick lottery guide
└─ TEST_RESULTS.md
   • System test results
```

---

## 🎉 You're All Set!

The AI lottery prediction system is **complete and ready to use**!

**Next Step:** Get a free Gemini API key and start making intelligent predictions! 🚀
