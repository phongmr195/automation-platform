import type { INodeExecutor, NodeExecutionResult, WorkflowNode, ExecutionContext } from "../types";

interface SlackNodeData {
  webhookUrl?: string;
  credentialId?: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  text: string;
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    footer?: string;
  }>;
  blocks?: any[];
}

export class SlackNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const data = node.data.parameters as SlackNodeData;

      // Get webhook URL (in production, would fetch from credentials)
      const webhookUrl = data.webhookUrl;
      
      if (!webhookUrl) {
        throw new Error("Slack webhook URL required");
      }

      // Interpolate template variables
      const text = this.interpolate(data.text, context);
      const channel = data.channel ? this.interpolate(data.channel, context) : undefined;
      const username = data.username ? this.interpolate(data.username, context) : undefined;

      // Prepare payload
      const payload: any = { text };

      if (channel) payload.channel = channel;
      if (username) payload.username = username;
      if (data.iconEmoji) payload.icon_emoji = data.iconEmoji;
      if (data.attachments) payload.attachments = data.attachments;
      if (data.blocks) payload.blocks = data.blocks;

      // Send to Slack
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
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
    const data = node.data.parameters as SlackNodeData;

    if (!data.webhookUrl && !data.credentialId) {
      return "Webhook URL or credential required";
    }

    if (!data.text) {
      return "Message text required";
    }

    return true;
  }
}
