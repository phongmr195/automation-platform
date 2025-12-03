/**
 * Football Results Node
 * Fetches football match results from API
 */

import { INodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from '../types';
import { FootballService } from '../../services/footballService';

export class FootballResultsExecutor implements INodeExecutor {
  private footballService: FootballService;

  constructor() {
    this.footballService = new FootballService();
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { operation = 'yesterday', date, league } = node.data.parameters;

      let results;
      
      switch (operation) {
        case 'yesterday':
          results = await this.footballService.getYesterdayResults();
          break;
        case 'specific-date':
          if (!date) {
            throw new Error('Date is required for specific-date operation');
          }
          results = await this.footballService.getYesterdayResults(); // TODO: add getResultsByDate
          break;
        case 'league':
          if (!league) {
            throw new Error('League is required for league operation');
          }
          // TODO: add getLeagueResults
          results = await this.footballService.getYesterdayResults();
          break;
        default:
          results = await this.footballService.getYesterdayResults();
      }

      return {
        success: true,
        output: {
          operation,
          results,
          timestamp: new Date().toISOString(),
        },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Football results fetch failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: WorkflowNode): boolean | string {
    const { operation } = node.data.parameters;
    
    if (operation && !['yesterday', 'specific-date', 'league'].includes(operation)) {
      return 'Operation must be yesterday, specific-date, or league';
    }
    
    return true;
  }
}
