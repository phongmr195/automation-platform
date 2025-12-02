import axios from "axios";
import { NodeVM } from "vm2";
import { getCredential } from "../../backend/src/services/credential";

/**
 * Interpolate template strings like {{nodes.1.data}} with actual context values
 */
function interpolate(obj: any, context: any): any {
  if (typeof obj === "string") {
    return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split(".");
      let value = context;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? value : match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => interpolate(item, context));
  }
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = interpolate(val, context);
    }
    return result;
  }
  return obj;
}

export async function executeNode(node, context) {
  if (node.type === "http") {
    let headers = { ...(node.config.headers || {}) };

    if (node.config.credentialId) {
      const cred = await getCredential(
        context.ownerId,
        node.config.credentialId
      );

      if (cred.type === "apiKey") {
        headers["Authorization"] = `Bearer ${cred.secret.key}`;
      }

      if (cred.type === "basic") {
        const b64 = Buffer.from(
          `${cred.secret.username}:${cred.secret.password}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${b64}`;
      }

      if (cred.type === "oauth") {
        headers["Authorization"] = `Bearer ${cred.secret.access_token}`;
      }
    }

    // Interpolate body templates
    const body = node.config.body
      ? interpolate(node.config.body, context)
      : undefined;

    const res = await axios({
      url: node.config.url,
      method: node.config.method || "GET",
      headers,
      data: body,
    });

    return res.data;
  }

  if (node.type === "transform" || node.type === "code") {
    // Execute JavaScript transformation code
    const vm = new NodeVM({
      sandbox: { context },
      timeout: 10000,
    });

    const code = node.config.code || "";
    const fn = vm.run(`module.exports = function() { ${code} }`);
    return fn();
  }

  throw new Error(`Unknown node type: ${node.type}`);
}
