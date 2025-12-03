# 🎰 Quick Start - Lottery Prediction System

## Bắt đầu nhanh trong 5 phút

### 1. Khởi động Backend & Worker

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start worker  
cd worker
npm run dev
```

### 2. Test Telegram Bot

Bot đã được cấu hình sẵn với credentials trong `.env`:

```bash
# Test kết nối
curl -X POST http://localhost:3000/lottery/telegram/test
```

Bạn sẽ nhận tin nhắn test trên Telegram!

### 3. Dự đoán thủ công

```bash
# Dự đoán miền Bắc ngay và gửi Telegram
curl -X POST "http://localhost:3000/lottery/predict/NORTH?telegram=true"

# Dự đoán miền Trung
curl -X POST "http://localhost:3000/lottery/predict/CENTRAL?telegram=true"

# Dự đoán miền Nam
curl -X POST "http://localhost:3000/lottery/predict/SOUTH?telegram=true"
```

### 4. Thiết lập lịch tự động

```bash
# Install ts-node nếu chưa có
npm install -g ts-node typescript @types/node

# Setup scheduler
cd scripts
ts-node lotteryScheduler.ts
```

## ⏰ Lịch Tự Động

Sau khi setup scheduler, hệ thống sẽ tự động gửi dự đoán:

- **Miền Bắc**: 17:30 mỗi ngày (trước 45 phút kỳ quay 18:15)
- **Miền Trung**: 16:30 Thứ 4, 7, CN (trước 45 phút kỳ quay 17:15)
- **Miền Nam**: 15:30 Thứ 2,3,5,6,7 (trước 45 phút kỳ quay 16:15)

## 📱 Nhận Dự Đoán Trên Telegram

1. Mở Telegram
2. Tìm bot: `@your_bot_name` (bot đã được tạo với token trong .env)
3. Nhấn `/start`
4. Đợi nhận dự đoán tự động hoặc trigger thủ công bằng API

## 🔍 Kiểm tra Jobs

```bash
# Xem các jobs đang chạy trong Redis
redis-cli

# Trong redis-cli:
KEYS *bull*
LRANGE bull:executions:repeat 0 -1
```

## 🎯 Kết Quả Mẫu

Telegram message sẽ có dạng:

```
🎰 DỰ ĐOÁN XỔ SỐ 🔴 MIỀN BẮC
📅 Ngày: 03/12/2025
📊 Độ tin cậy: 85.2%

🎯 BẠCH THỦ LÔ:
23, 45, 67, 81, 92

📋 LÔ 3 SỐ:
123, 456, 789, 234, 567, 890, 321, 654, 987, 012

🔗 XIÊN 2:
23-45, 45-67, 67-81, 81-92, 23-67, 45-81, 67-92, 23-81, 45-92, 23-92

🔗 XIÊN 3:
23-45-67, 23-45-81, 23-45-92, 23-67-81, 23-67-92, 23-81-92, 45-67-81, 45-67-92

🔗 XIÊN 4:
23-45-67-81, 23-45-67-92, 23-45-81-92, 23-67-81-92, 45-67-81-92

⏰ Dự đoán được tạo lúc: 17:30:25
```

## ⚙️ Tùy Chỉnh

### Thay đổi thời gian dự đoán

Edit `backend/src/services/lotteryPrediction.ts`:

```typescript
export const DRAW_SCHEDULES = {
  NORTH: {
    time: '18:15',
    predictionOffset: 45, // Đổi thành 30 để dự đoán trước 30 phút
  },
}
```

### Thay đổi số lượng dự đoán

Edit các hàm trong `lotteryPrediction.ts`:

```typescript
const bachThuLo = this.predictBachThuLo(frequencies, 10); // Tăng từ 5 lên 10
```

### Kết nối nhiều chat/group

Trong `.env`, thay đổi `TELEGRAM_CHAT_ID` thành group ID hoặc dùng array trong code.

## 🚨 Troubleshooting

### Không nhận được tin trên Telegram

1. Kiểm tra Bot Token: `echo $TELEGRAM_BOT_TOKEN`
2. Kiểm tra Chat ID: `echo $TELEGRAM_CHAT_ID`
3. Test manual:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=test"
   ```

### Jobs không chạy

1. Kiểm tra Redis: `redis-cli ping`
2. Kiểm tra worker logs: xem terminal worker có lỗi gì
3. Clear và tạo lại schedule:
   ```bash
   ts-node scripts/lotteryScheduler.ts clear
   ts-node scripts/lotteryScheduler.ts
   ```

## 📊 Monitoring

```bash
# View all scheduled jobs
curl http://localhost:3000/lottery/schedules

# Manual trigger to test
curl -X POST "http://localhost:3000/lottery/predict/NORTH?telegram=true"
```

---

**Chúc may mắn!** 🍀

Xem thêm chi tiết tại [LOTTERY_README.md](./LOTTERY_README.md)
