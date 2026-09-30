/** Terminal commands shared by agent skills and human users. */
import { readFileSync } from 'node:fs';
import { SENDIT_MCP_VERSION, getMcpUrl } from './constants.js';
import { SendItRpcClient } from './rpc.js';
import { verifyApiKey } from './verify.js';

const HELP = `SendIt CLI and MCP server

Usage: sendit <command>
       npx @senditapp/mcp <command>

  setup                     Configure an AI client interactively
  serve                     Run the MCP stdio bridge (SENDIT_API_KEY required)
  tools                     Print the remote tool catalog as JSON
  call <tool> [JSON]         Call a tool with a JSON object (or pipe JSON on stdin)
  verify                    Check SENDIT_API_KEY with a read-only tool call
  config <client>           Print setup for hermes, openclaw, grok, or muse
  --help                    Show this help
  --version                 Show the installed version

Set SENDIT_API_KEY in the environment for authenticated calls.
Set SENDIT_MCP_URL to override the hosted MCP endpoint.
Tool calls can publish, schedule, or change data. Use tools to inspect schemas first.
`;

function apiKey(): string {
  const value = process.env.SENDIT_API_KEY;
  if (!value) throw new Error('Set SENDIT_API_KEY in the environment before calling tools.');
  return value;
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function clientConfig(client: string): unknown {
  const url = getMcpUrl();
  switch (client) {
    case 'hermes':
      return { mcp_servers: { sendit: { url, auth: 'oauth' } } };
    case 'muse':
      return { mcpServers: { sendit: { type: 'streamable-http', url } } };
    case 'grok':
      return {
        type: 'mcp', server_label: 'sendit', server_url: url,
        allowed_tools: ['list_connected_accounts', 'get_platform_requirements'],
      };
    case 'openclaw':
      return {
        install: 'openclaw plugins install clawhub:@senditapp/openclaw@0.2.0',
        setup: 'openclaw sendit auth login',
        documentation: 'https://github.com/Shree-git/sendit-openclaw',
      };
    default:
      throw new Error('Unknown client. Choose hermes, openclaw, grok, or muse.');
  }
}

export async function runCommand(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === '--help' || command === '-h' || command === 'help') {
    console.log(HELP);
    return;
  }
  if (command === '--version' || command === '-v') {
    console.log(SENDIT_MCP_VERSION);
    return;
  }
  if (command === 'config') {
    if (rest.length !== 1) throw new Error('Usage: sendit config <hermes|openclaw|grok|muse>');
    print(clientConfig(rest[0]));
    return;
  }
  if (command === 'verify') {
    if (rest.length) throw new Error('Usage: sendit verify');
    const result = await verifyApiKey(apiKey());
    print(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command !== 'tools' && command !== 'call') {
    throw new Error(`Unknown command: ${command}. Run sendit --help.`);
  }
  if (command === 'tools' && rest.length) throw new Error('Usage: sendit tools');
  let toolArgs: Record<string, unknown> = {};
  if (command === 'call') {
    if (!rest[0] || rest.length > 2) throw new Error('Usage: sendit call <tool> [JSON]');
    const input = rest[1] ?? (process.stdin.isTTY ? '{}' : readFileSync(0, 'utf8').trim() || '{}');
    const parsed: unknown = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Tool arguments must be a JSON object.');
    }
    toolArgs = parsed as Record<string, unknown>;
  }
  const remote = new SendItRpcClient(command === 'call' ? apiKey() : process.env.SENDIT_API_KEY);
  try {
    await remote.initialize();
    if (command === 'tools') {
      const tools: unknown[] = [];
      const cursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await remote.call('tools/list', cursor ? { cursor } : {}) as { tools: unknown[]; nextCursor?: string };
        tools.push(...page.tools);
        cursor = page.nextCursor;
        if (cursor && cursors.has(cursor)) throw new Error('SendIt returned a repeated tool-list cursor.');
        if (cursor) cursors.add(cursor);
      } while (cursor);
      print({ tools });
      return;
    }
    const result = await remote.call(
      'tools/call', { name: rest[0], arguments: toolArgs }
    );
    print(result);
    if ((result as { isError?: boolean })?.isError) process.exitCode = 1;
  } finally {
    await remote.close();
  }
}
