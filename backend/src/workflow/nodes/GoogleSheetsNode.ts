import type { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

/**
 * Google Sheets Node
 * Supports reading, writing, updating, and appending data to Google Sheets
 * Uses Google Sheets API v4
 */
export const GoogleSheetsNode: INodeExecutor = {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const { operation, spreadsheetId, range, values, sheetName, connection, requests } = node.data.parameters;

    try {
      // Validate required parameters
      if (!operation) {
        throw new Error('Operation is required (read, append, update, clear, batchUpdate, createSheet)');
      }

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID is required');
      }

      if (!connection || !connection.clientEmail || !connection.privateKey) {
        throw new Error('Service account credentials are required');
      }

      // Import Google APIs
      const { google } = await import('googleapis');
      
      // Create JWT client
      const auth = new google.auth.JWT({
        email: connection.clientEmail,
        key: connection.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      let result: any;

      switch (operation) {
        case 'read': {
          if (!range) {
            throw new Error('Range is required for read operation (e.g., Sheet1!A1:D10)');
          }

          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
          });

          result = {
            rows: response.data.values || [],
            range: response.data.range,
            majorDimension: response.data.majorDimension,
          };
          break;
        }

        case 'append': {
          if (!range) {
            throw new Error('Range is required for append operation (e.g., Sheet1!A:D)');
          }

          if (!values || !Array.isArray(values)) {
            throw new Error('Values array is required for append operation');
          }

          const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values,
            },
          });

          result = {
            updatedCells: response.data.updates?.updatedCells,
            updatedRows: response.data.updates?.updatedRows,
            updatedRange: response.data.updates?.updatedRange,
          };
          break;
        }

        case 'update': {
          if (!range) {
            throw new Error('Range is required for update operation (e.g., Sheet1!A1:D5)');
          }

          if (!values || !Array.isArray(values)) {
            throw new Error('Values array is required for update operation');
          }

          const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values,
            },
          });

          result = {
            updatedCells: response.data.updatedCells,
            updatedRows: response.data.updatedRows,
            updatedRange: response.data.updatedRange,
          };
          break;
        }

        case 'clear': {
          if (!range) {
            throw new Error('Range is required for clear operation (e.g., Sheet1!A1:D10)');
          }

          const response = await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
          });

          result = {
            clearedRange: response.data.clearedRange,
          };
          break;
        }

        case 'batchUpdate': {
          const { data } = node.data.parameters;
          
          if (!data || !Array.isArray(data)) {
            throw new Error('Data array is required for batchUpdate operation');
          }

          const response = await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: data.map((item: any) => ({
                range: item.range,
                values: item.values,
              })),
            },
          });

          result = {
            totalUpdatedCells: response.data.totalUpdatedCells,
            totalUpdatedRows: response.data.totalUpdatedRows,
            responses: response.data.responses,
          };
          break;
        }

        case 'createSheet': {
          const { sheetTitle } = node.data.parameters;
          
          if (!sheetTitle) {
            throw new Error('Sheet title is required for createSheet operation');
          }

          const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: sheetTitle,
                  },
                },
              }],
            },
          });

          result = {
            sheetId: response.data.replies?.[0]?.addSheet?.properties?.sheetId,
            sheetTitle: response.data.replies?.[0]?.addSheet?.properties?.title,
          };
          break;
        }

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Google Sheets operation failed',
        duration: Date.now() - startTime,
      };
    }
  },

  validate(node: any): boolean | string {
    const { operation, spreadsheetId, range, values, sheetName, connection } = node.data.parameters;

    if (!connection || !connection.clientEmail || !connection.privateKey) {
      return 'Service account credentials (clientEmail, privateKey) are required';
    }

    if (!operation) {
      return 'Operation is required';
    }

    const validOperations = ['read', 'append', 'update', 'clear', 'batchUpdate', 'createSheet'];
    if (!validOperations.includes(operation)) {
      return `Operation must be one of: ${validOperations.join(', ')}`;
    }

    if (!spreadsheetId) {
      return 'Spreadsheet ID is required';
    }

    // Validate operation-specific parameters
    if (['read', 'append', 'update', 'clear'].includes(operation) && !range) {
      return `Range is required for ${operation} operation`;
    }

    if (['append', 'update'].includes(operation) && !values) {
      return `Values are required for ${operation} operation`;
    }

    if (operation === 'createSheet' && !sheetName) {
      return 'Sheet name is required for createSheet operation';
    }

    return true;
  },
};
