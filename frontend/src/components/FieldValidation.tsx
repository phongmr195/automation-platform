import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'json' | 'number' | 'regex' | 'minLength' | 'maxLength' | 'custom';
  message?: string;
  value?: any; // For minLength, maxLength, regex pattern
  validator?: (value: any) => boolean; // For custom validation
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class FieldValidator {
  static validate(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push(rule.message || 'This field is required');
          }
          break;

        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(rule.message || 'Invalid email address');
          }
          break;

        case 'url':
          if (value) {
            try {
              new URL(value);
            } catch {
              errors.push(rule.message || 'Invalid URL format');
            }
          }
          break;

        case 'json':
          if (value && typeof value === 'string') {
            try {
              JSON.parse(value);
            } catch {
              errors.push(rule.message || 'Invalid JSON format');
            }
          }
          break;

        case 'number':
          if (value && isNaN(Number(value))) {
            errors.push(rule.message || 'Must be a valid number');
          }
          break;

        case 'regex':
          if (value && rule.value && !new RegExp(rule.value).test(value)) {
            errors.push(rule.message || 'Invalid format');
          }
          break;

        case 'minLength':
          if (value && value.length < (rule.value || 0)) {
            errors.push(rule.message || `Minimum length is ${rule.value}`);
          }
          break;

        case 'maxLength':
          if (value && value.length > (rule.value || Infinity)) {
            errors.push(rule.message || `Maximum length is ${rule.value}`);
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message || 'Validation failed');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Get validation rules for specific field types
  static getRulesForField(nodeType: string, fieldName: string): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Common required fields
    const requiredFields: Record<string, string[]> = {
      'http-request': ['url'],
      'telegram-send': ['message'],
      'email': ['from', 'to', 'subject', 'body'],
      'slack': ['text'],
      'discord': [],
      'webhook': ['method', 'url'],
      'sms': ['provider', 'from', 'to', 'message'],
      'google-drive': ['credentials', 'operation'],
      'dropbox': ['accessToken', 'operation'],
      'aws-s3': ['accessKeyId', 'secretAccessKey', 'region', 'operation'],
      'azure-blob': ['connectionString', 'operation'],
      'onedrive': ['accessToken', 'operation'],
      'box': ['accessToken', 'operation'],
      'mysql': ['connection', 'operation'],
      'mongodb': ['connection', 'operation'],
      'redis': ['connection', 'operation'],
      'airtable': ['apiKey', 'operation'],
      'firebase': ['credentials', 'operation'],
      'google-sheets': ['credentials', 'spreadsheetId', 'operation'],
      'notion': ['apiKey', 'operation'],
      'trello': ['apiKey', 'apiToken', 'operation'],
    };

    // Check if field is required
    if (requiredFields[nodeType]?.includes(fieldName)) {
      rules.push({ type: 'required', message: `${fieldName} is required` });
    }

    // Field-specific validation
    if (fieldName === 'url') {
      rules.push({ type: 'url' });
    }

    if (fieldName === 'email' || fieldName === 'to' || fieldName === 'from') {
      if (nodeType === 'email') {
        rules.push({ type: 'email' });
      }
    }

    if (fieldName === 'connection' || fieldName === 'headers' || fieldName === 'body' || 
        fieldName === 'data' || fieldName === 'filter' || fieldName === 'properties' ||
        fieldName === 'embeds' || fieldName === 'attachments' || fieldName === 'blocks') {
      rules.push({ type: 'json', message: 'Must be valid JSON format' });
    }

    if (fieldName === 'port' || fieldName === 'ttl' || fieldName === 'timeout') {
      rules.push({ type: 'number' });
    }

    // Telegram bot token validation
    if (fieldName === 'botToken') {
      rules.push({
        type: 'regex',
        value: '^[0-9]+:[A-Za-z0-9_-]+$',
        message: 'Invalid Telegram bot token format',
      });
    }

    // Phone number validation (basic)
    if (fieldName === 'to' && nodeType === 'sms') {
      rules.push({
        type: 'regex',
        value: '^\\+?[1-9]\\d{1,14}$',
        message: 'Invalid phone number format (use E.164 format)',
      });
    }

    return rules;
  }
}

interface FieldValidationProps {
  value: any;
  rules: ValidationRule[];
  showValidation?: boolean;
}

export function FieldValidation({ value, rules, showValidation = true }: FieldValidationProps) {
  const result = FieldValidator.validate(value, rules);

  if (!showValidation || (result.valid && !value)) {
    return null;
  }

  return (
    <div className="mt-1">
      {result.valid ? (
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          <span>Valid</span>
        </div>
      ) : (
        <div className="space-y-1">
          {result.errors.map((error, index) => (
            <div key={index} className="flex items-start gap-1 text-red-600 text-xs">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
