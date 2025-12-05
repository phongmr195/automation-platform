import { useState } from 'react';
import { Play, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface TestConfigButtonProps {
  nodeType: string;
  parameters: Record<string, any>;
  onTestSuccess?: (result: any) => void;
  onTestError?: (error: string) => void;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration?: number;
}

export default function TestConfigButton({
  nodeType,
  parameters,
  onTestSuccess,
  onTestError,
}: TestConfigButtonProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const testConfiguration = async () => {
    setTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      // Validate required parameters based on node type
      const validationErrors = validateParameters(nodeType, parameters);
      if (validationErrors.length > 0) {
        const errorResult: TestResult = {
          success: false,
          message: 'Validation failed',
          error: validationErrors.join(', '),
          duration: Date.now() - startTime,
        };
        setTestResult(errorResult);
        onTestError?.(errorResult.error || 'Validation failed');
        console.error('Validation failed:', validationErrors[0]);
        return;
      }

      // Call backend test endpoint
      const response = await fetch(`/api/engine/nodes/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType,
          parameters,
        }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        const errorResult: TestResult = {
          success: false,
          message: 'Test failed',
          error: errorData.error || 'Unknown error',
          duration,
        };
        setTestResult(errorResult);
        onTestError?.(errorResult.error || 'Test failed');
        console.error('Test failed:', errorResult.error);
        return;
      }

      const data = await response.json();
      const successResult: TestResult = {
        success: true,
        message: 'Test successful',
        data: data.result,
        duration,
      };
      setTestResult(successResult);
      onTestSuccess?.(data.result);
      console.log('Test successful:', duration, 'ms');
    } catch (error: any) {
      const errorResult: TestResult = {
        success: false,
        message: 'Test error',
        error: error.message || 'Failed to test configuration',
        duration: Date.now() - startTime,
      };
      setTestResult(errorResult);
      onTestError?.(errorResult.error || 'Test error');
      console.error('Test error:', errorResult.error);
    } finally {
      setTesting(false);
    }
  };

  const validateParameters = (nodeType: string, params: Record<string, any>): string[] => {
    const errors: string[] = [];

    // Required parameters by node type
    const requiredParams: Record<string, string[]> = {
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
      'mysql': ['connection', 'operation'],
      'mongodb': ['connection', 'operation'],
      'redis': ['connection', 'operation'],
      'google-sheets': ['credentials', 'spreadsheetId', 'operation'],
      'notion': ['apiKey', 'operation'],
      'trello': ['apiKey', 'apiToken', 'operation'],
    };

    const required = requiredParams[nodeType] || [];
    for (const param of required) {
      if (!params[param] || (typeof params[param] === 'string' && params[param].trim() === '')) {
        errors.push(`${param} is required`);
      }
    }

    // Custom validation for nodes with OR conditions
    if (nodeType === 'webhook') {
      if (!params['url'] && !params['credentialId']) {
        errors.push('Webhook URL or credential required');
      }
    }
    
    if (nodeType === 'slack') {
      if (!params['webhookUrl'] && !params['credentialId']) {
        errors.push('Slack webhook URL or credential required');
      }
    }
    
    if (nodeType === 'discord') {
      if (!params['webhookUrl'] && !params['credentialId']) {
        errors.push('Discord webhook URL or credential required');
      }
    }
    
    if (nodeType === 'email') {
      if (!params['smtp'] && !params['credentialId']) {
        errors.push('SMTP configuration or credential required');
      }
    }

    // Validate JSON fields
    const jsonFields = ['connection', 'headers', 'body', 'data', 'filter', 'properties', 'embeds'];
    for (const field of jsonFields) {
      if (params[field] && typeof params[field] === 'string') {
        try {
          JSON.parse(params[field]);
        } catch {
          errors.push(`${field} must be valid JSON`);
        }
      }
    }

    // Validate URLs
    if (params.url) {
      try {
        new URL(params.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    return errors;
  };

  return (
    <div className="space-y-2">
      {/* Test button */}
      <button
        onClick={testConfiguration}
        disabled={testing || Object.keys(parameters).length === 0}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          testing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : Object.keys(parameters).length === 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {testing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Test Configuration
          </>
        )}
      </button>

      {/* Test result */}
      {testResult && (
        <div
          className={`p-3 rounded-md border ${
            testResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className={`font-medium text-sm ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {testResult.message}
              </div>
              {testResult.error && (
                <div className="mt-1 text-xs text-red-600">{testResult.error}</div>
              )}
              {testResult.data && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Sample Output:</div>
                  <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-32">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
              {testResult.duration !== undefined && (
                <div className="mt-2 text-xs text-gray-500">
                  Duration: {testResult.duration}ms
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning for missing parameters */}
      {Object.keys(parameters).length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-700">
            Add parameters to test the configuration
          </div>
        </div>
      )}
    </div>
  );
}
