export const SENDIT_API_BASE = 'https://sendit.infiniteappsai.com';
export const SENDIT_API_KEY_URL = `${SENDIT_API_BASE}/dashboard/settings`;
export const SENDIT_AUTH_URL = `${SENDIT_API_BASE}/login`;
export const SENDIT_MCP_PACKAGE = '@senditapp/mcp';
export const SENDIT_MCP_VERSION = '0.2.1';

/** Override the remote endpoint for self-hosted deployments and local acceptance tests. */
export function getMcpUrl(): string {
  return process.env.SENDIT_MCP_URL || `${SENDIT_API_BASE}/api/mcp`;
}
