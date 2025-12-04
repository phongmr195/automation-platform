/**
 * Template Seeds
 * Pre-built workflow templates across different categories
 */

import { prisma } from '../src/lib/prisma';

const templates = [
  // ============================================
  // MARKETING AUTOMATION
  // ============================================
  {
    name: 'Email Campaign Automation',
    description: 'Automate email campaigns with conditional sending based on user engagement',
    category: 'marketing',
    tags: ['email', 'marketing', 'automation', 'campaign'],
    icon: '📧',
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    featured: true,
    nodes: [
      {
        id: 'node_1',
        name: 'Trigger - New Subscriber',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          service: 'webhook',
          parameters: {
            method: 'POST',
            path: '/webhook/new-subscriber',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Check Email Validity',
        type: 'condition',
        position: { x: 400, y: 100 },
        data: {
          service: 'condition',
          parameters: {
            operator: 'contains',
            field: '{{nodes.node_1.email}}',
            value: '@',
          },
        },
      },
      {
        id: 'node_3',
        name: 'Send Welcome Email',
        type: 'email',
        position: { x: 700, y: 50 },
        data: {
          service: 'email',
          parameters: {
            to: '{{nodes.node_1.email}}',
            subject: 'Welcome to Our Newsletter!',
            body: 'Thank you for subscribing. Here\'s what you can expect...',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Log to Database',
        type: 'database',
        position: { x: 1000, y: 100 },
        data: {
          service: 'database',
          parameters: {
            operation: 'insert',
            table: 'subscribers',
            data: '{"email": "{{nodes.node_1.email}}", "subscribed_at": "{{$now()}}"}',
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', sourceHandle: 'true', target: 'node_3' },
      { id: 'conn_3', source: 'node_3', target: 'node_4' },
    ],
    triggers: [{ type: 'webhook', config: { method: 'POST', path: '/new-subscriber' } }],
    requiredParams: {
      node_3: ['connection', 'to', 'subject', 'body'],
      node_4: ['connection', 'table'],
    },
    version: '1.0.0',
  },

  // ============================================
  // DATA SYNCHRONIZATION
  // ============================================
  {
    name: 'Google Sheets to Database Sync',
    description: 'Automatically sync data from Google Sheets to your database every hour',
    category: 'data-sync',
    tags: ['google-sheets', 'database', 'sync', 'automation'],
    icon: '🔄',
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    featured: true,
    nodes: [
      {
        id: 'node_1',
        name: 'Read Google Sheets',
        type: 'google-sheets',
        position: { x: 100, y: 100 },
        data: {
          service: 'google-sheets',
          parameters: {
            operation: 'read',
            spreadsheetId: '',
            range: 'Sheet1!A1:Z1000',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Transform Data',
        type: 'transform',
        position: { x: 400, y: 100 },
        data: {
          service: 'transform',
          parameters: {
            code: 'return { rows: data.values.map(row => ({ name: row[0], email: row[1], status: row[2] })) };',
          },
        },
      },
      {
        id: 'node_3',
        name: 'Loop Through Rows',
        type: 'loop',
        position: { x: 700, y: 100 },
        data: {
          service: 'loop',
          parameters: {
            items: '{{nodes.node_2.rows}}',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Upsert to Database',
        type: 'database',
        position: { x: 1000, y: 100 },
        data: {
          service: 'database',
          parameters: {
            operation: 'upsert',
            table: 'users',
            data: '{{nodes.node_3.item}}',
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', target: 'node_3' },
      { id: 'conn_3', source: 'node_3', target: 'node_4' },
    ],
    triggers: [{ type: 'schedule', config: { cron: '0 * * * *' } }],
    requiredParams: {
      node_1: ['connection', 'spreadsheetId'],
      node_4: ['connection', 'table'],
    },
    version: '1.0.0',
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  {
    name: 'Multi-Channel Alert System',
    description: 'Send alerts via Slack, Discord, and Telegram simultaneously when critical events occur',
    category: 'notifications',
    tags: ['alerts', 'slack', 'discord', 'telegram', 'notifications'],
    icon: '🔔',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    featured: true,
    nodes: [
      {
        id: 'node_1',
        name: 'Trigger - API Webhook',
        type: 'webhook',
        position: { x: 100, y: 200 },
        data: {
          service: 'webhook',
          parameters: {
            method: 'POST',
            path: '/alert',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Format Message',
        type: 'transform',
        position: { x: 400, y: 200 },
        data: {
          service: 'transform',
          parameters: {
            code: 'return { message: `🚨 ALERT: ${data.title}\\n\\n${data.description}\\n\\nSeverity: ${data.severity}\\nTimestamp: ${new Date().toISOString()}` };',
          },
        },
      },
      {
        id: 'node_3',
        name: 'Send to Slack',
        type: 'slack',
        position: { x: 700, y: 100 },
        data: {
          service: 'slack',
          parameters: {
            channel: '#alerts',
            text: '{{nodes.node_2.message}}',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Send to Discord',
        type: 'discord',
        position: { x: 700, y: 200 },
        data: {
          service: 'discord',
          parameters: {
            content: '{{nodes.node_2.message}}',
          },
        },
      },
      {
        id: 'node_5',
        name: 'Send to Telegram',
        type: 'telegram-send',
        position: { x: 700, y: 300 },
        data: {
          service: 'telegram-send',
          parameters: {
            message: '{{nodes.node_2.message}}',
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', target: 'node_3' },
      { id: 'conn_3', source: 'node_2', target: 'node_4' },
      { id: 'conn_4', source: 'node_2', target: 'node_5' },
    ],
    triggers: [{ type: 'webhook', config: { method: 'POST', path: '/alert' } }],
    requiredParams: {
      node_3: ['connection', 'channel'],
      node_4: ['connection'],
      node_5: ['botToken', 'chatId'],
    },
    version: '1.0.0',
  },

  // ============================================
  // ETL PIPELINES
  // ============================================
  {
    name: 'API to Data Warehouse ETL',
    description: 'Extract data from API, transform it, and load into your data warehouse',
    category: 'etl',
    tags: ['etl', 'api', 'data-warehouse', 'transform'],
    icon: '⚙️',
    difficulty: 'advanced',
    estimatedTime: '30 minutes',
    featured: false,
    nodes: [
      {
        id: 'node_1',
        name: 'Extract - Fetch API Data',
        type: 'http-request',
        position: { x: 100, y: 100 },
        data: {
          service: 'http-request',
          parameters: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: '{"Authorization": "Bearer YOUR_TOKEN"}',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Transform - Clean Data',
        type: 'transform',
        position: { x: 400, y: 100 },
        data: {
          service: 'transform',
          parameters: {
            code: `
              return {
                records: data.items.map(item => ({
                  id: item.id,
                  name: item.name.trim(),
                  email: item.email.toLowerCase(),
                  created_at: new Date(item.timestamp).toISOString(),
                  status: item.active ? 'active' : 'inactive'
                }))
              };
            `,
          },
        },
      },
      {
        id: 'node_3',
        name: 'Load - Insert to Warehouse',
        type: 'database',
        position: { x: 700, y: 100 },
        data: {
          service: 'database',
          parameters: {
            operation: 'insertMany',
            table: 'staging_users',
            data: '{{nodes.node_2.records}}',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Notify Completion',
        type: 'slack',
        position: { x: 1000, y: 100 },
        data: {
          service: 'slack',
          parameters: {
            channel: '#data-ops',
            text: '✅ ETL Pipeline completed: {{nodes.node_3.affectedRows}} records loaded',
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', target: 'node_3' },
      { id: 'conn_3', source: 'node_3', target: 'node_4' },
    ],
    triggers: [{ type: 'schedule', config: { cron: '0 0 * * *' } }],
    requiredParams: {
      node_1: ['url'],
      node_3: ['connection', 'table'],
      node_4: ['connection', 'channel'],
    },
    version: '1.0.0',
  },

  // ============================================
  // API INTEGRATIONS
  // ============================================
  {
    name: 'REST API to GraphQL Proxy',
    description: 'Convert REST API responses to GraphQL format with caching',
    category: 'api-integration',
    tags: ['api', 'graphql', 'rest', 'proxy', 'cache'],
    icon: '🔌',
    difficulty: 'advanced',
    estimatedTime: '20 minutes',
    featured: false,
    nodes: [
      {
        id: 'node_1',
        name: 'Incoming Request',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          service: 'webhook',
          parameters: {
            method: 'POST',
            path: '/graphql',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Check Cache',
        type: 'redis',
        position: { x: 400, y: 100 },
        data: {
          service: 'redis',
          parameters: {
            operation: 'get',
            key: '{{nodes.node_1.query}}',
          },
        },
      },
      {
        id: 'node_3',
        name: 'Cache Hit?',
        type: 'condition',
        position: { x: 700, y: 100 },
        data: {
          service: 'condition',
          parameters: {
            operator: 'isNotNull',
            field: '{{nodes.node_2.value}}',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Fetch from API',
        type: 'http-request',
        position: { x: 1000, y: 50 },
        data: {
          service: 'http-request',
          parameters: {
            url: 'https://api.example.com/v1/data',
            method: 'GET',
          },
        },
      },
      {
        id: 'node_5',
        name: 'Transform to GraphQL',
        type: 'transform',
        position: { x: 1300, y: 50 },
        data: {
          service: 'transform',
          parameters: {
            code: 'return { data: { users: data.items } };',
          },
        },
      },
      {
        id: 'node_6',
        name: 'Cache Result',
        type: 'redis',
        position: { x: 1600, y: 50 },
        data: {
          service: 'redis',
          parameters: {
            operation: 'set',
            key: '{{nodes.node_1.query}}',
            value: '{{nodes.node_5.data}}',
            ttl: 3600,
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', target: 'node_3' },
      { id: 'conn_3', source: 'node_3', sourceHandle: 'false', target: 'node_4' },
      { id: 'conn_4', source: 'node_4', target: 'node_5' },
      { id: 'conn_5', source: 'node_5', target: 'node_6' },
    ],
    triggers: [{ type: 'webhook', config: { method: 'POST', path: '/graphql' } }],
    requiredParams: {
      node_2: ['connection'],
      node_4: ['url'],
      node_6: ['connection'],
    },
    version: '1.0.0',
  },

  // ============================================
  // SOCIAL MEDIA
  // ============================================
  {
    name: 'Social Media Content Scheduler',
    description: 'Schedule and post content across multiple social media platforms',
    category: 'social-media',
    tags: ['social-media', 'scheduling', 'content', 'automation'],
    icon: '📱',
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    featured: true,
    nodes: [
      {
        id: 'node_1',
        name: 'Get Scheduled Posts',
        type: 'database',
        position: { x: 100, y: 100 },
        data: {
          service: 'database',
          parameters: {
            operation: 'select',
            table: 'scheduled_posts',
            query: 'SELECT * FROM scheduled_posts WHERE scheduled_at <= NOW() AND posted = false',
          },
        },
      },
      {
        id: 'node_2',
        name: 'Loop Posts',
        type: 'loop',
        position: { x: 400, y: 100 },
        data: {
          service: 'loop',
          parameters: {
            items: '{{nodes.node_1.rows}}',
          },
        },
      },
      {
        id: 'node_3',
        name: 'Check Platform',
        type: 'condition',
        position: { x: 700, y: 100 },
        data: {
          service: 'condition',
          parameters: {
            operator: 'equals',
            field: '{{nodes.node_2.item.platform}}',
            value: 'slack',
          },
        },
      },
      {
        id: 'node_4',
        name: 'Post to Slack',
        type: 'slack',
        position: { x: 1000, y: 50 },
        data: {
          service: 'slack',
          parameters: {
            channel: '{{nodes.node_2.item.channel}}',
            text: '{{nodes.node_2.item.content}}',
          },
        },
      },
      {
        id: 'node_5',
        name: 'Mark as Posted',
        type: 'database',
        position: { x: 1300, y: 100 },
        data: {
          service: 'database',
          parameters: {
            operation: 'update',
            table: 'scheduled_posts',
            data: '{"posted": true, "posted_at": "{{$now()}}"}',
            where: '{"id": "{{nodes.node_2.item.id}}"}',
          },
        },
      },
    ],
    connections: [
      { id: 'conn_1', source: 'node_1', target: 'node_2' },
      { id: 'conn_2', source: 'node_2', target: 'node_3' },
      { id: 'conn_3', source: 'node_3', sourceHandle: 'true', target: 'node_4' },
      { id: 'conn_4', source: 'node_4', target: 'node_5' },
    ],
    triggers: [{ type: 'schedule', config: { cron: '*/15 * * * *' } }],
    requiredParams: {
      node_1: ['connection'],
      node_4: ['connection'],
      node_5: ['connection'],
    },
    version: '1.0.0',
  },
];

export async function seedTemplates() {
  console.log('Seeding templates...');

  for (const template of templates) {
    try {
      const existing = await prisma.workflowTemplate.findFirst({
        where: { name: template.name },
      });

      if (existing) {
        console.log(`Template "${template.name}" already exists, skipping...`);
        continue;
      }

      await prisma.workflowTemplate.create({
        data: template,
      });

      console.log(`✅ Created template: ${template.name}`);
    } catch (error) {
      console.error(`Error creating template "${template.name}":`, error);
    }
  }

  console.log('Template seeding completed!');
}

// Run if executed directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
