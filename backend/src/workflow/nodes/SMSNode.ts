import type { INodeExecutor, NodeExecutionResult, WorkflowNode, ExecutionContext } from "../types";

interface SMSNodeData {
  provider: "twilio" | "vonage" | "custom";
  credentialId?: string;
  // Twilio
  accountSid?: string;
  authToken?: string;
  // Vonage
  apiKey?: string;
  apiSecret?: string;
  // Common
  from: string;
  to: string;
  message: string;
  // Custom provider
  customUrl?: string;
  customMethod?: "GET" | "POST";
  customHeaders?: Record<string, string>;
}

export class SMSNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const data = node.data.parameters as SMSNodeData;

      // Interpolate variables
      const from = this.interpolate(data.from, context);
      const to = this.interpolate(data.to, context);
      const message = this.interpolate(data.message, context);

      let result;

      switch (data.provider) {
        case "twilio":
          result = await this.sendTwilio(data, from, to, message);
          break;

        case "vonage":
          result = await this.sendVonage(data, from, to, message);
          break;

        case "custom":
          result = await this.sendCustom(data, from, to, message, context);
          break;

        default:
          throw new Error(`Unsupported SMS provider: ${data.provider}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: result,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  private async sendTwilio(
    config: SMSNodeData,
    from: string,
    to: string,
    message: string
  ): Promise<any> {
    if (!config.accountSid || !config.authToken) {
      throw new Error("Twilio account SID and auth token required");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    const auth = btoa(`${config.accountSid}:${config.authToken}`);

    const body = new URLSearchParams({
      From: from,
      To: to,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${error}`);
    }

    return await response.json();
  }

  private async sendVonage(
    config: SMSNodeData,
    from: string,
    to: string,
    message: string
  ): Promise<any> {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error("Vonage API key and secret required");
    }

    const url = "https://rest.nexmo.com/sms/json";

    const body = {
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      from,
      to,
      text: message,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vonage API error: ${error}`);
    }

    return await response.json();
  }

  private async sendCustom(
    config: SMSNodeData,
    from: string,
    to: string,
    message: string,
    context: ExecutionContext
  ): Promise<any> {
    if (!config.customUrl) {
      throw new Error("Custom webhook URL required");
    }

    const url = this.interpolate(config.customUrl, context);
    const method = config.customMethod || "POST";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.customHeaders) {
      Object.entries(config.customHeaders).forEach(([key, value]) => {
        headers[key] = this.interpolate(value, context);
      });
    }

    const body = JSON.stringify({
      from,
      to,
      message,
    });

    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? body : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom SMS provider error: ${error}`);
    }

    return await response.json();
  }

  private interpolate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      if (parts[0] === 'nodes' && parts.length >= 2) {
        const nodeId = parts[1];
        const nodeOutput = context.nodeData.get(nodeId);
        if (nodeOutput && parts.length > 2) {
          let value = nodeOutput;
          for (let i = 2; i < parts.length; i++) {
            value = value?.[parts[i]];
          }
          return value !== undefined ? String(value) : match;
        }
      }
      return match;
    });
  }

  validate(node: WorkflowNode): boolean | string {
    const data = node.data.parameters as SMSNodeData;

    if (!data.provider) {
      return "SMS provider required";
    }

    if (!data.from) return "From number required";
    if (!data.to) return "To number required";
    if (!data.message) return "Message required";

    if (data.provider === "twilio" && (!data.accountSid || !data.authToken)) {
      return "Twilio account SID and auth token required";
    }

    if (data.provider === "vonage" && (!data.apiKey || !data.apiSecret)) {
      return "Vonage API key and secret required";
    }

    if (data.provider === "custom" && !data.customUrl) {
      return "Custom webhook URL required";
    }

    return true;
  }
}
