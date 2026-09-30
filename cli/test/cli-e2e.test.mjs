import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const cli = resolve('dist/cli.js');
const secret = 'sk_live_TEST_ONLY';
const requests = [];
let endpoint;
const tool = (name) => ({ name, description: 'Fixture', inputSchema: { type: 'object', properties: {} } });
const server = createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString());
  requests.push({ ...body, authorization: req.headers.authorization });
  if (body.id === undefined) { res.writeHead(202).end(); return; }
  let result;
  switch (body.method) {
    case 'initialize':
      result = { protocolVersion: body.params.protocolVersion, capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'sendit-fixture', version: '1.0.0' } };
      break;
    case 'tools/list':
      result = body.params?.cursor ? { tools: [tool('second')] } : { tools: [tool('get_platform_requirements')], nextCursor: 'page-2' };
      break;
    case 'tools/call':
      if (req.headers.authorization !== `Bearer ${secret}`) { res.writeHead(401).end(); return; }
      result = { content: [{ type: 'text', text: JSON.stringify(body.params.arguments) }], ...(body.params.name === 'fail' ? { isError: true } : {}) };
      break;
    case 'resources/list': result = { resources: [] }; break;
    default: throw new Error(`Unexpected method: ${body.method}`);
  }
  const response = JSON.stringify({ jsonrpc: '2.0', id: body.id, result });
  if (req.url === '/sse') {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(`event: message\ndata: ${response}\n\n`);
  } else {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(response);
  }
});
before(async () => { server.listen(0, '127.0.0.1'); await once(server, 'listening'); endpoint = `http://127.0.0.1:${server.address().port}`; });
after(async () => { server.closeAllConnections(); await new Promise((done) => server.close(done)); });

async function run(args, input = '', env = {}) {
  const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, SENDIT_API_KEY: '', SENDIT_MCP_URL: endpoint, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.end(input);
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

test('help and unknown commands never run the setup wizard', async () => {
  const help = await run(['--help']);
  assert.equal(help.code, 0); assert.match(help.stdout, /call <tool>/); assert.doesNotMatch(help.stdout, /Enter choice/);
  const unknown = await run(['typo']); assert.equal(unknown.code, 1); assert.match(unknown.stderr, /Unknown command/);
});
test('terminal discovery negotiates MCP and follows every page without credentials', async () => {
  const result = await run(['tools']); assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).tools.length, 2);
  assert.ok(requests.some((r) => r.method === 'notifications/initialized'));
});
test('SSE remote response works through the public CLI', async () => {
  const result = await run(['tools'], '', { SENDIT_MCP_URL: `${endpoint}/sse` });
  assert.equal(result.code, 0, result.stderr); assert.equal(JSON.parse(result.stdout).tools.length, 2);
});
test('call reads piped JSON, authenticates, and preserves structured MCP output', async () => {
  const result = await run(['call', 'echo'], '{"message":"from stdin"}', { SENDIT_API_KEY: secret });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(JSON.parse(result.stdout).content[0].text).message, 'from stdin');
  assert.ok(requests.some((r) => r.method === 'tools/call' && r.authorization === `Bearer ${secret}`));
  assert.doesNotMatch(result.stdout + result.stderr, /sk_live_TEST_ONLY/);
});
test('invalid arguments and missing credentials fail before a remote mutation', async () => {
  const count = requests.length;
  assert.equal((await run(['call', 'echo', '[]'], '', { SENDIT_API_KEY: secret })).code, 1);
  assert.equal((await run(['call', 'echo', '{}'])).code, 1);
  assert.equal(requests.length, count);
});
test('remote tool failure has a failing exit status', async () => {
  const result = await run(['call', 'fail', '{}'], '', { SENDIT_API_KEY: secret });
  assert.equal(result.code, 1); assert.equal(JSON.parse(result.stdout).isError, true);
});
test('verify proves authentication with a read-only call', async () => {
  assert.equal((await run(['verify'], '', { SENDIT_API_KEY: secret })).code, 0);
  assert.equal((await run(['verify'], '', { SENDIT_API_KEY: 'invalid' })).code, 1);
});
test('host config exports contain no credentials', async () => {
  for (const host of ['hermes', 'openclaw', 'grok', 'muse']) {
    const result = await run(['config', host], '', { SENDIT_API_KEY: secret });
    assert.equal(result.code, 0); JSON.parse(result.stdout); assert.doesNotMatch(result.stdout, /sk_live_TEST_ONLY/);
  }
});
test('real SDK stdio client can discover and call through the packed bridge', async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'serve'], env: { ...process.env, SENDIT_MCP_URL: endpoint, SENDIT_API_KEY: secret }, stderr: 'pipe' });
  const client = new Client({ name: 'acceptance-client', version: '1.0.0' });
  try {
    await client.connect(transport);
    const page = await client.listTools(); assert.equal(page.nextCursor, 'page-2');
    const next = await client.listTools({ cursor: page.nextCursor }); assert.equal(next.tools[0].name, 'second');
    const result = await client.callTool({ name: 'get_platform_requirements', arguments: { platform: 'linkedin' } });
    assert.equal(JSON.parse(result.content[0].text).platform, 'linkedin');
  } finally { await client.close(); }
});
