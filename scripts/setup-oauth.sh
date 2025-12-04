#!/bin/bash

# OAuth2 Setup Script
# This script helps you test OAuth2 integration with fake credentials for development

echo "🔐 OAuth2 Setup Script"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}Error: backend/.env file not found!${NC}"
    echo "Please create backend/.env from backend/.env.example"
    exit 1
fi

echo -e "${YELLOW}Note: You need to configure OAuth credentials for each provider.${NC}"
echo ""
echo "Please follow these steps:"
echo ""
echo "1️⃣  Google OAuth2:"
echo "   - Go to: https://console.cloud.google.com/"
echo "   - Create a project"
echo "   - Enable Google+ API"
echo "   - Create OAuth credentials"
echo "   - Add redirect URI: http://localhost:3000/auth/oauth/google/callback"
echo ""
echo "2️⃣  GitHub OAuth2:"
echo "   - Go to: https://github.com/settings/developers"
echo "   - New OAuth App"
echo "   - Homepage URL: http://localhost:5173"
echo "   - Callback URL: http://localhost:3000/auth/oauth/github/callback"
echo ""
echo "3️⃣  LinkedIn OAuth2:"
echo "   - Go to: https://www.linkedin.com/developers/apps"
echo "   - Create app"
echo "   - Add redirect URL: http://localhost:3000/auth/oauth/linkedin/callback"
echo ""

# Check if OAuth variables are set
echo -e "${YELLOW}Checking current OAuth configuration...${NC}"

if grep -q "GOOGLE_CLIENT_ID=your_google_client_id" backend/.env; then
    echo -e "❌ Google OAuth not configured"
else
    echo -e "✅ Google OAuth configured"
fi

if grep -q "GITHUB_CLIENT_ID=your_github_client_id" backend/.env; then
    echo -e "❌ GitHub OAuth not configured"
else
    echo -e "✅ GitHub OAuth configured"
fi

if grep -q "LINKEDIN_CLIENT_ID=your_linkedin_client_id" backend/.env; then
    echo -e "❌ LinkedIn OAuth not configured"
else
    echo -e "✅ LinkedIn OAuth configured"
fi

echo ""
echo -e "${GREEN}To configure OAuth providers:${NC}"
echo "1. Edit backend/.env"
echo "2. Add your OAuth credentials from the providers"
echo "3. Restart the backend server"
echo ""
echo "See OAUTH2_IMPLEMENTATION_GUIDE.md for detailed instructions."
