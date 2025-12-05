#!/bin/bash
echo "Creating test user..."
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "name": "Test Admin"
  }'
echo ""
echo "User created! Login with:"
echo "Email: admin@test.com"
echo "Password: Admin123!"
