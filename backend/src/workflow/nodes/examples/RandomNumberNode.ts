/**
 * Example Custom Node: Random Number Generator
 * Demonstrates how to create a simple custom node using the SDK
 */

import { CustomNodeBase, NodeProperty, NodeExecutionContext, NodeExecutionResult, NodeHelpers } from '../../CustomNodeSDK';

export class RandomNumberNode extends CustomNodeBase {
  name = 'randomNumber';
  version = 1;
  displayName = 'Random Number';
  description = 'Generates a random number within a specified range';
  group = ['transform'];
  color = '#4CAF50';
  icon = 'fa:random';
  
  properties: NodeProperty[] = [
    NodeHelpers.numberProperty('min', 'Minimum Value', true, 0),
    NodeHelpers.numberProperty('max', 'Maximum Value', true, 100),
    NodeHelpers.booleanProperty('integer', 'Integer Only', true),
    NodeHelpers.numberProperty('count', 'Count', false, 1, 1, 1000),
  ];
  
  documentation = {
    description: 'Generates random numbers within a specified range. Can generate single or multiple values.',
    usage: 'Configure the minimum and maximum values, choose whether to generate integers or decimals, and set the count.',
    examples: [
      {
        description: 'Generate a single random integer between 1 and 100',
        config: {
          min: 1,
          max: 100,
          integer: true,
          count: 1
        },
        output: { value: 42 }
      },
      {
        description: 'Generate 5 random decimals between 0 and 1',
        config: {
          min: 0,
          max: 1,
          integer: false,
          count: 5
        },
        output: {
          values: [0.234, 0.789, 0.456, 0.123, 0.901]
        }
      }
    ],
    notes: [
      'The maximum value must be greater than the minimum value',
      'Integer mode will round to the nearest whole number',
      'Count determines how many random numbers to generate'
    ]
  };
  
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const config = context.nodes[context.nodeId]?.config || {};
      const min = Number(config.min ?? 0);
      const max = Number(config.max ?? 100);
      const integer = Boolean(config.integer ?? true);
      const count = Number(config.count ?? 1);
      
      if (min >= max) {
        return this.createError('Minimum value must be less than maximum value');
      }
      
      if (count < 1 || count > 1000) {
        return this.createError('Count must be between 1 and 1000');
      }
      
      context.logger.info(`Generating ${count} random number(s) between ${min} and ${max}`);
      
      const generateRandom = () => {
        const value = Math.random() * (max - min) + min;
        return integer ? Math.round(value) : value;
      };
      
      if (count === 1) {
        return this.createSuccess({ value: generateRandom() });
      } else {
        const values = Array.from({ length: count }, generateRandom);
        return this.createSuccess({ values, count: values.length });
      }
    } catch (error: any) {
      context.logger.error('Random number generation failed', { error: error.message });
      return this.createError(error.message);
    }
  }
}

export default RandomNumberNode;
