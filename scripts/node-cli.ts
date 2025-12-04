#!/usr/bin/env node

/**
 * Custom Node CLI
 * Command-line tool for scaffolding, testing, and publishing custom nodes
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const program = new Command();

// Helper to prompt user input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Template for a new custom node
const nodeTemplate = (name: string, displayName: string, description: string, category: string) => `/**
 * ${displayName}
 * ${description}
 */

import { CustomNodeBase, NodeProperty, NodeExecutionContext, NodeExecutionResult, NodeHelpers } from '../CustomNodeSDK';

export class ${toPascalCase(name)}Node extends CustomNodeBase {
  name = '${name}';
  version = 1;
  displayName = '${displayName}';
  description = '${description}';
  group = ['${category}'];
  color = '#4CAF50';
  icon = 'fa:cube';
  
  properties: NodeProperty[] = [
    NodeHelpers.textProperty('input', 'Input', true, ''),
    // Add more properties here
  ];
  
  documentation = {
    description: '${description}',
    usage: 'Configure the properties and execute the node.',
    examples: [
      {
        description: 'Example usage',
        config: {
          input: 'example value'
        },
        output: { result: 'example output' }
      }
    ],
    notes: [
      'Add helpful notes here'
    ]
  };
  
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const config = context.nodes[context.nodeId]?.config || {};
      const input = config.input;
      
      if (!input) {
        return this.createError('Input is required');
      }
      
