/**
 * Telegram Send Message Node
 * Sends messages to Telegram
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { TelegramBot } from '../../services/telegramBot';

export class TelegramSendExecutor implements INodeExecutor {
  private telegramBot: TelegramBot;

  constructor() {
    this.telegramBot = new TelegramBot();
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { message, chatId, parseMode = 'HTML' } = node.data.parameters;

      if (!message) {
        throw new Error('Message is required');
      }

      // Replace variables in message
      const processedMessage = this.replaceVariables(message, context);
      
      // Use chatId from parameters or from env
      const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
      
      if (!targetChatId) {
        throw new Error('Chat ID not found in parameters or environment');
      }

      // Send message directly via axios
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: processedMessage,
          parse_mode: parseMode,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.description || 'Failed to send message');
      }

      return {
        success: true,
        output: {
          chatId: targetChatId,
          messageId: result.result.message_id,
          sent: true,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Telegram send failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const { message } = node.data.parameters;
    
    if (!message) {
      return 'Message is required';
    }
    
    return true;
  }

  private replaceVariables(text: string, context: ExecutionContext): string {
    // Replace {{nodeId.field}} or {{nodeId}} with actual values
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      const nodeId = parts[0];
      const nodeData = context.nodeData.get(nodeId);
      
      if (!nodeData) {
        return match; // Keep original if not found
      }
      
      // If only nodeId, return JSON string
      if (parts.length === 1) {
        return JSON.stringify(nodeData, null, 2);
      }
      
      // Navigate through nested fields
      let value = nodeData;
      for (let i = 1; i < parts.length; i++) {
        value = value?.[parts[i]];
      }
      
      return value !== undefined ? String(value) : match;
    });
  }
}
