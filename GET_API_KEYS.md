# 🔑 Get Your Free API Keys (2 minutes)

## Option 1: Gemini (100% FREE - Recommended!) ⭐

**Best choice for testing - no credit card required!**

### Steps:
1. Open: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Select "Create API key in new project"
5. Copy the key (starts with `AIza...`)

**Paste this into your terminal:**
```bash
cd /Users/phongvu/Documents/Work/automation-platform/backend
echo 'GOOGLE_API_KEY="AIza_YOUR_KEY_HERE"' >> .env
```

---

## Option 2: GPT-4o (OpenAI - $5 Free Credit)

**Requires credit card but you get $5 free credit**

### Steps:
1. Open: https://platform.openai.com/signup
2. Sign up / Sign in
3. Add payment method (required, but you won't be charged if under $5)
4. Go to: https://platform.openai.com/api-keys
5. Click "Create new secret key"
6. Copy the key (starts with `sk-proj-...` or `sk-...`)

**Paste this into your terminal:**
```bash
cd /Users/phongvu/Documents/Work/automation-platform/backend
echo 'OPENAI_API_KEY="sk-YOUR_KEY_HERE"' >> .env
```

---

## Quick Test Commands

**After adding your API key, restart backend:**
```bash
# Stop current backend (in the terminal where it's running, press Ctrl+C)
# Or kill it:
lsof -ti :3000 | xargs kill -9

# Start again:
cd /Users/phongvu/Documents/Work/automation-platform/backend
npm run dev
```

**Test Gemini:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gemini" | python3 -m json.tool
```

**Test GPT:**
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=gpt" | python3 -m json.tool
```

**Test both and compare:**
```bash
curl -X POST "http://localhost:3000/lottery/compare/NORTH" | python3 -m json.tool
```

---

## 🎁 My Recommendation

**Start with Gemini!**
- ✅ 100% free forever
- ✅ No credit card needed
- ✅ 15 requests per minute
- ✅ Takes 30 seconds to setup

**Then add GPT if you want:**
- Slightly better reasoning
- Requires payment method
- $5 free credit lasts a long time
