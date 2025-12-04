# OAuth Quick Start

## Để test OAuth ở local, làm theo 3 bước sau:

### 1. Thêm JWT Secret vào `.env`

```bash
cd backend
cp .env.example .env
```

Thêm vào file `.env`:
```env
JWT_ACCESS_SECRET="6deabc6acf14f6cd5527ae29cc96065f3c399548f7908afe3988807bcf18063d"
JWT_REFRESH_SECRET="334c57797ed88fcc24f6a66a541d20bf7ca3e07fdbe9907d585b2b29e57d4d53"

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
```

### 2. Đăng ký OAuth Apps (chọn 1 hoặc nhiều providers):

#### Google (Nhanh nhất - khuyến nghị):
1. Vào https://console.cloud.google.com/apis/credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Authorized redirect URIs: `http://localhost:3000/auth/oauth/google/callback`
4. Copy Client ID & Secret vào `.env`:
```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/oauth/google/callback"
```

#### GitHub:
1. Vào https://github.com/settings/developers
2. New OAuth App
3. Authorization callback URL: `http://localhost:3000/auth/oauth/github/callback`
4. Copy Client ID & Secret vào `.env`:
```env
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/oauth/github/callback"
```

#### LinkedIn:
1. Vào https://www.linkedin.com/developers/apps
2. Create app
3. Redirect URLs: `http://localhost:3000/auth/oauth/linkedin/callback`
4. Request "Sign In with LinkedIn" product
5. Copy Client ID & Secret vào `.env`:
```env
LINKEDIN_CLIENT_ID="your-client-id"
LINKEDIN_CLIENT_SECRET="your-client-secret"
LINKEDIN_CALLBACK_URL="http://localhost:3000/auth/oauth/linkedin/callback"
```

### 3. Restart Backend

```bash
# Trong terminal backend
# Ctrl+C để stop server
npm run dev
```

### 4. Test OAuth

1. Mở http://localhost:5173/login
2. Click vào nút "Continue with Google/GitHub/LinkedIn"
3. Đăng nhập với tài khoản của bạn
4. Sau khi thành công, bạn sẽ được redirect về trang chủ

## Chi tiết đầy đủ

Xem hướng dẫn chi tiết tại: [docs/OAUTH_SETUP.md](./OAUTH_SETUP.md)

## Lưu ý

- Chỉ cần config 1 provider (Google/GitHub/LinkedIn) là có thể test
- Khuyến nghị dùng Google vì setup nhanh nhất
- Credentials chỉ hoạt động trên `localhost:3000` và `localhost:5173`
- KHÔNG commit file `.env` vào git
