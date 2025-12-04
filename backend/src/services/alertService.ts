/**
 * Alert Service
 * Manages alert rules, channels, and notifications
 */

import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import axios from 'axios';
import type { 
  AlertRule, 
  AlertChannel, 
  AlertHistory, 
  AlertTriggerType, 
  AlertChannelType,
  AlertSeverity 
} from '@prisma/client';

// Types
export interface AlertRuleInput {
  name: string;
  description?: string;
  enabled?: boolean;
  organizationId: string;
  workflowId?: string;
  triggerType: AlertTriggerType;
  conditions: any;
  evaluationInterval?: number;
  cooldownPeriod?: number;
  channelIds: string[];
}

export interface AlertChannelInput {
  name: string;
  description?: string;
  enabled?: boolean;
  organizationId: string;
  type: AlertChannelType;
  config: any;
}

export interface TriggerAlertInput {
  ruleId: string;
  workflowId?: string;
  executionId?: string;
  severity: AlertSeverity;
  message: string;
  details?: any;
}

export interface AlertConditions {
  // Execution conditions
  executionStatus?: 'failed' | 'completed' | 'timeout';
  durationThreshold?: number; // ms
  errorRateThreshold?: number; // percentage
  successRateThreshold?: number; // percentage
  
  // Resource conditions
  cpuThreshold?: number; // percentage
  memoryThreshold?: number; // percentage
  
  // Cost conditions
  costThreshold?: number; // dollar amount
  
  // Time conditions
  timeWindow?: number; // seconds
  occurrences?: number; // number of occurrences within time window
}

