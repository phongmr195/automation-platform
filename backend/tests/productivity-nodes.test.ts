/**
 * Productivity Nodes Test
 * Test all productivity node implementations
 */

import { describe, test, expect } from '@jest/globals';
import { 
  GoogleSheetsNode,
  NotionNode,
  TrelloNode
} from '../src/workflow/nodes';

describe('Productivity Nodes', () => {
  describe('GoogleSheetsNode', () => {
    const node = GoogleSheetsNode;

    test('should validate GoogleSheets node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            spreadsheetId: 'abc123',
            operation: 'read',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Service account credentials');
    });

    test('should validate GoogleSheets node with missing spreadsheetId', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: 'test-key',
            },
            operation: 'read',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Spreadsheet ID is required');
    });

    test('should validate read operation without range', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: 'test-key',
            },
            spreadsheetId: 'abc123',
            operation: 'read',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Range is required');
    });

    test('should validate append operation without values', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: 'test-key',
            },
            spreadsheetId: 'abc123',
            operation: 'append',
            range: 'Sheet1!A1',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Values are required');
    });

    test('should validate createSheet operation without sheetName', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: 'test-key',
            },
            spreadsheetId: 'abc123',
            operation: 'createSheet',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Sheet name is required');
    });

    test('should pass validation with valid read operation', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            },
            spreadsheetId: '1abc123xyz',
            operation: 'read',
            range: 'Sheet1!A1:D10',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });

    test('should pass validation with valid append operation', () => {
      const workflowNode: any = {
        id: 'test-sheets',
        type: 'google-sheets',
        data: {
          parameters: {
            connection: {
              clientEmail: 'test@example.iam.gserviceaccount.com',
              privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            },
            spreadsheetId: '1abc123xyz',
            operation: 'append',
            range: 'Sheet1!A1',
            values: [['Name', 'Email'], ['John', 'john@example.com']],
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });

  describe('NotionNode', () => {
    const node = NotionNode;

    test('should validate Notion node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            operation: 'queryDatabase',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Notion token is required');
    });

    test('should validate queryDatabase without databaseId', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_test123',
            },
            operation: 'queryDatabase',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Database ID is required');
    });

    test('should validate createPage without databaseId and properties', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_test123',
            },
            operation: 'createPage',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Database ID and properties are required');
    });

    test('should validate updatePage without pageId', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_test123',
            },
            operation: 'updatePage',
            properties: { Name: { title: [{ text: { content: 'Test' } }] } },
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Page ID is required');
    });

    test('should validate appendBlock without blockId and children', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_test123',
            },
            operation: 'appendBlock',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Block ID and children are required');
    });

    test('should validate search without query', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_test123',
            },
            operation: 'search',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Search query is required');
    });

    test('should pass validation with valid queryDatabase', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_abc123xyz',
            },
            operation: 'queryDatabase',
            databaseId: 'db-123',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });

    test('should pass validation with valid createPage', () => {
      const workflowNode: any = {
        id: 'test-notion',
        type: 'notion',
        data: {
          parameters: {
            connection: {
              token: 'secret_abc123xyz',
            },
            operation: 'createPage',
            databaseId: 'db-123',
            properties: {
              Name: { title: [{ text: { content: 'New Page' } }] },
            },
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });

  describe('TrelloNode', () => {
    const node = TrelloNode;

    test('should validate Trello node with missing connection', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            operation: 'getBoard',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Trello API key and token');
    });

    test('should validate getBoard without boardId', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'getBoard',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Board ID is required');
    });

    test('should validate createList without boardId and name', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'createList',
            boardId: 'board123', // Provide boardId to test name validation
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Board ID and name are required');
    });

    test('should validate createCard without listId and name', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'createCard',
            listId: 'list123', // Provide listId to test name validation
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('List ID and name are required');
    });

    test('should validate updateCard without cardId', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'updateCard',
            name: 'Updated Name',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Card ID is required');
    });

    test('should validate addComment without cardId and text', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'addComment',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Card ID and comment text are required');
    });

    test('should validate addChecklist without cardId and name', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'test-key',
              token: 'test-token',
            },
            operation: 'addChecklist',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toContain('Card ID and checklist name are required');
    });

    test('should pass validation with valid getBoard', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'abc123key',
              token: 'xyz789token',
            },
            operation: 'getBoard',
            boardId: 'board123',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });

    test('should pass validation with valid createCard', () => {
      const workflowNode: any = {
        id: 'test-trello',
        type: 'trello',
        data: {
          parameters: {
            connection: {
              apiKey: 'abc123key',
              token: 'xyz789token',
            },
            operation: 'createCard',
            listId: 'list123',
            name: 'New Task',
            desc: 'Task description',
          },
        },
      };

      const result = node.validate(workflowNode);
      expect(result).toBe(true);
    });
  });
});
