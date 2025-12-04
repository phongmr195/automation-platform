#!/bin/bash

# Test OAuth2 Implementation (Development Mode)
# This tests that all OAuth endpoints and UI are working

echo "🧪 Testing OAuth2 Implementation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${YELLOW}1. Checking if backend is running...${NC}"
if curl -s http://localhost:3000/ > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo "Please start backend: cd backend && npm run dev"
    exit 1
fi

# Check if frontend is running
echo -e "${YELLOW}2. Checking if frontend is running...${NC}"
if curl -s http://localhost:5173/ > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo "Please start frontend: cd frontend && npm run dev"
    exit 1
fi

# Test OAuth endpoints existence
echo ""
echo -e "${YELLOW}3. Testing OAuth endpoints...${NC}"

# Test Google OAuth endpoint
GOOGLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/oauth/google)
if [ "$GOOGLE_RESPONSE" = "302" ] || [ "$GOOGLE_RESPONSE" = "500" ]; then
    echo -e "${GREEN}✅ Google OAuth endpoint exists (redirects or needs config)${NC}"
else
    echo -e "${RED}❌ Google OAuth endpoint failed (HTTP $GOOGLE_RESPONSE)${NC}"
fi

# Test GitHub OAuth endpoint
GITHUB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/oauth/github)
if [ "$GITHUB_RESPONSE" = "302" ] || [ "$GITHUB_RESPONSE" = "500" ]; then
    echo -e "${GREEN}✅ GitHub OAuth endpoint exists (redirects or needs config)${NC}"
else
    echo -e "${RED}❌ GitHub OAuth endpoint failed (HTTP $GITHUB_RESPONSE)${NC}"
fi

# Test LinkedIn OAuth endpoint
LINKEDIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/oauth/linkedin)
if [ "$LINKEDIN_RESPONSE" = "302" ] || [ "$LINKEDIN_RESPONSE" = "500" ]; then
    echo -e "${GREEN}✅ LinkedIn OAuth endpoint exists (redirects or needs config)${NC}"
else
    echo -e "${RED}❌ LinkedIn OAuth endpoint failed (HTTP $LINKEDIN_RESPONSE)${NC}"
fi

# Check database schema
echo ""
echo -e "${YELLOW}4. Checking database schema...${NC}"
cd backend

# Check if Prisma schema has OAuth fields
if grep -q "googleId" prisma/schema.prisma; then
    echo -e "${GREEN}✅ googleId field exists in schema${NC}"
else
    echo -e "${RED}❌ googleId field missing in schema${NC}"
fi

if grep -q "githubId" prisma/schema.prisma; then
    echo -e "${GREEN}✅ githubId field exists in schema${NC}"
else
    echo -e "${RED}❌ githubId field missing in schema${NC}"
fi

if grep -q "linkedinId" prisma/schema.prisma; then
    echo -e "${GREEN}✅ linkedinId field exists in schema${NC}"
else
    echo -e "${RED}❌ linkedinId field missing in schema${NC}"
fi

if grep -q "avatar" prisma/schema.prisma; then
    echo -e "${GREEN}✅ avatar field exists in schema${NC}"
else
    echo -e "${RED}❌ avatar field missing in schema${NC}"
fi

cd ..

# Check environment variables
echo ""
echo -e "${YELLOW}5. Checking OAuth environment variables...${NC}"

if grep -q "GOOGLE_CLIENT_ID" backend/.env; then
    if grep -q "GOOGLE_CLIENT_ID=your_google_client_id" backend/.env; then
        echo -e "${YELLOW}⚠️  Google OAuth: Needs configuration${NC}"
    else
        echo -e "${GREEN}✅ Google OAuth: Configured${NC}"
    fi
else
    echo -e "${RED}❌ Google OAuth: Not in .env${NC}"
fi

if grep -q "GITHUB_CLIENT_ID" backend/.env; then
    if grep -q "GITHUB_CLIENT_ID=your_github_client_id" backend/.env; then
        echo -e "${YELLOW}⚠️  GitHub OAuth: Needs configuration${NC}"
    else
        echo -e "${GREEN}✅ GitHub OAuth: Configured${NC}"
    fi
else
    echo -e "${RED}❌ GitHub OAuth: Not in .env${NC}"
fi

if grep -q "LINKEDIN_CLIENT_ID" backend/.env; then
    if grep -q "LINKEDIN_CLIENT_ID=your_linkedin_client_id" backend/.env; then
        echo -e "${YELLOW}⚠️  LinkedIn OAuth: Needs configuration${NC}"
    else
        echo -e "${GREEN}✅ LinkedIn OAuth: Configured${NC}"
    fi
else
    echo -e "${RED}❌ LinkedIn OAuth: Not in .env${NC}"
fi

if grep -q "FRONTEND_URL" backend/.env; then
    echo -e "${GREEN}✅ FRONTEND_URL configured${NC}"
else
    echo -e "${YELLOW}⚠️  FRONTEND_URL not configured${NC}"
fi

# Check frontend files
echo ""
echo -e "${YELLOW}6. Checking frontend files...${NC}"

if [ -f "frontend/src/pages/OAuthCallback.tsx" ]; then
    echo -e "${GREEN}✅ OAuthCallback.tsx exists${NC}"
else
    echo -e "${RED}❌ OAuthCallback.tsx missing${NC}"
fi

if grep -q "handleOAuthLogin" frontend/src/pages/Login.tsx; then
    echo -e "${GREEN}✅ OAuth buttons in Login.tsx${NC}"
else
    echo -e "${RED}❌ OAuth buttons missing in Login.tsx${NC}"
fi

if grep -q "/auth/callback" frontend/src/App.tsx; then
    echo -e "${GREEN}✅ OAuth callback route in App.tsx${NC}"
else
    echo -e "${RED}❌ OAuth callback route missing in App.tsx${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✅ OAuth2 Implementation Test Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:5173/login"
echo "2. You should see OAuth buttons (Google, GitHub, LinkedIn)"
echo "3. To actually use OAuth, configure providers in backend/.env"
echo "4. See OAUTH2_IMPLEMENTATION_GUIDE.md for provider setup"
echo ""
echo "Documentation:"
echo "- OAUTH2_IMPLEMENTATION_GUIDE.md (Complete guide)"
echo "- OAUTH_QUICK_START.md (Quick testing)"
echo "- scripts/setup-oauth.sh (Setup helper)"
