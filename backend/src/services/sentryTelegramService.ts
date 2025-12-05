import axios from 'axios';

/**
 * Service to send Sentry errors to Telegram
 */
export class SentryTelegramService {
  private botToken: string;
  private chatId: string;
  private enabled: boolean;

  // Rate limiting: Track last sent time per error fingerprint
  private lastSent: Map<string, number> = new Map();

  // Configuration
  private readonly COOLDOWN_MS = parseInt(process.env.TELEGRAM_COOLDOWN_MS || '60000'); // Default: 1 minute
  private readonly MAX_MESSAGES_PER_HOUR = parseInt(process.env.TELEGRAM_MAX_PER_HOUR || '50'); // Default: 50/hour
  private readonly MAX_MESSAGES_PER_DAY = parseInt(process.env.TELEGRAM_MAX_PER_DAY || '1000'); // Default: 1000/day

  // Daily/hourly counters
  private dailyCount = 0;
  private hourlyCount = 0;
  private dailyResetTime = Date.now() + (24 * 60 * 60 * 1000); // Next day
  private hourlyResetTime = Date.now() + (60 * 60 * 1000); // Next hour

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_ERROR_CHAT_ID || '';
    this.enabled = !!(this.botToken && this.chatId);

    if (!this.enabled) {
      console.warn('⚠️  Telegram error notifications disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ERROR_CHAT_ID to enable.');
    } else {
      console.log('✅ Telegram error notifications enabled');
      console.log(`   Rate limits: ${this.MAX_MESSAGES_PER_HOUR}/hour, ${this.MAX_MESSAGES_PER_DAY}/day`);
      console.log(`   Cooldown: ${this.COOLDOWN_MS / 1000}s per error`);
    }
  }

  /**
   * Send error notification to Telegram with rate limiting
   */
  async sendErrorNotification(error: {
    errorType: string;
    message: string;
    severity: string;
    stack?: string;
    workflowId?: string;
    executionId?: string;
    userId?: string;
    environment?: string;
    sentryUrl?: string;
    dashboardUrl?: string;
    occurrences?: number;
    firstSeenAt?: Date;
    fingerprint?: string;
  }): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    // Reset counters if needed
    this.resetCountersIfNeeded();

    // Check daily limit
    if (this.dailyCount >= this.MAX_MESSAGES_PER_DAY) {
      console.warn(`⏭️  Telegram daily limit reached (${this.MAX_MESSAGES_PER_DAY}). Skipping notification.`);
      return false;
    }

    // Check hourly limit
    if (this.hourlyCount >= this.MAX_MESSAGES_PER_HOUR) {
      console.warn(`⏭️  Telegram hourly limit reached (${this.MAX_MESSAGES_PER_HOUR}). Skipping notification.`);
      return false;
    }

    // Generate fingerprint for cooldown check
    const fingerprint = error.fingerprint || this.generateFingerprint(error);

    // Check cooldown period (prevent spam from same error)
    const lastSentTime = this.lastSent.get(fingerprint);
    if (lastSentTime && Date.now() - lastSentTime < this.COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((this.COOLDOWN_MS - (Date.now() - lastSentTime)) / 1000);
      console.log(`⏭️  Error notification skipped (cooldown: ${remainingSeconds}s remaining)`);
      return false;
    }

    try {
      const message = this.formatErrorMessage(error);

      await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        },
        {
          timeout: 5000, // 5 second timeout
        }
      );

      // Update counters and last sent time
      this.dailyCount++;
      this.hourlyCount++;
      this.lastSent.set(fingerprint, Date.now());

      // Clean up old entries from lastSent map (keep only last 1000)
      if (this.lastSent.size > 1000) {
        const entries = Array.from(this.lastSent.entries());
        entries.sort((a, b) => b[1] - a[1]); // Sort by timestamp
        this.lastSent = new Map(entries.slice(0, 1000));
      }

      console.log(`✅ Error notification sent to Telegram (${this.dailyCount}/${this.MAX_MESSAGES_PER_DAY} today, ${this.hourlyCount}/${this.MAX_MESSAGES_PER_HOUR} this hour)`);
      return true;
    } catch (err: any) {
      // Handle rate limit errors from Telegram API
      if (err.response?.status === 429) {
        const retryAfter = err.response.headers['retry-after'] || 60;
        console.warn(`⚠️  Telegram API rate limit hit. Retry after ${retryAfter}s`);
        // Update hourly reset to respect Telegram's rate limit
        this.hourlyResetTime = Date.now() + (retryAfter * 1000);
      } else {
        console.error('❌ Failed to send Telegram notification:', err.message);
      }
      return false;
    }
  }

  /**
   * Generate fingerprint for error grouping
   */
  private generateFingerprint(error: any): string {
    // Use error type + first line of message for fingerprinting
    const messageFirstLine = error.message?.split('\n')[0] || '';
    return `${error.errorType}:${messageFirstLine.substring(0, 50)}`;
  }

  /**
   * Reset daily/hourly counters if needed
   */
  private resetCountersIfNeeded(): void {
    const now = Date.now();

    // Reset daily counter
    if (now >= this.dailyResetTime) {
      this.dailyCount = 0;
      this.dailyResetTime = now + (24 * 60 * 60 * 1000);
      console.log('🔄 Telegram daily counter reset');
    }

    // Reset hourly counter
    if (now >= this.hourlyResetTime) {
      this.hourlyCount = 0;
      this.hourlyResetTime = now + (60 * 60 * 1000);
    }
  }

  /**
   * Format error message for Telegram
   */
  private formatErrorMessage(error: any): string {
    const severityEmoji = {
      CRITICAL: '🔴',
      ERROR: '🟠',
      WARNING: '🟡',
      INFO: '🔵',
    }[error.severity] || '⚪';

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    let message = `${severityEmoji} *${error.severity} Error Alert*\n\n`;
    message += `*Error:* ${this.escapeMarkdown(error.message)}\n`;
    message += `*Type:* \`${error.errorType}\`\n`;
    message += `*Environment:* ${error.environment || 'production'}\n`;
    message += `*Time:* ${timestamp}\n`;

    if (error.occurrences && error.occurrences > 1) {
      message += `*Occurrences:* ${error.occurrences}\n`;
    }

    if (error.workflowId) {
      message += `*Workflow:* \`${error.workflowId}\`\n`;
    }

    if (error.executionId) {
      message += `*Execution:* \`${error.executionId}\`\n`;
    }

    if (error.userId) {
      message += `*User:* \`${error.userId}\`\n`;
    }

    // Add stack trace (first 10 lines only)
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 10);
      message += `\n*Stack Trace:*\n\`\`\`\n${stackLines.join('\n')}\n\`\`\`\n`;
    }

    // Add links
    message += `\n`;
    if (error.sentryUrl) {
      message += `🔗 [View in Sentry](${error.sentryUrl})\n`;
    }
    if (error.dashboardUrl) {
      message += `📊 [View in Dashboard](${error.dashboardUrl})\n`;
    }

    return message;
  }

  /**
   * Escape markdown special characters
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<boolean> {
    return this.sendErrorNotification({
      errorType: 'TestError',
      message: 'This is a test error notification from Automation Platform',
      severity: 'INFO',
      environment: 'development',
      dashboardUrl: `${process.env.APP_URL || 'http://localhost:5173'}/monitoring`,
    });
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    this.resetCountersIfNeeded();

    const now = Date.now();
    const hoursUntilReset = Math.ceil((this.hourlyResetTime - now) / (60 * 60 * 1000));
    const hoursUntilDailyReset = Math.ceil((this.dailyResetTime - now) / (60 * 60 * 1000));

    return {
      enabled: this.enabled,
      daily: {
        sent: this.dailyCount,
        limit: this.MAX_MESSAGES_PER_DAY,
        remaining: Math.max(0, this.MAX_MESSAGES_PER_DAY - this.dailyCount),
        resetInHours: hoursUntilDailyReset,
      },
      hourly: {
        sent: this.hourlyCount,
        limit: this.MAX_MESSAGES_PER_HOUR,
        remaining: Math.max(0, this.MAX_MESSAGES_PER_HOUR - this.hourlyCount),
        resetInHours: hoursUntilReset,
      },
      cooldown: {
        seconds: this.COOLDOWN_MS / 1000,
      },
      config: {
        cooldownMs: this.COOLDOWN_MS,
        maxPerHour: this.MAX_MESSAGES_PER_HOUR,
        maxPerDay: this.MAX_MESSAGES_PER_DAY,
      },
    };
  }
}

// Singleton instance
export const sentryTelegramService = new SentryTelegramService();

