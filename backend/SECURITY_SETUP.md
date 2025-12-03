# 🔒 Security Setup Guide

## ⚠️ IMPORTANT: API Key Security

Your API keys have been moved to `.env.local` file and removed from `.env` to protect your sensitive information.

## 📁 File Structure

- **`.env`** - Template file with placeholder values (safe to commit)
- **`.env.local`** - Your actual API keys (NEVER commit this file)
- **`.env.example`** - Example template for other developers

## 🔐 Current API Keys Status

Your actual keys are now stored in `.env.local`:
- ✅ TELEGRAM_BOT_TOKEN: Moved to .env.local
- ✅ TELEGRAM_CHAT_ID: Moved to .env.local
- ✅ OPENAI_API_KEY: Moved to .env.local
- ✅ GOOGLE_API_KEY: Moved to .env.local
- ✅ GROQ_API_KEY: Moved to .env.local

## 🚀 How to Use

### Development Setup

1. Copy your API keys from `.env.local` to `.env`:
```bash
cd backend
cp .env.local .env
```

2. Or manually add your keys to `.env`:
```bash
# Edit .env and add your actual keys
nano .env
```

### Environment Loading Priority

The app loads environment variables in this order:
1. `.env.local` (highest priority - your actual keys)
2. `.env` (template/defaults)
3. System environment variables

### Update index.ts to load .env.local

Update `backend/src/index.ts` to load `.env.local` first:
```typescript
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' }); // Load local keys first
dotenv.config(); // Fallback to .env template
```

## ⚠️ Security Checklist

- [x] `.env` is in `.gitignore`
- [x] `.env.local` is in `.gitignore`
- [x] API keys removed from `.env`
- [x] Actual keys stored in `.env.local`
- [ ] Verify `.env.local` is NOT committed: `git status`
- [ ] Update `index.ts` to load `.env.local`

## 🔄 Next Steps

1. **Restart backend** to use new configuration:
```bash
cd backend
npm run dev
```

2. **Test API keys** are working:
```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=groq"
```

3. **Verify security**:
```bash
# Make sure .env.local is ignored by git
git status | grep .env.local
# Should return nothing (file is ignored)
```

## 🔑 Rotate Compromised Keys

If your keys were committed to git, you MUST rotate them:

### Telegram Bot
1. Message @BotFather
2. Use `/revoke` command
3. Create new bot with `/newbot`
4. Update TELEGRAM_BOT_TOKEN in `.env.local`

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Delete old key
3. Create new key
4. Update OPENAI_API_KEY in `.env.local`

### Google (Gemini)
1. Go to https://aistudio.google.com/app/apikey
2. Delete compromised key
3. Create new key
4. Update GOOGLE_API_KEY in `.env.local`

### Groq
1. Go to https://console.groq.com/
2. Delete old key
3. Create new key
4. Update GROQ_API_KEY in `.env.local`

## 📝 Best Practices

1. **Never commit `.env.local`** - Contains your actual keys
2. **Keep `.env` as template** - Safe placeholder values
3. **Use environment variables** - For production (Vercel, AWS, etc.)
4. **Rotate keys regularly** - Change keys every 90 days
5. **Use different keys** - Separate keys for dev/staging/production
6. **Monitor usage** - Check API usage dashboards regularly

## 🚨 If Keys Were Exposed

If you accidentally committed API keys to git:

1. **Immediately rotate all keys** (see above)
2. **Remove from git history**:
```bash
# Install BFG Repo-Cleaner
brew install bfg

# Remove sensitive data
bfg --replace-text passwords.txt

# Force push (WARNING: Destructive)
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

3. **Notify team members** to pull latest changes

## ✅ Verification

Run this command to verify security:
```bash
# Check that .env has no real keys
grep -E "sk-|AIza|gsk_|AAH-" backend/.env

# Should return nothing or show placeholder text
```

## 📞 Support

If you need help with security setup:
1. Check this guide first
2. Review `.env.example` for proper format
3. Ensure `.gitignore` includes `.env.local`
