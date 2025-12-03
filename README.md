# 🚀 Automation Platform

Nền tảng tự động hóa với AI dự đoán xổ số và thông báo kết quả bóng đá.

## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Cài Đặt Nhanh](#-cài-đặt-nhanh)
- [Cấu Hình](#️-cấu-hình)
- [API Endpoints](#-api-endpoints)
- [Test & Sử Dụng](#-test--sử-dụng)
- [Workflow Tự Động](#-workflow-tự-động)

---

## ✨ Tính Năng

### 🎰 Dự Đoán Xổ Số 3 Miền
- **AI-Powered**: Sử dụng Claude, GPT, Gemini, Groq
- **Dự đoán đầy đủ**: Lô đặc biệt, Bạch thủ lô, Lô 3 số, Xiên 2/3/4
- **Tự động hóa**: Gửi Telegram trước 45 phút mỗi kỳ quay
- **3 Miền**: Bắc (daily), Trung (T4, T7, CN), Nam (T2-T6)

### ⚽ Thông Báo Bóng Đá
- **6 Giải đấu**: Champions League, Premier League, La Liga, Bundesliga, Serie A, Ligue 1
- **Tự động hàng ngày**: Kết quả hôm qua gửi lúc 7:00 AM
- **Free API**: Sử dụng football-data.org (10 req/min)
- **Telegram**: Format đẹp với emoji và múi giờ Việt Nam

---

## 🔧 Cài Đặt Nhanh

### 1. Clone & Install

```bash
git clone <repository-url>
cd automation-platform

# Install backend
cd backend
npm install

# Install worker (optional - cho automation)
cd ../worker
npm install
```

### 2. Setup Database

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Setup Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

---

## ⚙️ Cấu Hình

### Backend Environment (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5433/automation_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id-or-group-id"

# AI Providers (ít nhất 1)
ANTHROPIC_API_KEY="your-claude-key"
OPENAI_API_KEY="your-openai-key"
GOOGLE_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"

# Football API
FOOTBALL_API_KEY="your-football-data-org-key"
```

### Lấy Telegram Credentials

**Bot Token:**
1. Chat với [@BotFather](https://t.me/botfather)
2. `/newbot` → đặt tên bot
3. Copy token

**Chat ID (Personal):**
1. Chat với bot của bạn
2. Gửi `/start`
3. Truy cập: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Tìm `"chat":{"id":123456789}`

**Group Chat ID:**
1. Thêm bot vào group
2. Gửi message trong group
3. Truy cập: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Tìm `"chat":{"id":-1001234567890}` (số âm)

### Lấy Football API Key (FREE)

1. Đăng ký tại: https://www.football-data.org/client/register
2. Nhập email → nhận API key ngay
3. **Miễn phí**: 10 requests/minute, không cần thẻ tín dụng

---

## 🚀 Khởi Động

### Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Worker (optional)
cd worker
npm run dev

# Terminal 3: Test
curl http://localhost:3000/
```

### Production

```bash
# Backend
cd backend
npm run build
npm start

# Worker
cd worker
npm run build
npm start
```

---

## 📡 API Endpoints

### 🎰 Lottery (Xổ Số)

#### 1. Dự đoán với AI (Groq - Recommended)

```bash
# Miền Bắc
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=groq"

# Miền Trung
curl -X POST "http://localhost:3000/lottery/ai/predict/CENTRAL?provider=groq"

# Miền Nam
curl -X POST "http://localhost:3000/lottery/ai/predict/SOUTH?provider=groq"

# Gửi kèm Telegram
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=groq&telegram=true"
```

**Response:**
```json
{
  "region": "NORTH",
  "date": "2025-12-03T...",
  "loDacBiet": ["87"],
  "bachThuLo": ["27"],
  "lo3So": ["937", "658"],
  "loXien2": [["07", "53"], ["27", "85"], ...],
  "xien3": [["07", "37", "97"], ...],
  "xien4": [["07", "27", "47", "67"]],
  "confidence": 80,
  "reasoning": "..."
}
```

#### 2. Dự đoán Consensus (Tất cả AI models)

```bash
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH/consensus"
```

#### 3. So sánh tất cả AI models

```bash
curl "http://localhost:3000/lottery/ai/predict/NORTH/compare"
```

#### 4. Test Telegram

```bash
curl -X POST "http://localhost:3000/lottery/telegram/test"
```

#### 5. Xem lịch quay thưởng

```bash
curl "http://localhost:3000/lottery/schedules"
```

---

### ⚽ Football (Bóng Đá)

#### 1. Lấy kết quả hôm qua

```bash
curl "http://localhost:3000/football/results/yesterday"
```

**Response:**
```json
[
  {
    "league": "Premier League",
    "leagueFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "matches": [
      {
        "id": 537915,
        "date": "2025-12-02",
        "time": "02:30",
        "homeTeam": "AFC Bournemouth",
        "awayTeam": "Everton FC",
        "homeScore": 0,
        "awayScore": 1,
        "status": "FINISHED",
        "league": "Premier League"
      }
    ]
  }
]
```

#### 2. Gửi kết quả vào Telegram

```bash
curl -X POST "http://localhost:3000/football/notify"
```

#### 3. Danh sách giải đấu

```bash
curl "http://localhost:3000/football/leagues"
```

**Response:**
```json
[
  {"id": 2, "name": "UEFA Champions League", "flag": "🏆"},
  {"id": 39, "name": "Premier League", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {"id": 140, "name": "La Liga", "flag": "🇪🇸"},
  {"id": 78, "name": "Bundesliga", "flag": "🇩🇪"},
  {"id": 135, "name": "Serie A", "flag": "🇮🇹"},
  {"id": 61, "name": "Ligue 1", "flag": "🇫🇷"}
]
```

---

## 🧪 Test & Sử Dụng

### Test Xổ Số

```bash
# 1. Test dự đoán AI (nhanh nhất - Groq)
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=groq" | jq '.'

# 2. Test gửi Telegram
curl -X POST "http://localhost:3000/lottery/ai/predict/NORTH?provider=groq&telegram=true"

# 3. Kiểm tra Telegram group/chat
# Message sẽ có format:
# 🎰 DỰ ĐOÁN XỔ SỐ 🔴 MIỀN BẮC
# 📅 Ngày: 03/12/2025
# 📊 Độ tin cậy: 80%
# 🎁 LÔ ĐẶC BIỆT: 87
# 🎯 BẠCH THỦ LÔ: 27
# ...
```

### Test Bóng Đá

```bash
# 1. Test lấy kết quả
curl "http://localhost:3000/football/results/yesterday" | jq '.'

# 2. Test gửi Telegram
curl -X POST "http://localhost:3000/football/notify"

# 3. Kiểm tra Telegram
# Message format:
# ⚽ KẾT QUẢ BÓNG ĐÁ
# Tuesday, December 3, 2025
# 🏴󠁧󠁢󠁥󠁮󠁧󠁿 PREMIER LEAGUE
# ────────────────────────────────────────
# 02:30 ✅
# Bournemouth 0 - 1 Everton
```

---

## ⏰ Workflow Tự Động

### Setup Lottery Scheduler

```bash
cd scripts
ts-node lotteryScheduler.ts
```

**Lịch tự động:**
- **Miền Bắc**: 17:30 mỗi ngày (trước 45 phút kỳ quay 18:15)
- **Miền Trung**: 16:30 T4, T7, CN (trước 45 phút kỳ quay 17:15)
- **Miền Nam**: 15:30 T2-T6 (trước 45 phút kỳ quay 16:15)

### Setup Football Workflow

```bash
# 1. Di chuyển workflow vào thư mục workflows
mv football-workflow.json workflows/

# 2. Tạo workflow qua API
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d @workflows/football-workflow.json

# 3. Workflow sẽ chạy tự động lúc 7:00 AM mỗi ngày
```

**Hoặc dùng script:**

```bash
chmod +x setup-football-workflow.sh
./setup-football-workflow.sh
```

---

## 📊 Message Format

### Telegram - Xổ Số

```
🎰 DỰ ĐOÁN XỔ SỐ 🔴 MIỀN BẮC
📅 Ngày: 03/12/2025
📊 Độ tin cậy: 80.0%

🎁 LÔ ĐẶC BIỆT (2 số cuối giải ĐB):
87

🎯 BẠCH THỦ LÔ:
27

📋 LÔ 3 SỐ:
937, 658

🔗 XIÊN 2:
07-53, 27-85, 37-97, 47-13, 57-25, 67-39

🔗 XIÊN 3:
07-37-97, 27-57-87, 47-67-07

🔗 XIÊN 4:
07-27-47-67

⏰ Dự đoán được tạo lúc: 14:30:18
```

### Telegram - Bóng Đá

```
⚽ KẾT QUẢ BÓNG ĐÁ
Tuesday, December 3, 2025

🏴󠁧󠁢󠁥󠁮󠁧󠁿 PREMIER LEAGUE
────────────────────────────────────────
02:30 ✅
AFC Bournemouth 0 - 1 Everton FC

02:30 ✅
Fulham FC 4 - 5 Manchester City FC

03:15 🤝
Newcastle United FC 2 - 2 Tottenham Hotspur FC


🇪🇸 LA LIGA
────────────────────────────────────────
03:00 ✅
FC Barcelona 3 - 1 Club Atlético de Madrid


━━━━━━━━━━━━━━━━━━━━━━
📊 Tổng số trận: 4
```

---

## 🔍 Troubleshooting

### Backend không khởi động

```bash
# Kiểm tra port 3000
lsof -ti:3000 | xargs kill -9

# Xem logs
tail -f /tmp/backend.log

# Kiểm tra database
psql -U postgres -d automation_db -c "\dt"
```

### Telegram không nhận tin

```bash
# Test bot token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Test gửi message
curl "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=test"

# Kiểm tra .env
grep TELEGRAM backend/.env
```

### Football API lỗi

```bash
# Test API key
curl "https://api.football-data.org/v4/competitions" \
  -H "X-Auth-Token: YOUR_KEY"

# Kiểm tra rate limit (10 req/min)
# Đợi 1 phút nếu bị 429 Too Many Requests
```

### Redis không kết nối

```bash
# Kiểm tra Redis
redis-cli ping
# Response: PONG

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

---

## 📚 Tài Liệu Chi Tiết

- [LOTTERY_README.md](./LOTTERY_README.md) - Hướng dẫn chi tiết xổ số
- [AI_LOTTERY_README.md](./AI_LOTTERY_README.md) - AI prediction system
- [FOOTBALL_README.md](./FOOTBALL_README.md) - Hướng dẫn chi tiết bóng đá
- [FOOTBALL_FREE_APIS.md](./FOOTBALL_FREE_APIS.md) - So sánh Football APIs

---

## 🎯 Quick Reference

### AI Providers

| Provider | Speed | Quality | Free Tier | Recommended |
|----------|-------|---------|-----------|-------------|
| **Groq** | ⚡⚡⚡ Fastest | ⭐⭐⭐ Good | ✅ Yes | ✅ **Best** |
| Claude | ⚡⚡ Fast | ⭐⭐⭐⭐ Excellent | ✅ Limited | ⭐ Premium |
| GPT-4 | ⚡ Slow | ⭐⭐⭐⭐⭐ Best | ❌ Paid | 💰 Premium |
| Gemini | ⚡⚡ Fast | ⭐⭐⭐ Good | ✅ Yes | ✅ Good |

### Football API

| Feature | football-data.org | API-FOOTBALL |
|---------|-------------------|--------------|
| Free Tier | 10 req/min | 100 req/day |
| Credit Card | ❌ No | ✅ Required |
| Leagues | 6/7 major | 450+ |
| **Recommended** | ✅ **Yes** | For advanced users |

### Default Schedules

**Lottery:**
- Bắc: Daily 17:30
- Trung: Wed/Sat/Sun 16:30  
- Nam: Mon-Sat 15:30

**Football:**
- Daily 07:00 AM

---

## 💡 Tips

- Dùng **Groq** cho lottery predictions (nhanh + miễn phí)
- **football-data.org** cho football (free, không cần thẻ)
- Restart backend sau khi đổi .env: `lsof -ti:3000 | xargs kill -9 && npm run dev`
- Group chat ID bắt đầu bằng số âm (ví dụ: -1001234567890)
- Test Telegram trước khi setup scheduler
- Kiểm tra logs tại `/tmp/backend.log`

---

**🎉 Chúc may mắn!**
