import type { INodeExecutor, NodeExecutionResult, WorkflowNode, ExecutionContext } from "../types";

interface WebhookNodeData {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  queryParameters?: Record<string, string>;
  body?: any;
  bodyType?: "json" | "form" | "raw";
  authentication?: {
    type: "none" | "basic" | "bearer" | "apiKey";
    username?: string;
    password?: string;
    token?: string;
    apiKey?: {
      key: string;
      value: string;
      addTo: "header" | "query";
    };
  };
  timeout?: number;
  followRedirect?: boolean;
  ignoreSSL?: boolean;
}

export class WebhookNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const data = node.data.parameters as WebhookNodeData;

      // Interpolate URL
      let url = this.interpolate(data.url, context);

      // Add query parameters
      if (data.queryParameters && Object.keys(data.queryParameters).length > 0) {
        const params = new URLSearchParams();
        Object.entries(data.queryParameters).forEach(([key, value]) => {
          params.append(key, this.interpolate(value, context));
        });
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}${params.toString()}`;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (data.headers) {
        Object.entries(data.headers).forEach(([key, value]) => {
          headers[key] = this.interpolate(value, context);
        });
      }

      // Add authentication
      if (data.authentication) {
        switch (data.authentication.type) {
          case "basic":
            if (data.authentication.username && data.authentication.password) {
              const auth = btoa(`${data.authentication.username}:${data.authentication.password}`);
              headers["Authorization"] = `Basic ${auth}`;
            }
            break;

          case "bearer":
            if (data.authentication.token) {
              headers["Authorization"] = `Bearer ${data.authentication.token}`;
            }
            break;

          case "apiKey":
            if (data.authentication.apiKey) {
              const { key, value, addTo } = data.authentication.apiKey;
              if (addTo === "header") {
                headers[key] = value;
              } else if (addTo === "query") {
                const separator = url.includes('?') ? '&' : '?';
                url += `${separator}${key}=${encodeURIComponent(value)}`;
              }
            }
            break;
        }
      }

      // Prepare request options
      const options: RequestInit = {
        method: data.method,
        headers,
      };

      if (data.method !== "GET" && data.body) {
        if (data.bodyType === "json") {
          options.body = JSON.stringify(data.body);
        } else if (data.bodyType === "form") {
          const formData = new URLSearchParams();
          Object.entries(data.body).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          options.body = formData.toString();
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        } else {
          options.body = data.body;
        }
      }

      // Make request
      const response = await fetch(url, options);

      let responseData: any;
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const duration = Date.now() - startTime;

      return {
        success: response.ok,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  private interpolate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      if (parts[0] === 'nodes' && parts.length >= 2) {
        const nodeId = parts[1];
        const nodeOutput = context.nodeData.get(nodeId);
        if (nodeOutput && parts.length > 2) {
          let value = nodeOutput;
          for (let i = 2; i < parts.length; i++) {
            value = value?.[parts[i]];
          }
          return value !== undefined ? String(value) : match;
        }
      }
      return match;
    });
  }

  validate(node: WorkflowNode): boolean | string {
    const data = node.data.parameters as WebhookNodeData;

    if (!data.url) {
      return "URL required";
    }

    if (!data.method) {
      return "HTTP method required";
    }

    return true;
  }
}