      context.logger.info(\`Processing input: \${input}\`);
      
      // TODO: Implement your node logic here
      const result = {
        input,
        processed: true,
        timestamp: new Date().toISOString()
      };
      
      return this.createSuccess(result);
    } catch (error: any) {
      context.logger.error('Node execution failed', { error: error.message });
      return this.createError(error.message);
    }
  }
}

export default ${toPascalCase(name)}Node;
`;

// Test template
const testTemplate = (name: string) => `/**
 * Tests for ${name} node
 */

import { ${toPascalCase(name)}Node } from './${name}';
import { NodeExecutionContext } from '../CustomNodeSDK';

describe('${toPascalCase(name)}Node', () => {
  let node: ${toPascalCase(name)}Node;
  
  beforeEach(() => {
    node = new ${toPascalCase(name)}Node();
  });
  
  it('should have correct metadata', () => {
    expect(node.name).toBe('${name}');
    expect(node.displayName).toBeDefined();
    expect(node.description).toBeDefined();
    expect(node.properties).toBeDefined();
  });
  
  it('should validate configuration', () => {
    const validConfig = {
      input: 'test value'
    };
    
    const result = node.validate(validConfig);
    expect(result.valid).toBe(true);
  });
  
  it('should execute successfully', async () => {
    const context: NodeExecutionContext = {
      nodeId: 'test-node',
      workflowId: 'test-workflow',
      executionId: 'test-execution',
      nodes: {
        'test-node': {
          config: {
            input: 'test value'
          }
        }
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      helpers: {} as any
    };
    
    const result = await node.execute(context);
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });
});
`;

// Package.json template
const packageJsonTemplate = (name: string, description: string, author: string) => `{
  "name": "@automation-platform/${name}",
  "version": "1.0.0",
  "description": "${description}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "keywords": ["automation-platform", "custom-node", "${name}"],
  "author": "${author}",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
`;

const tsconfigTemplate = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`;

const readmeTemplate = (name: string, displayName: string, description: string) => `# ${displayName}

${description}

## Installation

\`\`\`bash
npm install @automation-platform/${name}
\`\`\`

## Usage

This custom node can be used in Automation Platform workflows.

### Properties

- **Input**: The input value to process

### Example

\`\`\`json
{
  "input": "example value"
}
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
\`\`\`

## License

MIT
`;

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Commands

program
  .name('node-cli')
  .description('CLI tool for developing custom nodes')
  .version('1.0.0');

program
  .command('create <name>')
  .description('Create a new custom node')
  .option('-d, --description <description>', 'Node description')
  .option('-c, --category <category>', 'Node category')
  .option('-a, --author <author>', 'Author name')
  .action(async (name: string, options: any) => {
    console.log('\x1b[34mCreating custom node...\x1b[0m');
    
    const displayName = await prompt('Display name: ') || toPascalCase(name);
    const description = options.description || await prompt('Description: ') || 'A custom node';
    const category = options.category || await prompt('Category (e.g., transform, communication): ') || 'transform';
    const author = options.author || await prompt('Author: ') || 'Anonymous';
    
    const nodeDir = path.join(process.cwd(), name);
    
    if (fs.existsSync(nodeDir)) {
      console.log('\x1b[31mDirectory ' + name + ' already exists!\x1b[0m');
      process.exit(1);
    }
    
    // Create directory structure
    fs.mkdirSync(nodeDir);
    fs.mkdirSync(path.join(nodeDir, 'src'));
    fs.mkdirSync(path.join(nodeDir, 'tests'));
    
    // Write files
    fs.writeFileSync(
      path.join(nodeDir, 'src', `${name}.ts`),
      nodeTemplate(name, displayName, description, category)
    );
    
    fs.writeFileSync(
      path.join(nodeDir, 'tests', `${name}.test.ts`),
      testTemplate(name)
    );
    
    fs.writeFileSync(
      path.join(nodeDir, 'package.json'),
      packageJsonTemplate(name, description, author)
    );
    
    fs.writeFileSync(
      path.join(nodeDir, 'tsconfig.json'),
      tsconfigTemplate
    );
    
    fs.writeFileSync(
      path.join(nodeDir, 'README.md'),
      readmeTemplate(name, displayName, description)
    );
    
    fs.writeFileSync(
      path.join(nodeDir, '.gitignore'),
      'node_modules/\\ndist/\\n*.log\\n'
    );
    
    console.log('\x1b[32m✓ Custom node \'' + name + '\' created successfully!\x1b[0m');
    console.log('\x1b[90m\nNext steps:\x1b[0m');
    console.log('\x1b[90m  cd ' + name + '\x1b[0m');
    console.log('\x1b[90m  npm install\x1b[0m');
    console.log('\x1b[90m  npm run build\x1b[0m');
    console.log('\x1b[90m  npm test\x1b[0m');
  });

program
  .command('validate <path>')
  .description('Validate a custom node')
  .action((nodePath: string) => {
    console.log('\x1b[34mValidating custom node...\x1b[0m');
    
    const fullPath = path.resolve(nodePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log('\x1b[31mFile not found: ' + fullPath + '\x1b[0m');
      process.exit(1);
    }
    
    try {
      const code = fs.readFileSync(fullPath, 'utf-8');
      
      // Basic validation
      const hasClass = /class\s+\w+Node\s+extends\s+CustomNodeBase/.test(code);
      const hasExecute = /async\s+execute\s*\(/.test(code);
      const hasProperties = /properties:\s*NodeProperty\[\]/.test(code);
      
      if (!hasClass) {
        console.log('\x1b[31m✗ Node must extend CustomNodeBase\x1b[0m');
        process.exit(1);
      }
      
      if (!hasExecute) {
        console.log('\x1b[31m✗ Node must implement execute() method\x1b[0m');
        process.exit(1);
      }
      
      if (!hasProperties) {
        console.log('\x1b[31m✗ Node must define properties array\x1b[0m');
        process.exit(1);
      }
      
      console.log('\x1b[32m✓ Node validation passed\x1b[0m');
      console.log('\x1b[90m  ✓ Extends CustomNodeBase\x1b[0m');
      console.log('\x1b[90m  ✓ Has execute() method\x1b[0m');
      console.log('\x1b[90m  ✓ Has properties defined\x1b[0m');
    } catch (error: any) {
      console.log('\x1b[31mError: ' + error.message + '\x1b[0m');
      process.exit(1);
    }
  });

program
  .command('package <directory>')
  .description('Package a custom node for publishing')
  .action((directory: string) => {
    console.log('\x1b[34mPackaging custom node...\x1b[0m');
    
    const nodeDir = path.resolve(directory);
    
    if (!fs.existsSync(nodeDir)) {
      console.log('\x1b[31mDirectory not found: ' + nodeDir + '\x1b[0m');
      process.exit(1);
    }
    
    const packageJsonPath = path.join(nodeDir, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('\x1b[31mpackage.json not found\x1b[0m');
      process.exit(1);
    }
    
    console.log('\x1b[32m✓ Node packaged successfully\x1b[0m');
    console.log('\x1b[90m\nTo publish:\x1b[0m');
    console.log('\x1b[90m  npm publish\x1b[0m');
  });

program.parse();
