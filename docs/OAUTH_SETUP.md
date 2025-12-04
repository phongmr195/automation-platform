# OAuth Configuration Guide

Hướng dẫn cấu hình OAuth cho môi trường local development.

## 1. Generate JWT Secret

Chạy command sau để tạo JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy secret này và thêm vào file `.env`:

```env
JWT_ACCESS_SECRET="your-generated-secret-here"
JWT_REFRESH_SECRET="your-generated-secret-here"
```

## 2. Configure Google OAuth

### Bước 1: Tạo Project trên Google Cloud Console
1. Truy cập https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** → **Credentials**

### Bước 2: Tạo OAuth 2.0 Client ID
1. Click **Create Credentials** → **OAuth 2.0 Client ID**
2. Chọn Application type: **Web application**
3. Name: `Automation Platform Local`
4. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://localhost:5173`
5. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/oauth/google/callback`
6. Click **Create**
7. Copy **Client ID** và **Client secret**

### Bước 3: Thêm vào .env
```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/oauth/google/callback"
```

## 3. Configure GitHub OAuth

### Bước 1: Tạo OAuth App
1. Truy cập https://github.com/settings/developers
2. Click **New OAuth App**
3. Điền thông tin:
   - **Application name**: `Automation Platform Local`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/oauth/github/callback`
4. Click **Register application**
5. Click **Generate a new client secret**
6. Copy **Client ID** và **Client secret**

### Bước 2: Thêm vào .env
```env
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/oauth/github/callback"
```

## 4. Configure LinkedIn OAuth

### Bước 1: Tạo App trên LinkedIn
1. Truy cập https://www.linkedin.com/developers/
2. Click **Create app**
3. Điền thông tin:
   - **App name**: `Automation Platform Local`
   - **LinkedIn Page**: Chọn page của bạn (hoặc tạo mới)
   - **App logo**: Upload logo (tùy chọn)
4. Click **Create app**

### Bước 2: Cấu hình OAuth settings
1. Vào tab **Auth**
2. Trong **OAuth 2.0 settings**:
   - **Redirect URLs**: `http://localhost:3000/auth/oauth/linkedin/callback`
3. Trong **Products** tab:
   - Request access to **Sign In with LinkedIn**
4. Copy **Client ID** và **Client Secret** từ tab **Auth**

### Bước 3: Thêm vào .env
```env
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_CALLBACK_URL="http://localhost:3000/auth/oauth/linkedin/callback"
```

## 5. Final .env Configuration

File `.env` hoàn chỉnh của bạn sẽ trông như sau:

```env
# Database
DATABASE_URL="postgresql://prisma:prisma@localhost:5433/automation?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000

# Frontend & Backend URLs
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"

# JWT Secrets
JWT_ACCESS_SECRET="your-generated-access-secret"
JWT_REFRESH_SECRET="your-generated-refresh-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/oauth/google/callback"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/oauth/github/callback"

# LinkedIn OAuth
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_CALLBACK_URL="http://localhost:3000/auth/oauth/linkedin/callback"

# Other services...
CREDENTIAL_ENCRYPTION_KEY="your-encryption-key"
```

## 6. Testing OAuth

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Truy cập `http://localhost:5173/login`
4. Click vào một trong 3 nút OAuth (Google, GitHub, LinkedIn)
5. Đăng nhập với tài khoản của bạn
6. Sau khi thành công, bạn sẽ được redirect về trang chủ với đầy đủ authentication

## 7. Troubleshooting

### Lỗi "redirect_uri_mismatch"
- Kiểm tra lại redirect URI trong OAuth app settings
- Đảm bảo URL khớp chính xác (bao gồm cả http/https, port, path)

### Lỗi "invalid_client"
- Client ID hoặc Client Secret không đúng
- Kiểm tra lại credentials trong .env

### Lỗi "Email not found"
- Đảm bảo bạn đã request scope email trong OAuth settings
- Với GitHub: đảm bảo email của bạn là public hoặc app có quyền truy cập

### Không redirect về frontend
- Kiểm tra FRONTEND_URL trong .env
- Kiểm tra CORS settings trong backend

## 8. Security Notes

⚠️ **QUAN TRỌNG**:
- **KHÔNG** commit file `.env` vào git
- **KHÔNG** share Client Secret publicly
- Trong production, sử dụng HTTPS cho tất cả callbacks
- Trong production, thay đổi JWT secrets thành secrets mạnh và random
- Chỉ add trusted redirect URIs vào OAuth apps
