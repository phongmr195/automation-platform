import axios from "axios";
import { getCredential } from "../../backend/src/services/credential.service";

export async function executeNode(node, context) {
  if (node.type === "http") {
    let headers = { ...(node.config.headers || {}) };

    if (node.config.credentialId) {
      const cred = await getCredential(context.ownerId, node.config.credentialId);

      if (cred.type === "apiKey") {
        headers["Authorization"] = `Bearer ${cred.secret.key}`;
      }

      if (cred.type === "basic") {
        const b64 = Buffer.from(`${cred.secret.username}:${cred.secret.password}`).toString("base64");
        headers["Authorization"] = `Basic ${b64}`;
      }

      if (cred.type === "oauth") {
        headers["Authorization"] = `Bearer ${cred.secret.access_token}`;
      }
    }

    const res = await axios({
      url: node.config.url,
      method: node.config.method || "GET",
      headers,
      data: node.config.body
    });

    return res.data;
  }
}
