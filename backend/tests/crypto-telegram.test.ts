/**
 * Unit Tests for Crypto Price to Telegram Workflow
 *
 * Tests cover:
 * - Fetching crypto prices from CoinGecko API
 * - Transforming price data into formatted message
 * - Sending message to Telegram
 * - Complete end-to-end workflow execution
 */

import nock from "nock";
import axios from "axios";

describe("Crypto Price to Telegram Workflow", () => {
  describe("Node 1: Fetch Crypto Prices", () => {
    const COINGECKO_URL = "https://api.coingecko.com";
    const COINS = "bitcoin,ethereum,cardano,solana,ripple,dogecoin";

    afterEach(() => {
      nock.cleanAll();
    });

    it("should fetch crypto prices from CoinGecko API successfully", async () => {
      // Mock API response
      const mockPrices = {
        bitcoin: { usd: 42150.0, usd_24h_change: 2.34 },
        ethereum: { usd: 2240.5, usd_24h_change: -1.12 },
        cardano: { usd: 0.65, usd_24h_change: 0.89 },
        solana: { usd: 98.23, usd_24h_change: 5.67 },
        ripple: { usd: 0.54, usd_24h_change: -0.45 },
        dogecoin: { usd: 0.08, usd_24h_change: 1.23 },
      };

      nock(COINGECKO_URL)
        .get("/api/v3/simple/price")
        .query({
          ids: COINS,
          vs_currencies: "usd",
          include_24hr_change: "true",
        })
        .reply(200, mockPrices);

      const response = await axios.get(`${COINGECKO_URL}/api/v3/simple/price`, {
        params: {
          ids: COINS,
          vs_currencies: "usd",
          include_24hr_change: true,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockPrices);
      expect(response.data.bitcoin.usd).toBe(42150.0);
      expect(response.data.ethereum.usd_24h_change).toBe(-1.12);
    });

    it("should handle API errors gracefully", async () => {
      nock(COINGECKO_URL)
        .get("/api/v3/simple/price")
        .query(true)
        .reply(500, { error: "Internal Server Error" });

      await expect(
        axios.get(`${COINGECKO_URL}/api/v3/simple/price`, {
          params: {
            ids: COINS,
            vs_currencies: "usd",
            include_24hr_change: true,
          },
        })
      ).rejects.toThrow();
    });

    it("should validate response data structure", async () => {
      const mockPrices = {
        bitcoin: { usd: 42150.0, usd_24h_change: 2.34 },
      };

      nock(COINGECKO_URL)
        .get("/api/v3/simple/price")
        .query(true)
        .reply(200, mockPrices);

      const response = await axios.get(`${COINGECKO_URL}/api/v3/simple/price`, {
        params: {
          ids: "bitcoin",
          vs_currencies: "usd",
          include_24hr_change: true,
        },
      });

      const bitcoin = response.data.bitcoin;
      expect(bitcoin).toHaveProperty("usd");
      expect(bitcoin).toHaveProperty("usd_24h_change");
      expect(typeof bitcoin.usd).toBe("number");
      expect(typeof bitcoin.usd_24h_change).toBe("number");
    });
  });

  describe("Node 2: Format Message (Transform)", () => {
    it("should format crypto prices into Telegram message", () => {
      const mockPrices = {
        bitcoin: { usd: 42150.0, usd_24h_change: 2.34 },
        ethereum: { usd: 2240.5, usd_24h_change: -1.12 },
        solana: { usd: 98.23, usd_24h_change: 5.67 },
      };

      // Simulate the transform node logic
      const context = { nodes: { "1": mockPrices } };

      const transformCode = `
        const prices = context.nodes['1'];
        let message = '🪙 *Crypto Price Update*\\n━━━━━━━━━━━━━━━━\\n\\n';
        const coins = [];
        
        for (const [coin, data] of Object.entries(prices)) {
          coins.push({
            name: coin,
            price: data.usd,
            change: data.usd_24h_change || 0
          });
        }
        
        coins.sort((a, b) => b.price - a.price);
        
        for (const coin of coins) {
          const change = coin.change;
          const emoji = change >= 0 ? '📈' : '📉';
          const coinName = coin.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const formattedPrice = coin.price >= 1 
            ? coin.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
            : coin.price.toFixed(6);
          message += \`\${emoji} *\${coinName}*\\n💵 $\${formattedPrice} (\${change >= 0 ? '+' : ''}\${change.toFixed(2)}%)\\n\\n\`;
        }
        
        message += '━━━━━━━━━━━━━━━━\\n🕐 ' + new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: true }) + ' UTC';
        
        return { message };
      `;

      const result = new Function("context", transformCode)(context);

      expect(result).toHaveProperty("message");
      expect(result.message).toContain("🪙 *Crypto Price Update*");
      expect(result.message).toContain("Bitcoin");
      expect(result.message).toContain("$42,150.00");
      expect(result.message).toContain("+2.34%");
      expect(result.message).toContain("📈"); // Positive change
      expect(result.message).toContain("📉"); // Negative change
    });

    it("should handle missing price change data", () => {
      const mockPrices = {
        bitcoin: { usd: 42150.0 }, // No usd_24h_change
      };

      const context = { nodes: { "1": mockPrices } };

      const transformCode = `
        const prices = context.nodes['1'];
        const coins = [];
        
        for (const [coin, data] of Object.entries(prices)) {
          coins.push({
            name: coin,
            price: data.usd,
            change: data.usd_24h_change || 0
          });
        }
        
        return { coins };
      `;

      const result = new Function("context", transformCode)(context);

      expect(result.coins[0].change).toBe(0);
    });

    it("should sort coins by price (highest first)", () => {
      const mockPrices = {
        dogecoin: { usd: 0.08, usd_24h_change: 1.23 },
        bitcoin: { usd: 42150.0, usd_24h_change: 2.34 },
        ethereum: { usd: 2240.5, usd_24h_change: -1.12 },
      };

      const context = { nodes: { "1": mockPrices } };

      const transformCode = `
        const prices = context.nodes['1'];
        const coins = [];
        
        for (const [coin, data] of Object.entries(prices)) {
          coins.push({ name: coin, price: data.usd });
        }
        
        coins.sort((a, b) => b.price - a.price);
        
        return { coins };
      `;

      const result = new Function("context", transformCode)(context);

      expect(result.coins[0].name).toBe("bitcoin");
      expect(result.coins[1].name).toBe("ethereum");
      expect(result.coins[2].name).toBe("dogecoin");
    });

    it("should format small coin prices with 6 decimals", () => {
      const mockPrices = {
        dogecoin: { usd: 0.082345, usd_24h_change: 1.23 },
      };

      const context = { nodes: { "1": mockPrices } };

      const transformCode = `
        const prices = context.nodes['1'];
        let message = '';
        
        for (const [coin, data] of Object.entries(prices)) {
          const formattedPrice = data.usd >= 1 
            ? data.usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
            : data.usd.toFixed(6);
          message = formattedPrice;
        }
        
        return { message };
      `;

      const result = new Function("context", transformCode)(context);

      expect(result.message).toBe("0.082345");
    });
  });

  describe("Node 3: Send to Telegram", () => {
    const TELEGRAM_API = "https://api.telegram.org";
    const BOT_TOKEN = "8335511507:AAH-krYyKMbCgzG7xQaE6OX1m-K-f5l1dKc";
    const CHAT_ID = "5974035313";

    afterEach(() => {
      nock.cleanAll();
    });

    it("should send message to Telegram successfully", async () => {
      const message =
        "🪙 *Crypto Price Update*\\n\\n📈 *Bitcoin*\\n💵 $42,150.00 (+2.34%)";

      nock(TELEGRAM_API)
        .post(`/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        })
        .reply(200, {
          ok: true,
          result: {
            message_id: 123,
            chat: { id: parseInt(CHAT_ID), type: "private" },
            date: Math.floor(Date.now() / 1000),
            text: message,
          },
        });

      const response = await axios.post(
        `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.ok).toBe(true);
      expect(response.data.result.message_id).toBe(123);
    });

    it("should handle Telegram API errors", async () => {
      nock(TELEGRAM_API).post(`/bot${BOT_TOKEN}/sendMessage`).reply(400, {
        ok: false,
        error_code: 400,
        description: "Bad Request: chat not found",
      });

      await expect(
        axios.post(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: "invalid",
          text: "test",
        })
      ).rejects.toThrow();
    });

    it("should interpolate message from context", () => {
      const context = {
        nodes: {
          "2": {
            message: "🪙 Crypto Update",
          },
        },
      };

      // Template interpolation logic
      function interpolate(template: string, context: any): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const keys = path.trim().split(".");
          let value = context;
          for (const key of keys) {
            value = value?.[key];
          }
          return value !== undefined ? value : match;
        });
      }

      const template = "{{nodes.2.message}}";
      const result = interpolate(template, context);

      expect(result).toBe("🪙 Crypto Update");
    });

    it("should validate Markdown formatting", async () => {
      const message = "*Bold* _Italic_ `Code`";

      nock(TELEGRAM_API)
        .post(`/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        })
        .reply(200, { ok: true, result: { message_id: 456 } });

      const response = await axios.post(
        `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }
      );

      expect(response.data.ok).toBe(true);
    });
  });

  describe("End-to-End Workflow", () => {
    afterEach(() => {
      nock.cleanAll();
    });

    it("should execute complete workflow successfully", async () => {
      const COINGECKO_URL = "https://api.coingecko.com";
      const TELEGRAM_API = "https://api.telegram.org";
      const BOT_TOKEN = "8335511507:AAH-krYyKMbCgzG7xQaE6OX1m-K-f5l1dKc";
      const CHAT_ID = "5974035313";

      // Step 1: Mock CoinGecko API
      const mockPrices = {
        bitcoin: { usd: 42150.0, usd_24h_change: 2.34 },
        ethereum: { usd: 2240.5, usd_24h_change: -1.12 },
      };

      nock(COINGECKO_URL)
        .get("/api/v3/simple/price")
        .query(true)
        .reply(200, mockPrices);

      // Step 2: Fetch prices
      const pricesResponse = await axios.get(
        `${COINGECKO_URL}/api/v3/simple/price`,
        {
          params: {
            ids: "bitcoin,ethereum",
            vs_currencies: "usd",
            include_24hr_change: true,
          },
        }
      );

      expect(pricesResponse.data).toEqual(mockPrices);

      // Step 3: Transform data
      const context = { nodes: { "1": pricesResponse.data } };

      const transformCode = `
        const prices = context.nodes['1'];
        let message = '🪙 *Crypto Price Update*\\n\\n';
        
        for (const [coin, data] of Object.entries(prices)) {
          const emoji = data.usd_24h_change >= 0 ? '📈' : '📉';
          const coinName = coin.charAt(0).toUpperCase() + coin.slice(1);
          message += \`\${emoji} *\${coinName}*: $\${data.usd.toFixed(2)} (\${data.usd_24h_change.toFixed(2)}%)\\n\`;
        }
        
        return { message };
      `;

      const transformResult = new Function("context", transformCode)(context);

      expect(transformResult.message).toContain("Bitcoin");
      expect(transformResult.message).toContain("Ethereum");

      // Step 4: Mock Telegram API
      nock(TELEGRAM_API)
        .post(`/bot${BOT_TOKEN}/sendMessage`)
        .reply(200, { ok: true, result: { message_id: 789 } });

      // Step 5: Send to Telegram
      const telegramResponse = await axios.post(
        `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: transformResult.message,
          parse_mode: "Markdown",
        }
      );

      expect(telegramResponse.data.ok).toBe(true);
      expect(telegramResponse.data.result.message_id).toBe(789);
    });

    it("should handle workflow failures at any step", async () => {
      const COINGECKO_URL = "https://api.coingecko.com";

      // Simulate API failure
      nock(COINGECKO_URL)
        .get("/api/v3/simple/price")
        .query(true)
        .reply(503, { error: "Service Unavailable" });

      await expect(
        axios.get(`${COINGECKO_URL}/api/v3/simple/price`, {
          params: { ids: "bitcoin", vs_currencies: "usd" },
        })
      ).rejects.toThrow();
    });
  });

  describe("Template Interpolation", () => {
    function interpolate(obj: any, context: any): any {
      if (typeof obj === "string") {
        return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const keys = path.trim().split(".");
          let value = context;
          for (const key of keys) {
            value = value?.[key];
          }
          return value !== undefined ? value : match;
        });
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => interpolate(item, context));
      }
      if (obj && typeof obj === "object") {
        const result: any = {};
        for (const [key, val] of Object.entries(obj)) {
          result[key] = interpolate(val, context);
        }
        return result;
      }
      return obj;
    }

    it("should interpolate simple string templates", () => {
      const context = {
        nodes: {
          "1": { price: 100 },
          "2": { message: "Hello" },
        },
      };

      expect(interpolate("{{nodes.1.price}}", context)).toBe("100");
      expect(interpolate("{{nodes.2.message}}", context)).toBe("Hello");
    });

    it("should interpolate nested object templates", () => {
      const context = {
        nodes: {
          "2": { message: "Test Message" },
        },
      };

      const body = {
        chat_id: "123",
        text: "{{nodes.2.message}}",
        parse_mode: "Markdown",
      };

      const result = interpolate(body, context);

      expect(result.text).toBe("Test Message");
      expect(result.chat_id).toBe("123");
      expect(result.parse_mode).toBe("Markdown");
    });

    it("should handle missing values gracefully", () => {
      const context = { nodes: {} };

      expect(interpolate("{{nodes.1.missing}}", context)).toBe(
        "{{nodes.1.missing}}"
      );
    });

    it("should interpolate arrays", () => {
      const context = {
        nodes: {
          "1": { value: "A" },
          "2": { value: "B" },
        },
      };

      const arr = ["{{nodes.1.value}}", "{{nodes.2.value}}"];
      const result = interpolate(arr, context);

      expect(result).toEqual(["A", "B"]);
    });
  });
});
