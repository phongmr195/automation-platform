# 🤖 AI-Powered Lottery Prediction System

This system uses advanced AI models (Claude, GPT, Gemini) to analyze historical lottery data and generate intelligent predictions for Vietnam's 3 lottery regions.

## 🎯 Features

### AI Models Supported
- **Claude (Anthropic)**: Claude Sonnet 4 - Advanced reasoning and pattern analysis
- **GPT (OpenAI)**: GPT-4o - Multi-modal analysis and prediction
- **Gemini (Google)**: Gemini 2.0 Flash - Fast and efficient predictions

### Prediction Methods
1. **Frequency-based**: Traditional statistical analysis
2. **AI-powered**: Individual AI model predictions
3. **Consensus**: Combined predictions from all AI models
4. **Comparison**: Side-by-side comparison of all methods

---

## 🚀 Setup

### 1. Get API Keys

#### Claude (Anthropic)
```bash
# Visit: https://console.anthropic.com/
# Create account → Get API key
# Add to .env:
ANTHROPIC_API_KEY="sk-ant-..."
```

#### GPT (OpenAI)
```bash
# Visit: https://platform.openai.com/api-keys
# Create account → Create API key
# Add to .env:
OPENAI_API_KEY="sk-..."
```

#### Gemini (Google)
```bash
# Visit: https://aistudio.google.com/app/apikey
# Get API key (free tier available)
# Add to .env:
GOOGLE_API_KEY="AIza..."
```

### 2. Configure Environment

Edit `backend/.env`:
```env
# Required for AI predictions
ANTHROPIC_API_KEY="your-claude-key"
OPENAI_API_KEY="your-openai-key"
GOOGLE_API_KEY="your-gemini-key"

# At least one API key is required
# For best results, configure all three
```

### 3. Restart Backend
```bash
cd backend
npm run dev
```

---

## 📡 API Endpoints

### 1. Frequency-Based Prediction (Legacy)
```bash
POST /lottery/predict/:region
```

**Example:**
```bash
curl -X POST http://localhost:3000/lottery/predict/NORTH
```

---

### 2. AI-Powered Prediction (Single Model)
```bash
POST /lottery/ai/predict/:region?provider={claude|gpt|gemini}
```

**Examples:**

**Claude:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=claude"
```

**GPT:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/CENTRAL?provider=gpt"
```

**Gemini:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/SOUTH?provider=gemini"
```

**With Telegram notification:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=claude&telegram=true"
```

**Response:**
```json
{
  "region": "NORTH",
  "date": "2025-12-03T...",
  "bachThuLo": ["12", "34", "56", "78", "90"],
  "lo3So": ["123", "456", "789", ...],
  "loXien2": [["12", "34"], ["56", "78"], ...],
  "xien3": [["12", "34", "56"], ...],
  "xien4": [["12", "34", "56", "78"], ...],
  "confidence": 85,
  "aiProvider": "claude",
  "reasoning": "Based on frequency analysis and recent patterns..."
}
```

---

### 3. Consensus Prediction (All AI Models)
```bash
POST /lottery/ai/consensus/:region
```

Combines predictions from all configured AI models for maximum accuracy.

**Example:**
```bash
curl -X POST http://localhost:3000/lottery/ai/consensus/NORTH
```

**Response:**
```json
{
  "consensus": {
    "region": "NORTH",
    "bachThuLo": ["12", "34", "56", "78", "90"],
    "confidence": 82,
    "reasoning": "Consensus from 3 AI models: claude, gpt, gemini"
  },
  "individual": [
    {
      "provider": "claude",
      "confidence": 85,
      "reasoning": "Pattern analysis shows...",
      "bachThuLo": ["12", "34", "56", "78", "90"]
    },
    {
      "provider": "gpt",
      "confidence": 80,
      "reasoning": "Statistical trends indicate...",
      "bachThuLo": ["11", "33", "55", "77", "99"]
    },
    {
      "provider": "gemini",
      "confidence": 82,
      "reasoning": "Frequency distribution suggests...",
      "bachThuLo": ["10", "30", "50", "70", "90"]
    }
  ],
  "summary": {
    "totalModels": 3,
    "avgConfidence": 82
  }
}
```

---

### 4. Compare All Methods
```bash
POST /lottery/compare/:region
```

Compare frequency-based, Claude, GPT, Gemini, and consensus predictions side-by-side.

**Example:**
```bash
curl -X POST http://localhost:3000/lottery/compare/NORTH
```

