import type { INodeExecutor, NodeExecutionContext, NodeExecutionResult, WorkflowNode, ExecutionContext } from "../types";
import nodemailer from "nodemailer";

interface EmailNodeData {
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  credentialId?: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: boolean;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
  }>;
}

export class EmailNode implements INodeExecutor {
  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const data = node.data.parameters as EmailNodeData;

      // Get SMTP config from credential or direct config
      let smtpConfig = data.smtp;
      
      if (data.credentialId && !smtpConfig) {
        // In real implementation, get from credential service
        throw new Error("Credential support not yet implemented");
      }

      if (!smtpConfig) {
        throw new Error("SMTP configuration required");
      }

      // Interpolate template variables  
      const from = this.interpolate(data.from, context);
      const to = this.interpolate(data.to, context);
      const cc = data.cc ? this.interpolate(data.cc, context) : undefined;
      const bcc = data.bcc ? this.interpolate(data.bcc, context) : undefined;
      const subject = this.interpolate(data.subject, context);
      const body = this.interpolate(data.body, context);

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure ?? false,
        auth: smtpConfig.auth,
      });

      // Prepare email options
      const mailOptions: any = {
        from,
        to,
        subject,
      };

      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      if (data.html) {
        mailOptions.html = body;
      } else {
        mailOptions.text = body;
      }

      if (data.attachments && data.attachments.length > 0) {
        mailOptions.attachments = data.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
        }));
      }

      // Send email
      const info = await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
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
    // Simple interpolation - in production use proper template engine
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      if (parts[0] === 'nodes' && parts.length >= 2) {
        const nodeId = parts[1];
        const nodeOutput = context.nodeData.get(nodeId);
        if (nodeOutput && parts.length > 2) {
          // Navigate nested path
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
    const data = node.data.parameters as EmailNodeData;

    if (!data.smtp && !data.credentialId) {
      return "SMTP configuration or credential required";
    }

    if (data.smtp && (!data.smtp.host || !data.smtp.port)) {
      return "SMTP host and port required";
    }

    if (!data.from) return "From address required";
    if (!data.to) return "To address required";
    if (!data.subject) return "Subject required";
    if (!data.body) return "Email body required";

    return true;
  }
}
