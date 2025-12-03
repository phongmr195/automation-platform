# 🎰 Hệ Thống Dự Đoán Xổ Số 3 Miền

Hệ thống tự động dự đoán kết quả xổ số cho 3 miền Bắc, Trung, Nam và gửi thông báo qua Telegram.

## ✨ Tính Năng

- **Dự đoán xổ số 3 miền**: Bắc, Trung, Nam
- **Các loại dự đoán**:
  - 🎯 Bạch thủ lô (5 số)
  - 📋 Lô 3 số (10 số)
  - 🔗 Xiên 2 (10 cặp)
  - 🔗 Xiên 3 (8 bộ)
  - 🔗 Xiên 4 (5 bộ)
- **Tự động gửi Telegram**: Dự đoán được gửi trước 45 phút mỗi kỳ quay
- **Lịch quay thưởng**:
  - Miền Bắc: Hàng ngày lúc 18:15
  - Miền Trung: Thứ 4, Thứ 7, Chủ nhật lúc 17:15
  - Miền Nam: Thứ 2, 3, 5, 6, 7 lúc 16:15

## 📋 Yêu Cầu

- Node.js 18+
- Docker (cho PostgreSQL và Redis)
- Telegram Bot Token và Chat ID

## 🚀 Cài Đặt

### 1. Cài đặt dependencies

```bash
# Backend
cd backend
npm install

# Worker
cd ../worker
npm install
```

### 2. Cấu hình Telegram Bot

#### Tạo Bot:
1. Mở Telegram và tìm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (VD: "Xổ Số Prediction Bot")
4. Lưu lại **Bot Token** (dạng: `123456:ABC-DEF...`)

#### Lấy Chat ID:
1. Tìm bot vừa tạo và gửi tin nhắn `/start`
2. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Tìm `"chat":{"id":...}` và lưu lại **Chat ID**

### 3. Cấu hình môi trường

Cập nhật file `backend/.env`:

```env
DATABASE_URL="postgresql://prisma:prisma@localhost:5433/automation?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3000

# Telegram Configuration
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID_HERE"
```

### 4. Khởi động dịch vụ

```bash
# Start PostgreSQL & Redis
docker-compose up -d

# Apply migrations
cd backend
npx prisma migrate deploy
npx prisma generate

# Start backend
npm run dev

# In another terminal - start worker
cd worker
npm run dev
```

## 📊 Sử Dụng

### Test kết nối Telegram

```bash
curl -X POST http://localhost:3000/lottery/telegram/test
```

### Dự đoán thủ công

```bash
# Dự đoán miền Bắc và gửi Telegram
curl -X POST "http://localhost:3000/lottery/predict/NORTH?telegram=true"

# Dự đoán miền Trung
curl -X POST "http://localhost:3000/lottery/predict/CENTRAL?telegram=true"

# Dự đoán miền Nam
curl -X POST "http://localhost:3000/lottery/predict/SOUTH?telegram=true"
```

### Thiết lập lịch tự động

```bash
# Cài đặt ts-node globally nếu chưa có
npm install -g ts-node typescript

# Setup automatic schedules
cd scripts
ts-node lotteryScheduler.ts

# Clear schedules
ts-node lotteryScheduler.ts clear
```

### Xem lịch quay thưởng

```bash
curl http://localhost:3000/lottery/schedules
```

## 🔧 API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/lottery/predict/:region` | POST | Dự đoán theo miền (NORTH/CENTRAL/SOUTH) |
| `/lottery/predict/:region?telegram=true` | POST | Dự đoán và gửi Telegram |
| `/lottery/telegram/test` | POST | Test kết nối Telegram |
| `/lottery/schedules` | GET | Xem lịch quay thưởng |
| `/lottery/schedule/enable` | POST | Cấu hình scheduler |

## 📱 Format Telegram Message

Tin nhắn dự đoán trên Telegram sẽ có dạng:

```
🎰 DỰ ĐOÁN XỔ SỐ 🔴 MIỀN BẮC
📅 Ngày: 03/12/2025
📊 Độ tin cậy: 75.5%

🎯 BẠCH THỦ LÔ:
12, 34, 56, 78, 90

📋 LÔ 3 SỐ:
123, 456, 789, ...

🔗 XIÊN 2:
12-34, 56-78, ...

🔗 XIÊN 3:
12-34-56, ...

🔗 XIÊN 4:
12-34-56-78, ...

⏰ Dự đoán được tạo lúc: 17:30:00
```

## 🎯 Thuật Toán Dự Đoán

Hiện tại hệ thống sử dụng thuật toán frequency-based prediction:

1. **Thu thập dữ liệu lịch sử** 30 ngày gần nhất
2. **Phân tích tần suất** xuất hiện của các số
3. **Kết hợp**:
   - 70% dựa trên tần suất cao
   - 30% random để tăng đa dạng
4. **Tính độ tin cậy** dựa trên lượng dữ liệu

### Nâng cấp trong tương lai:
- Machine Learning models (LSTM, Random Forest)
- Pattern recognition
- Statistical analysis
- Historical result verification

## 📝 Lưu Ý

- ⚠️ **Chỉ dùng để tham khảo**: Dự đoán không đảm bảo 100% chính xác
- 🔒 **Bảo mật**: Không chia sẻ Bot Token
- 💾 **Dữ liệu**: Cần tích hợp API lấy kết quả xổ số thực tế để cải thiện độ chính xác
- ⏰ **Múi giờ**: Đảm bảo server đúng múi giờ Việt Nam (GMT+7)

## 🛠️ Troubleshooting

### Telegram không nhận tin

```bash
# Kiểm tra Bot Token
echo $TELEGRAM_BOT_TOKEN

# Test manual
curl "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=test"
```

### Worker không chạy job

```bash
# Check Redis connection
redis-cli ping

# View BullMQ queue
npm install -g bull-repl
bull-repl
```

### Thay đổi lịch dự đoán

Chỉnh sửa file `backend/src/services/lotteryPrediction.ts`:

```typescript
export const DRAW_SCHEDULES = {
  NORTH: {
    time: '18:15',
    predictionOffset: 45, // Thay đổi số phút ở đây
  },
  // ...
};
```

## 📚 Tài Liệu Thêm

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🤝 Đóng Góp

Mọi đóng góp để cải thiện thuật toán dự đoán đều được hoan nghênh!

---

**Chúc may mắn!** 🍀
