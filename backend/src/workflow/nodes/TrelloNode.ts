import type { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import axios from 'axios';

/**
 * Trello Node
 * Supports board, list, and card operations
 * Uses Trello REST API v1
 */
export const TrelloNode: INodeExecutor = {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const { 
      operation, 
      connection,
      boardId, 
      listId, 
      cardId,
      name,
      desc,
      pos,
      text,
      due
    } = node.data.parameters;

    try {
      // Validate required parameters
      if (!operation) {
        throw new Error('Operation is required');
      }

      if (!connection || !connection.apiKey || !connection.token) {
        throw new Error('Trello API key and token are required');
      }

      const apiKey = connection.apiKey;
      const apiToken = connection.token;
      // Validate required parameters
      if (!operation) {
        throw new Error('Operation is required');
      }

      if (!apiKey || !apiToken) {
        throw new Error('API key and token are required');
      }

      const baseURL = 'https://api.trello.com/1';
      const authParams = `key=${apiKey}&token=${apiToken}`;

      let result: any;

      switch (operation) {
        case 'getBoard': {
          if (!boardId) {
            throw new Error('Board ID is required for getBoard operation');
          }

          const response = await axios.get(
            `${baseURL}/boards/${boardId}?${authParams}`
          );

          result = response.data;
          break;
        }

        case 'getLists': {
          if (!boardId) {
            throw new Error('Board ID is required for getLists operation');
          }

          const response = await axios.get(
            `${baseURL}/boards/${boardId}/lists?${authParams}`
          );

          result = { lists: response.data };
          break;
        }

        case 'createList': {
          if (!boardId) {
            throw new Error('Board ID is required for createList operation');
          }

          if (!name) {
            throw new Error('List name is required for createList operation');
          }

          const response = await axios.post(
            `${baseURL}/lists?${authParams}`,
            {
              name,
              idBoard: boardId,
              pos: pos || 'bottom',
            }
          );

          result = response.data;
          break;
        }

        case 'getCards': {
          if (!listId) {
            throw new Error('List ID is required for getCards operation');
          }

          const response = await axios.get(
            `${baseURL}/lists/${listId}/cards?${authParams}`
          );

          result = { cards: response.data };
          break;
        }

        case 'createCard': {
          if (!listId) {
            throw new Error('List ID is required for createCard operation');
          }

          if (!name) {
            throw new Error('Card name is required for createCard operation');
          }

          const cardData: any = {
            name,
            idList: listId,
          };

          if (desc) cardData.desc = desc;
          if (pos) cardData.pos = pos;
          if (due) cardData.due = due;

          const response = await axios.post(
            `${baseURL}/cards?${authParams}`,
            cardData
          );

          result = response.data;
          break;
        }

        case 'updateCard': {
          if (!cardId) {
            throw new Error('Card ID is required for updateCard operation');
          }

          const updateData: any = {};
          if (name) updateData.name = name;
          if (desc !== undefined) updateData.desc = desc;
          if (listId) updateData.idList = listId;
          if (pos) updateData.pos = pos;
          if (due) updateData.due = due;

          const response = await axios.put(
            `${baseURL}/cards/${cardId}?${authParams}`,
            updateData
          );

          result = response.data;
          break;
        }

        case 'getCard': {
          if (!cardId) {
            throw new Error('Card ID is required for getCard operation');
          }

          const response = await axios.get(
            `${baseURL}/cards/${cardId}?${authParams}`
          );

          result = response.data;
          break;
        }

        case 'deleteCard': {
          if (!cardId) {
            throw new Error('Card ID is required for deleteCard operation');
          }

          await axios.delete(
            `${baseURL}/cards/${cardId}?${authParams}`
          );

          result = { success: true, cardId };
          break;
        }

        case 'addComment': {
          if (!cardId) {
            throw new Error('Card ID is required for addComment operation');
          }

          const { text } = node.data.parameters;
          
          if (!text) {
            throw new Error('Comment text is required for addComment operation');
          }

          const response = await axios.post(
            `${baseURL}/cards/${cardId}/actions/comments?${authParams}`,
            { text }
          );

          result = response.data;
          break;
        }

        case 'addCheckli st': {
          if (!cardId) {
            throw new Error('Card ID is required for addChecklist operation');
          }

          const { checklistName } = node.data.parameters;
          
          if (!checklistName) {
            throw new Error('Checklist name is required for addChecklist operation');
          }

          const response = await axios.post(
            `${baseURL}/checklists?${authParams}`,
            {
              idCard: cardId,
              name: checklistName,
            }
          );

          result = response.data;
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
        error: error.response?.data?.message || error.message || 'Trello operation failed',
        duration: Date.now() - startTime,
      };
    }
  },

  validate(node: any): boolean | string {
    const { operation, connection, boardId, listId, cardId, name, text } = node.data.parameters;

    if (!connection || !connection.apiKey || !connection.token) {
      return 'Trello API key and token are required';
    }

    if (!operation) {
      return 'Operation is required';
    }

    const validOperations = [
      'getBoard', 'getLists', 'createList', 'getCards', 
      'createCard', 'updateCard', 'getCard', 'deleteCard',
      'addComment', 'addChecklist'
    ];
    
    if (!validOperations.includes(operation)) {
      return `Operation must be one of: ${validOperations.join(', ')}`;
    }

    // Validate operation-specific parameters
    if (['getBoard', 'getLists', 'createList'].includes(operation) && !boardId) {
      return `Board ID is required for ${operation} operation`;
    }

    if (operation === 'createList' && (!boardId || !name)) {
      return 'Board ID and name are required for createList operation';
    }

    if (['getCards', 'createCard'].includes(operation) && !listId) {
      return `List ID is required for ${operation} operation`;
    }

    if (operation === 'createCard' && (!listId || !name)) {
      return 'List ID and name are required for createCard operation';
    }

    if (['updateCard', 'getCard', 'deleteCard'].includes(operation) && !cardId) {
      return `Card ID is required for ${operation} operation`;
    }

    if (operation === 'addComment' && (!cardId || !text)) {
      return 'Card ID and comment text are required for addComment operation';
    }

    if (operation === 'addChecklist' && (!cardId || !name)) {
      return 'Card ID and checklist name are required for addChecklist operation';
    }

    return true;
  },
};
