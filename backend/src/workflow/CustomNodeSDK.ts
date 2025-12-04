/**
 * Custom Node SDK
 * Provides interfaces and base classes for developing custom nodes
 */

export interface NodeProperty {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'options' | 'multiOptions' | 'credentials' | 'color';
  default?: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ name: string; value: any }>;
  typeOptions?: {
    multipleValues?: boolean;
    minValue?: number;
    maxValue?: number;
    rows?: number;
  };
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface NodeCredential {
  name: string;
  required?: boolean;
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface NodeExample {
  description: string;
  config: Record<string, any>;
  input?: any;
  output?: any;
}

export interface NodeDocumentation {
  description: string;
  usage?: string;
  examples?: NodeExample[];
  links?: Array<{ name: string; url: string }>;
  notes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface TestResult {
  success: boolean;
  message?: string;
  output?: any;
  error?: string;
}

export interface NodeExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  nodes: Record<string, any>;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
  logger: {
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  };
  helpers: {
    httpRequest: (options: any) => Promise<any>;
    returnJsonArray: (items: any[]) => any[];
    getCredentials: (type: string) => Promise<Record<string, any>>;
    evaluateExpression: (expression: string, data: any) => any;
  };
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ICustomNode {
  // Node definition
  name: string;
  version: number;
  description: string;
  displayName: string;
  group: string[];
  icon?: string;
  iconUrl?: string;
  color?: string;
  
  // Node configuration
  properties: NodeProperty[];
  credentials?: NodeCredential[];
  
  // Documentation
  documentation?: NodeDocumentation;
  
  // Lifecycle methods
  execute(context: NodeExecutionContext): Promise<NodeExecutionResult>;
  validate?(config: Record<string, any>): ValidationResult;
  test?(config: Record<string, any>, context: NodeExecutionContext): Promise<TestResult>;
  
  // Optional hooks
  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;
}

export abstract class CustomNodeBase implements ICustomNode {
  abstract name: string;
  abstract version: number;
  abstract description: string;
  abstract displayName: string;
  abstract group: string[];
  abstract properties: NodeProperty[];
  
  icon?: string;
  iconUrl?: string;
  color?: string;
  credentials?: NodeCredential[];
  documentation?: NodeDocumentation;
  
  abstract execute(context: NodeExecutionContext): Promise<NodeExecutionResult>;
  
  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    
    // Validate required properties
    for (const prop of this.properties) {
      if (prop.required && !config[prop.name]) {
        errors.push(`Property "${prop.displayName}" is required`);
      }
      
      // Type validation
      if (config[prop.name] !== undefined) {
        const value = config[prop.name];
        switch (prop.type) {
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`Property "${prop.displayName}" must be a number`);
            }
            if (prop.typeOptions?.minValue !== undefined && Number(value) < prop.typeOptions.minValue) {
              errors.push(`Property "${prop.displayName}" must be >= ${prop.typeOptions.minValue}`);
            }
            if (prop.typeOptions?.maxValue !== undefined && Number(value) > prop.typeOptions.maxValue) {
              errors.push(`Property "${prop.displayName}" must be <= ${prop.typeOptions.maxValue}`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Property "${prop.displayName}" must be a boolean`);
            }
            break;
          case 'json':
            if (typeof value === 'string') {
              try {
                JSON.parse(value);
              } catch {
                errors.push(`Property "${prop.displayName}" must be valid JSON`);
              }
            }
            break;
          case 'options':
            if (prop.options && !prop.options.find(opt => opt.value === value)) {
              errors.push(`Property "${prop.displayName}" has invalid option value`);
            }
            break;
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  async test(config: Record<string, any>, context: NodeExecutionContext): Promise<TestResult> {
    // Default implementation: validate and execute
    const validation = this.validate(config);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Configuration validation failed',
        error: validation.errors?.join(', ')
      };
    }
    
    try {
      const result = await this.execute(context);
      return {
        success: result.success,
        message: result.success ? 'Test successful' : 'Test failed',
        output: result.output,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Test execution failed',
        error: error.message
      };
    }
  }
  
  async onInit(): Promise<void> {
    // Override if needed
  }
  
  async onDestroy(): Promise<void> {
    // Override if needed
  }
  
  // Helper methods for node developers
  protected createResult(success: boolean, output?: any, error?: string): NodeExecutionResult {
    return { success, output, error };
  }
  
  protected createError(message: string): NodeExecutionResult {
    return { success: false, error: message };
  }
  
  protected createSuccess(output: any): NodeExecutionResult {
    return { success: true, output };
  }
}

// Export helper functions
export const NodeHelpers = {
  /**
   * Create a simple text property
   */
  textProperty(name: string, displayName: string, required = false, defaultValue = ''): NodeProperty {
    return {
      name,
      displayName,
      type: 'string',
      default: defaultValue,
      required
    };
  },
  
  /**
   * Create a number property
   */
  numberProperty(name: string, displayName: string, required = false, defaultValue = 0, min?: number, max?: number): NodeProperty {
    return {
      name,
      displayName,
      type: 'number',
      default: defaultValue,
      required,
      typeOptions: {
        minValue: min,
        maxValue: max
      }
    };
  },
  
  /**
   * Create a boolean property
   */
  booleanProperty(name: string, displayName: string, defaultValue = false): NodeProperty {
    return {
      name,
      displayName,
      type: 'boolean',
      default: defaultValue
    };
  },
  
  /**
   * Create an options property (dropdown)
   */
  optionsProperty(name: string, displayName: string, options: Array<{ name: string; value: any }>, defaultValue?: any): NodeProperty {
    return {
      name,
      displayName,
      type: 'options',
      options,
      default: defaultValue ?? options[0]?.value
    };
  },
  
  /**
   * Create a JSON property
   */
  jsonProperty(name: string, displayName: string, required = false): NodeProperty {
    return {
      name,
      displayName,
      type: 'json',
      required
    };
  },
  
  /**
   * Create a credentials property
   */
  credentialProperty(name: string, required = true): NodeCredential {
    return {
      name,
      required
    };
  }
};