**Response:**
```json
{
  "region": "NORTH",
  "date": "2025-12-03T...",
  "predictions": {
    "frequency": {
      "bachThuLo": ["30", "74", "20", "82", "52"],
      "confidence": 30
    },
    "claude": {
      "bachThuLo": ["12", "34", "56", "78", "90"],
      "confidence": 85,
      "reasoning": "..."
    },
    "gpt": {
      "bachThuLo": ["11", "33", "55", "77", "99"],
      "confidence": 80,
      "reasoning": "..."
    },
    "gemini": {
      "bachThuLo": ["10", "30", "50", "70", "90"],
      "confidence": 82,
      "reasoning": "..."
    },
    "consensus": {
      "bachThuLo": ["12", "34", "56", "78", "90"],
      "confidence": 82
    }
  }
}
```

---

## 🧪 Testing AI Integration

### Test Individual Models

**1. Test Claude:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=claude" | python3 -m json.tool
```

**2. Test GPT:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gpt" | python3 -m json.tool
```

**3. Test Gemini:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini" | python3 -m json.tool
```

### Test Consensus
```bash
curl -X POST http://localhost:3000/lottery/ai/consensus/NORTH | python3 -m json.tool
```

### Test All Methods Comparison
```bash
curl -X POST http://localhost:3000/lottery/compare/NORTH | python3 -m json.tool
```

---

## 🎓 How AI Prediction Works

### 1. Data Analysis
Each AI model analyzes:
- Historical lottery results (last 30 days)
- Number frequency patterns
- Pair and triplet combinations
- Temporal trends and cycles
- Statistical distributions

### 2. Prediction Generation
AI models use:
- **Pattern Recognition**: Identify recurring number sequences
- **Statistical Analysis**: Calculate probabilities based on history
- **Trend Analysis**: Recent vs long-term patterns
- **Combination Logic**: Find commonly paired numbers

### 3. Consensus Algorithm
When using consensus mode:
1. Run predictions from all available AI models
2. Count frequency of predicted numbers across models
3. Rank numbers by agreement level
4. Generate final prediction from top-ranked numbers
5. Calculate average confidence score

---

## 💡 Best Practices

### For Maximum Accuracy
1. **Use Consensus Mode**: Combines insights from all AI models
2. **Compare Results**: Check `/compare` endpoint to see different perspectives
3. **Monitor Confidence**: Higher confidence scores indicate stronger patterns
4. **Update Historical Data**: More data = better predictions

### API Key Management
1. **Never commit API keys**: Keep them in `.env` file
2. **Use environment variables**: Don't hardcode keys
3. **Rotate keys regularly**: For security
4. **Monitor usage**: Track API costs

### Cost Optimization
- **Claude**: ~$3 per million tokens (input), $15 per million (output)
- **GPT-4o**: ~$2.50 per million tokens (input), $10 per million (output)
- **Gemini**: Free tier available, then ~$0.35 per million tokens

**Tip:** Start with Gemini (free tier) for testing!

---

## 🔧 Troubleshooting

### Error: "Claude API key not configured"
**Solution:** Add `ANTHROPIC_API_KEY` to `.env` file

### Error: "OpenAI API key not configured"
**Solution:** Add `OPENAI_API_KEY` to `.env` file

### Error: "Google API key not configured"
**Solution:** Add `GOOGLE_API_KEY` to `.env` file

### Error: "AI prediction failed"
**Possible causes:**
1. Invalid API key
2. API quota exceeded
3. Network connectivity issues
4. API service downtime

**Check:**
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY

# Check backend logs for detailed error messages
```

---

## 📊 Response Structure

### AI Prediction Response
```typescript
{
  region: "NORTH" | "CENTRAL" | "SOUTH",
  date: Date,
  bachThuLo: string[],      // 5 numbers
  lo3So: string[],          // 10 numbers
  loXien2: string[][],      // 10 pairs
  xien3: string[][],        // 8 triplets
  xien4: string[][],        // 5 quadruplets
  confidence: number,       // 0-100
  aiProvider: "claude" | "gpt" | "gemini",
  reasoning: string         // AI's explanation
}
```

---

## 🎯 Next Steps

1. **Get API Keys**: Sign up for Claude, GPT, or Gemini
2. **Configure .env**: Add at least one API key
3. **Test Predictions**: Try each AI model
4. **Compare Results**: Use `/compare` endpoint
5. **Enable Telegram**: Add `&telegram=true` to send predictions
6. **Automate**: Set up scheduled predictions with consensus mode

---

## 📚 Additional Resources

- [Claude API Documentation](https://docs.anthropic.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google AI Studio](https://ai.google.dev/)
- [Lottery System README](./LOTTERY_README.md)
- [Quick Start Guide](./LOTTERY_QUICKSTART.md)

---

## ⚠️ Disclaimer

Lottery predictions are for entertainment purposes only. AI models analyze patterns but cannot guarantee results. Please gamble responsibly.
