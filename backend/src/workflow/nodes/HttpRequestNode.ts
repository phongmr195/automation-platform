/**
 * HTTP Request Node
 * Makes HTTP requests to external APIs
 */

import axios from 'axios';
import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';

export class HttpRequestExecutor implements INodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { url, method = 'GET', headers = {}, body, params } = node.data.parameters;

      // Replace variables in URL
      const processedUrl = this.replaceVariables(url, context);
      
      const response = await axios({
        method,
        url: processedUrl,
        headers,
        data: body,
        params,
        timeout: 30000,
      });

      return {
        success: true,
        output: {
          status: response.status,
          headers: response.headers,
          data: response.data,
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `HTTP request failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const { url, method } = node.data.parameters;
    
    if (!url) {
      return 'URL is required';
    }
    
    if (method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return 'Invalid HTTP method';
    }
    
    return true;
  }

  private replaceVariables(text: string, context: ExecutionContext): string {
    // Replace {{nodeId.field}} with actual values
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const [nodeId, ...fields] = path.split('.');
      const nodeData = context.nodeData.get(nodeId);
      
      if (!nodeData) {
        return match; // Keep original if not found
      }
      
      let value = nodeData;
      for (const field of fields) {
        value = value?.[field];
      }
      
      return value !== undefined ? String(value) : match;
    });
  }
}
