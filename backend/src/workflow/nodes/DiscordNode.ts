import type { INodeExecutor, NodeExecutionResult, WorkflowNode, ExecutionContext } from "../types";

interface DiscordNodeData {
  webhookUrl?: string;
  credentialId?: string;
  content?: string;
  username?: string;
  avatarUrl?: string;
  tts?: boolean;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    footer?: {
      text: string;
      icon_url?: string;
    };
    author?: {
      name: string;
      url?: string;
      icon_url?: string;
    };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
}

export class DiscordNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const data = node.data.parameters as DiscordNodeData;

      // Get webhook URL
      const webhookUrl = data.webhookUrl;
      
      if (!webhookUrl) {
        throw new Error("Discord webhook URL required");
      }

      // Interpolate template variables
      const content = data.content ? this.interpolate(data.content, context) : undefined;
      const username = data.username ? this.interpolate(data.username, context) : undefined;

      // Prepare payload
      const payload: any = {};

      if (content) payload.content = content;
      if (username) payload.username = username;
      if (data.avatarUrl) payload.avatar_url = data.avatarUrl;
      if (data.tts) payload.tts = data.tts;
      if (data.embeds) payload.embeds = data.embeds;

      // Send to Discord
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.statusText}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: { sent: true, timestamp: Date.now() },
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
    const data = node.data.parameters as DiscordNodeData;

    if (!data.webhookUrl && !data.credentialId) {
      return "Webhook URL or credential required";
    }

    if (!data.content && (!data.embeds || data.embeds.length === 0)) {
      return "Content or embeds required";
    }

    return true;
  }
}
