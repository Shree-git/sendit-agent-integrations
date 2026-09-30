/** Remote MCP transport shared by the terminal CLI and stdio bridge. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolRequest, ReadResourceRequest } from '@modelcontextprotocol/sdk/types.js';
import { getMcpUrl, SENDIT_MCP_VERSION } from './constants.js';

export class SendItRpcError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

/** Uses the SDK for protocol negotiation, sessions, notifications, JSON, and SSE. */
export class SendItRpcClient {
  private readonly client = new Client({ name: 'sendit-mcp', version: SENDIT_MCP_VERSION });
  private initialized = false;

  constructor(private readonly apiKey?: string) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const transport = new StreamableHTTPClientTransport(new URL(getMcpUrl()), {
      requestInit: { headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {} },
    });
    try {
      await this.client.connect(transport, { timeout: 30_000 });
      this.initialized = true;
    } catch (error) {
      await this.client.close();
      throw this.wrap(error);
    }
  }

  async call(method: string, params: unknown): Promise<unknown> {
    if (!this.initialized) throw new SendItRpcError('Initialize SendIt before calling tools.');
    try {
      switch (method) {
        case 'tools/list': return await this.client.listTools(params as { cursor?: string }, { timeout: 30_000 });
        case 'tools/call': return await this.client.callTool(params as CallToolRequest['params'], undefined, { timeout: 30_000 });
        case 'resources/list': return await this.client.listResources(params as { cursor?: string }, { timeout: 30_000 });
        case 'resources/read': return await this.client.readResource(params as ReadResourceRequest['params'], { timeout: 30_000 });
        default: throw new SendItRpcError(`Unsupported MCP method: ${method}`);
      }
    } catch (error) {
      throw this.wrap(error);
    }
  }

  async close(): Promise<void> {
    await this.client.close();
    this.initialized = false;
  }

  private wrap(error: unknown): SendItRpcError {
    if (error instanceof SendItRpcError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = this.apiKey ? message.replaceAll(this.apiKey, '[redacted]') : message;
    return new SendItRpcError(safeMessage, error instanceof StreamableHTTPError ? error.code : undefined);
  }
}