export class AlertService {
  /**
   * Create a new alert rule
   */
  async createRule(input: AlertRuleInput): Promise<AlertRule> {
    // Verify channels exist and belong to organization
    const channels = await prisma.alertChannel.findMany({
      where: {
        id: { in: input.channelIds },
        organizationId: input.organizationId,
      },
    });

    if (channels.length !== input.channelIds.length) {
      throw new Error('One or more channels not found or do not belong to organization');
    }

    const rule = await prisma.alertRule.create({
      data: {
        name: input.name,
        description: input.description,
        enabled: input.enabled ?? true,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        triggerType: input.triggerType,
        conditions: input.conditions,
        evaluationInterval: input.evaluationInterval ?? 300,
        cooldownPeriod: input.cooldownPeriod ?? 900,
        channels: {
          create: input.channelIds.map(channelId => ({
            channelId,
          })),
        },
      },
      include: {
        channels: {
          include: {
            channel: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Update an alert rule
   */
  async updateRule(
    ruleId: string,
    organizationId: string,
    updates: Partial<AlertRuleInput>
  ): Promise<AlertRule> {
    // Verify rule exists and belongs to organization
    const existingRule = await prisma.alertRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!existingRule) {
      throw new Error('Alert rule not found');
    }

    // Handle channel updates if provided
    if (updates.channelIds) {
      // Verify channels
      const channels = await prisma.alertChannel.findMany({
        where: {
          id: { in: updates.channelIds },
          organizationId,
        },
      });

      if (channels.length !== updates.channelIds.length) {
        throw new Error('One or more channels not found');
      }

      // Delete old channel associations
      await prisma.alertRuleChannel.deleteMany({
        where: { ruleId },
      });

      // Create new associations
      await prisma.alertRuleChannel.createMany({
        data: updates.channelIds.map(channelId => ({
          ruleId,
          channelId,
        })),
      });
    }

    const rule = await prisma.alertRule.update({
      where: { id: ruleId },
      data: {
        name: updates.name,
        description: updates.description,
        enabled: updates.enabled,
        workflowId: updates.workflowId,
        triggerType: updates.triggerType,
        conditions: updates.conditions,
        evaluationInterval: updates.evaluationInterval,
        cooldownPeriod: updates.cooldownPeriod,
      },
      include: {
        channels: {
          include: {
            channel: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string, organizationId: string): Promise<void> {
    const rule = await prisma.alertRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new Error('Alert rule not found');
    }

    await prisma.alertRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Get alert rules for an organization
   */
  async getRules(organizationId: string, workflowId?: string): Promise<AlertRule[]> {
    return prisma.alertRule.findMany({
      where: {
        organizationId,
        ...(workflowId && { workflowId }),
      },
      include: {
        channels: {
          include: {
            channel: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create an alert channel
   */
  async createChannel(input: AlertChannelInput): Promise<AlertChannel> {
    // Validate channel configuration
    this.validateChannelConfig(input.type, input.config);

    const channel = await prisma.alertChannel.create({
      data: {
        name: input.name,
        description: input.description,
        enabled: input.enabled ?? true,
        organizationId: input.organizationId,
        type: input.type,
        config: input.config,
      },
    });

    return channel;
  }

  /**
   * Update an alert channel
   */
  async updateChannel(
    channelId: string,
    organizationId: string,
    updates: Partial<AlertChannelInput>
  ): Promise<AlertChannel> {
    const existingChannel = await prisma.alertChannel.findFirst({
      where: { id: channelId, organizationId },
    });

    if (!existingChannel) {
      throw new Error('Alert channel not found');
    }

    // Validate config if provided
    if (updates.config && updates.type) {
      this.validateChannelConfig(updates.type, updates.config);
    }

    const channel = await prisma.alertChannel.update({
      where: { id: channelId },
      data: {
        name: updates.name,
        description: updates.description,
        enabled: updates.enabled,
        type: updates.type,
        config: updates.config,
      },
    });

    return channel;
  }

  /**
   * Delete an alert channel
   */
  async deleteChannel(channelId: string, organizationId: string): Promise<void> {
    const channel = await prisma.alertChannel.findFirst({
      where: { id: channelId, organizationId },
    });

    if (!channel) {
      throw new Error('Alert channel not found');
    }

    await prisma.alertChannel.delete({
      where: { id: channelId },
    });
  }

  /**
   * Get alert channels for an organization
   */
  async getChannels(organizationId: string, type?: AlertChannelType): Promise<AlertChannel[]> {
    return prisma.alertChannel.findMany({
      where: {
        organizationId,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Test an alert channel
   */
  async testChannel(channelId: string, organizationId: string): Promise<boolean> {
    const channel = await prisma.alertChannel.findFirst({
      where: { id: channelId, organizationId },
    });

    if (!channel) {
      throw new Error('Alert channel not found');
    }

    try {
      await this.sendToChannel(channel, {
        severity: 'INFO',
        message: 'Test alert from Automation Platform',
        details: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      return true;
    } catch (error) {
      console.error('Channel test failed:', error);
      return false;
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(input: TriggerAlertInput): Promise<AlertHistory> {
    // Get rule with channels
    const rule = await prisma.alertRule.findUnique({
      where: { id: input.ruleId },
      include: {
        channels: {
          include: {
            channel: true,
          },
        },
      },
    });

    if (!rule || !rule.enabled) {
      throw new Error('Alert rule not found or disabled');
    }

    // Check cooldown period
    if (rule.lastTriggeredAt) {
      const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownPeriod * 1000);
      if (new Date() < cooldownEnd) {
        console.log(`Alert rule ${rule.id} is in cooldown period`);
        throw new Error('Alert rule is in cooldown period');
      }
    }

    // Send to all enabled channels
    const channelResults: any = {};
    for (const ruleChannel of rule.channels) {
      if (!ruleChannel.channel.enabled) continue;

      try {
        await this.sendToChannel(ruleChannel.channel, {
          severity: input.severity,
          message: input.message,
          details: {
            ...input.details,
            ruleName: rule.name,
            workflowId: input.workflowId,
            executionId: input.executionId,
          },
        });

        channelResults[ruleChannel.channelId] = {
          status: 'sent',
          timestamp: new Date().toISOString(),
        };

        // Update channel statistics
        await prisma.alertChannel.update({
          where: { id: ruleChannel.channelId },
          data: {
            lastUsedAt: new Date(),
            alertsSent: { increment: 1 },
          },
        });
      } catch (error) {
        console.error(`Failed to send alert to channel ${ruleChannel.channelId}:`, error);
        channelResults[ruleChannel.channelId] = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };

        // Update failure count
        await prisma.alertChannel.update({
          where: { id: ruleChannel.channelId },
          data: {
            alertsFailed: { increment: 1 },
          },
        });
      }
    }

    // Create alert history
    const alert = await prisma.alertHistory.create({
      data: {
        ruleId: input.ruleId,
        workflowId: input.workflowId,
        executionId: input.executionId,
        severity: input.severity,
        message: input.message,
        details: input.details,
        channelsSent: channelResults,
      },
    });

    // Update rule statistics
    await prisma.alertRule.update({
      where: { id: input.ruleId },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    });

    return alert;
  }

  /**
   * Evaluate alert rules for a workflow execution
   */
  async evaluateExecutionAlerts(
    workflowId: string,
    executionId: string,
    executionData: {
      status: string;
      duration: number;
      error?: string;
    }
  ): Promise<void> {
    // Get relevant alert rules
    const rules = await prisma.alertRule.findMany({
      where: {
        enabled: true,
        OR: [
          { workflowId },
          { workflowId: null }, // Organization-wide rules
        ],
      },
      include: {
        channels: {
          include: {
            channel: true,
          },
        },
      },
    });

    for (const rule of rules) {
      try {
        const shouldTrigger = await this.evaluateRule(rule, {
          workflowId,
          executionId,
          ...executionData,
        });

        if (shouldTrigger) {
          const severity = this.determineSeverity(rule.triggerType, executionData);
          const message = this.buildAlertMessage(rule, executionData);

          await this.triggerAlert({
            ruleId: rule.id,
            workflowId,
            executionId,
            severity,
            message,
            details: executionData,
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(
    organizationId: string,
    filters?: {
      ruleId?: string;
      workflowId?: string;
      severity?: AlertSeverity;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<AlertHistory[]> {
    return prisma.alertHistory.findMany({
      where: {
        rule: {
          organizationId,
        },
        ...(filters?.ruleId && { ruleId: filters.ruleId }),
        ...(filters?.workflowId && { workflowId: filters.workflowId }),
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.startDate && filters?.endDate && {
          triggeredAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      include: {
        rule: true,
      },
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<AlertHistory> {
    return prisma.alertHistory.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  // Private helper methods

  private validateChannelConfig(type: AlertChannelType, config: any): void {
    switch (type) {
      case 'EMAIL':
        if (!config.to || !Array.isArray(config.to) || config.to.length === 0) {
          throw new Error('Email channel requires "to" array with at least one email');
        }
        break;
      case 'SLACK':
        if (!config.webhookUrl) {
          throw new Error('Slack channel requires "webhookUrl"');
        }
        break;
      case 'WEBHOOK':
        if (!config.url) {
          throw new Error('Webhook channel requires "url"');
        }
        break;
    }
  }

  private async sendToChannel(
    channel: AlertChannel,
    alert: {
      severity: string;
      message: string;
      details?: any;
    }
  ): Promise<void> {
    switch (channel.type) {
      case 'EMAIL':
        await this.sendEmailAlert(channel.config, alert);
        break;
      case 'SLACK':
        await this.sendSlackAlert(channel.config, alert);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(channel.config, alert);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private async sendEmailAlert(
    config: any,
    alert: { severity: string; message: string; details?: any }
  ): Promise<void> {
    const transporter = nodemailer.createTransport(
      config.smtp || {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: config.smtp?.auth || {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    );

    const severityColors = {
      INFO: '#3b82f6',
      WARNING: '#f59e0b',
      ERROR: '#ef4444',
      CRITICAL: '#dc2626',
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: ${severityColors[alert.severity as keyof typeof severityColors] || '#3b82f6'};
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .content { 
              background: #f9fafb;
              padding: 20px;
              border-radius: 0 0 8px 8px;
            }
            .message { 
              background: white;
              padding: 15px;
              border-radius: 4px;
              margin: 10px 0;
            }
            .details {
              background: white;
              padding: 15px;
              border-radius: 4px;
              margin: 10px 0;
              font-size: 14px;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">${alert.severity} Alert</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Automation Platform</p>
            </div>
            <div class="content">
              <div class="message">
                <strong>Message:</strong><br/>
                ${alert.message}
              </div>
              ${alert.details ? `
                <div class="details">
                  <strong>Details:</strong><br/>
                  <pre style="margin: 10px 0; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
                </div>
              ` : ''}
              <div class="footer">
                Timestamp: ${new Date().toLocaleString()}<br/>
                This is an automated alert from your Automation Platform.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.from || process.env.SMTP_FROM || 'alerts@automation-platform.com',
      to: config.to,
      subject: `[${alert.severity}] ${alert.message}`,
      html,
    });
  }

  private async sendSlackAlert(
    config: any,
    alert: { severity: string; message: string; details?: any }
  ): Promise<void> {
    const severityColors = {
      INFO: '#3b82f6',
      WARNING: '#f59e0b',
      ERROR: '#ef4444',
      CRITICAL: '#dc2626',
    };

    const payload = {
      channel: config.channel,
      username: config.username || 'Automation Platform',
      icon_emoji: config.iconEmoji || ':robot_face:',
      attachments: [
        {
          color: severityColors[alert.severity as keyof typeof severityColors],
          title: `${alert.severity} Alert`,
          text: alert.message,
          fields: alert.details ? [
            {
              title: 'Details',
              value: '```' + JSON.stringify(alert.details, null, 2) + '```',
            },
          ] : [],
          footer: 'Automation Platform',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await axios.post(config.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async sendWebhookAlert(
    config: any,
    alert: { severity: string; message: string; details?: any }
  ): Promise<void> {
    const payload = {
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
      timestamp: new Date().toISOString(),
    };

    await axios({
      method: config.method || 'POST',
      url: config.url,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      data: payload,
    });
  }

  private async evaluateRule(
    rule: AlertRule,
    context: any
  ): Promise<boolean> {
    const conditions = rule.conditions as AlertConditions;

    switch (rule.triggerType) {
      case 'EXECUTION_FAILED':
        return context.status === 'failed';

      case 'EXECUTION_SLOW':
        return conditions.durationThreshold 
          ? context.duration > conditions.durationThreshold 
          : false;

      case 'ERROR_RATE_HIGH':
      case 'SUCCESS_RATE_LOW':
        // Would need to query recent execution history
        return false; // Implement based on your needs

      case 'SCHEDULE_MISSED':
        return context.scheduleMissed === true;

      case 'RESOURCE_LIMIT':
        return (
          (conditions.cpuThreshold && context.cpuUsage > conditions.cpuThreshold) ||
          (conditions.memoryThreshold && context.memoryUsage > conditions.memoryThreshold)
        );

      case 'COST_THRESHOLD':
        return conditions.costThreshold 
          ? context.cost > conditions.costThreshold 
          : false;

      default:
        return false;
    }
  }

  private determineSeverity(
    triggerType: AlertTriggerType,
    data: any
  ): AlertSeverity {
    switch (triggerType) {
      case 'EXECUTION_FAILED':
        return 'ERROR';
      case 'EXECUTION_SLOW':
        return 'WARNING';
      case 'ERROR_RATE_HIGH':
        return 'ERROR';
      case 'SUCCESS_RATE_LOW':
        return 'WARNING';
      case 'SCHEDULE_MISSED':
        return 'WARNING';
      case 'RESOURCE_LIMIT':
        return 'CRITICAL';
      case 'COST_THRESHOLD':
        return 'WARNING';
      default:
        return 'INFO';
    }
  }

  private buildAlertMessage(rule: AlertRule, data: any): string {
    const conditions = rule.conditions as AlertConditions;

    switch (rule.triggerType) {
      case 'EXECUTION_FAILED':
        return `Workflow execution failed: ${data.error || 'Unknown error'}`;
      case 'EXECUTION_SLOW':
        return `Workflow execution exceeded ${conditions.durationThreshold}ms (took ${data.duration}ms)`;
      case 'ERROR_RATE_HIGH':
        return `Error rate exceeded ${conditions.errorRateThreshold}%`;
      case 'SUCCESS_RATE_LOW':
        return `Success rate dropped below ${conditions.successRateThreshold}%`;
      case 'SCHEDULE_MISSED':
        return 'Scheduled workflow execution was missed';
      case 'RESOURCE_LIMIT':
        return `Resource limit exceeded: CPU ${data.cpuUsage}%, Memory ${data.memoryUsage}%`;
      case 'COST_THRESHOLD':
        return `Cost threshold exceeded: $${data.cost} (limit: $${conditions.costThreshold})`;
      default:
        return `Alert triggered for rule: ${rule.name}`;
    }
  }
}

export const alertService = new AlertService();
