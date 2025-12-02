// Test setup file
import dotenv from "dotenv";

// Load test environment variables (fallback to .env if .env.test doesn't exist)
dotenv.config({ path: ".env.test" });
dotenv.config(); // Load .env as fallback

// Set default test timeout (commented out - configured in jest.config.js instead)
// jest.setTimeout(10000);

// Mock environment variables if not set
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.CREDENTIAL_ENCRYPTION_KEY =
  process.env.CREDENTIAL_ENCRYPTION_KEY ||
  "dGVzdGtleTE2Ynl0ZXN0ZXN0dGVzdGVzdGVzdA==";
process.env.TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "test-bot-token";
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "test-chat-id";
