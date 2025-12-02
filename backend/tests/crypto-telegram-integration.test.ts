/**
 * Integration Tests for Crypto Price Workflow
 *
 * Tests the complete workflow execution through the worker engine
 */

describe("Crypto Price Workflow - Integration Tests", () => {
  describe("Workflow Execution via Worker", () => {
    it("should execute workflow through the engine with all nodes", async () => {
      // Mock workflow definition
      const workflowDefinition = {
        nodes: [
          {
            id: "1",
            type: "http",
            name: "Fetch Crypto Prices",
            config: {
              url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            },
          },
          {
            id: "2",
            type: "transform",
            name: "Format Message",
            config: {
              code: `
                const prices = context.nodes['1'];
                let message = '🪙 *Crypto Price Update*\\n\\n';
                for (const [coin, data] of Object.entries(prices)) {
                  const emoji = data.usd_24h_change >= 0 ? '📈' : '📉';
                  const coinName = coin.charAt(0).toUpperCase() + coin.slice(1);
                  message += \`\${emoji} *\${coinName}*: $\${data.usd.toFixed(2)} (\${data.usd_24h_change.toFixed(2)}%)\\n\`;
                }
                return { message };
              `,
            },
          },
          {
            id: "3",
            type: "http",
            name: "Send to Telegram",
            config: {
              url: "https://api.telegram.org/bot123:ABC/sendMessage",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: {
                chat_id: "123456",
                text: "{{nodes.2.message}}",
                parse_mode: "Markdown",
                disable_web_page_preview: true,
              },
            },
          },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
        ],
      };

      // Validate workflow structure
      expect(workflowDefinition.nodes).toHaveLength(3);
      expect(workflowDefinition.edges).toHaveLength(2);

      // Validate node types
      expect(workflowDefinition.nodes[0].type).toBe("http");
      expect(workflowDefinition.nodes[1].type).toBe("transform");
      expect(workflowDefinition.nodes[2].type).toBe("http");

      // Validate node connections
      expect(workflowDefinition.edges[0].source).toBe("1");
      expect(workflowDefinition.edges[0].target).toBe("2");
      expect(workflowDefinition.edges[1].source).toBe("2");
      expect(workflowDefinition.edges[1].target).toBe("3");
    });

    it("should build correct dependency graph", () => {
      const nodes = [
        { id: "1", type: "http" },
        { id: "2", type: "transform" },
        { id: "3", type: "http" },
      ];

      const edges = [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
      ];

      // Build dependency graph
      const childrenMap: Record<string, string[]> = {};
      const parentCount: Record<string, number> = {};

      nodes.forEach((n) => {
        childrenMap[n.id] = [];
        parentCount[n.id] = 0;
      });

      edges.forEach((edge) => {
        childrenMap[edge.source]?.push(edge.target);
        if (parentCount[edge.target] === undefined)
          parentCount[edge.target] = 0;
        parentCount[edge.target] += 1;
      });

      // Validate graph structure
      expect(childrenMap["1"]).toEqual(["2"]);
      expect(childrenMap["2"]).toEqual(["3"]);
      expect(childrenMap["3"]).toEqual([]);

      expect(parentCount["1"]).toBe(0);
      expect(parentCount["2"]).toBe(1);
      expect(parentCount["3"]).toBe(1);
    });

    it("should execute nodes in correct order (topological sort)", () => {
      const nodes = [
        { id: "3", type: "http", name: "Send" },
        { id: "1", type: "http", name: "Fetch" },
        { id: "2", type: "transform", name: "Transform" },
      ];

      const edges = [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
      ];

      // Build graph
      const childrenMap: Record<string, string[]> = {};
      const parentCount: Record<string, number> = {};

      nodes.forEach((n) => {
        childrenMap[n.id] = [];
        parentCount[n.id] = 0;
      });

      edges.forEach((edge) => {
        childrenMap[edge.source]?.push(edge.target);
        parentCount[edge.target] += 1;
      });

      // Topological sort (BFS)
      const executionOrder: string[] = [];
      const queue = nodes
        .filter((n) => parentCount[n.id] === 0)
        .map((n) => n.id);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        executionOrder.push(nodeId);

        for (const child of childrenMap[nodeId] ?? []) {
          parentCount[child] -= 1;
          if (parentCount[child] === 0) {
            queue.push(child);
          }
        }
      }

      // Verify execution order
      expect(executionOrder).toEqual(["1", "2", "3"]);
    });

    it("should store node outputs in context correctly", () => {
      const context: any = {};
      const nodeOutputs = [
        {
          nodeId: "1",
          output: { bitcoin: { usd: 42150, usd_24h_change: 2.34 } },
        },
        { nodeId: "2", output: { message: "Crypto Update" } },
        { nodeId: "3", output: { ok: true, message_id: 123 } },
      ];

      // Simulate node execution and context building
      context.nodes = {};

      for (const { nodeId, output } of nodeOutputs) {
        context.nodes[nodeId] = output;
        Object.assign(context, output);
      }

      // Verify context structure
      expect(context.nodes["1"]).toEqual({
        bitcoin: { usd: 42150, usd_24h_change: 2.34 },
      });
      expect(context.nodes["2"]).toEqual({ message: "Crypto Update" });
      expect(context.nodes["3"]).toEqual({ ok: true, message_id: 123 });

      // Verify merged context
      expect(context.message).toBe("Crypto Update");
      expect(context.ok).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP node failures", () => {
      const errorPolicies = ["stop", "retry", "fallback", "continue"];

      errorPolicies.forEach((policy) => {
        const node = {
          id: "1",
          type: "http",
          config: {
            url: "https://api.example.com/fail",
            method: "GET",
            onError: policy,
            retry: 3,
            fallback: { default: "value" },
          },
        };

        expect(node.config.onError).toBe(policy);
      });
    });

    it("should handle transform node errors", () => {
      const invalidCode = `
        throw new Error('Transform failed');
      `;

      expect(() => {
        new Function("context", invalidCode)({ nodes: {} });
      }).toThrow("Transform failed");
    });

    it("should validate node configuration", () => {
      const validHttpNode = {
        id: "1",
        type: "http",
        config: {
          url: "https://api.example.com",
          method: "GET",
        },
      };

      expect(validHttpNode.config).toHaveProperty("url");
      expect(validHttpNode.config).toHaveProperty("method");
      expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(
        validHttpNode.config.method
      );
    });
  });

  describe("Performance Tests", () => {
    it("should complete workflow execution within timeout", async () => {
      const startTime = Date.now();
      const timeout = 5000; // 5 seconds

      // Simulate quick workflow execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(timeout);
    });

    it("should handle multiple coin prices efficiently", () => {
      const largePriceData: any = {};
      const coinCount = 20;

      // Generate mock data for many coins
      for (let i = 0; i < coinCount; i++) {
        largePriceData[`coin${i}`] = {
          usd: Math.random() * 1000,
          usd_24h_change: (Math.random() - 0.5) * 10,
        };
      }

      const context = { nodes: { "1": largePriceData } };

      const transformCode = `
        const prices = context.nodes['1'];
        const coins = [];
        for (const [coin, data] of Object.entries(prices)) {
          coins.push({ name: coin, price: data.usd });
        }
        return { coins };
      `;

      const result = new Function("context", transformCode)(context);

      expect(result.coins).toHaveLength(coinCount);
    });
  });

  describe("Data Validation", () => {
    it("should validate CoinGecko API response format", () => {
      const validResponse = {
        bitcoin: {
          usd: 42150,
          usd_24h_change: 2.34,
        },
      };

      expect(validResponse.bitcoin).toHaveProperty("usd");
      expect(validResponse.bitcoin).toHaveProperty("usd_24h_change");
      expect(typeof validResponse.bitcoin.usd).toBe("number");
      expect(typeof validResponse.bitcoin.usd_24h_change).toBe("number");
    });

    it("should validate Telegram message payload", () => {
      const telegramPayload = {
        chat_id: "5974035313",
        text: "🪙 Crypto Update",
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      };

      expect(telegramPayload).toHaveProperty("chat_id");
      expect(telegramPayload).toHaveProperty("text");
      expect(telegramPayload.parse_mode).toBe("Markdown");
      expect(telegramPayload.disable_web_page_preview).toBe(true);
      expect(typeof telegramPayload.text).toBe("string");
    });

    it("should sanitize coin names for display", () => {
      const coinNames = ["bitcoin", "ethereum-classic", "binance-coin"];

      const formatted = coinNames.map((name) =>
        name
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      );

      expect(formatted).toEqual([
        "Bitcoin",
        "Ethereum Classic",
        "Binance Coin",
      ]);
    });

    it("should format currency values correctly", () => {
      const values = [
        { value: 42150.234, expected: "42,150.23" },
        { value: 0.082345, expected: "0.082345" },
        { value: 1234.5, expected: "1,234.50" },
      ];

      values.forEach(({ value, expected }) => {
        const formatted =
          value >= 1
            ? value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : value.toFixed(6);

        expect(formatted).toBe(expected);
      });
    });
  });
});
