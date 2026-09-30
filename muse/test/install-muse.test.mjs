import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
const installer = resolve('scripts/install-muse.mjs');
function fixture(fn) { const dir = mkdtempSync(join(tmpdir(), 'sendit-muse-')); try { fn(join(dir, 'settings.json')); } finally { rmSync(dir, { recursive: true }); } }
const run = (path, ...flags) => spawnSync(process.execPath, [installer, '--config', path, ...flags], { encoding: 'utf8' });
test('first install creates a private OAuth config and is idempotent', () => fixture((path) => {
  assert.equal(run(path).status, 0); const config = JSON.parse(readFileSync(path));
  assert.equal(config.schema_version, 1); assert.equal(config.mcpServers.sendit.type, 'streamable-http');
  assert.equal(config.mcpServers.sendit.headers, undefined); assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(JSON.parse(run(path).stdout).changed, false);
}));
test('preserves unrelated servers and backs up existing configuration', () => fixture((path) => {
  const original = { schema_version: 1, model: 'custom', mcpServers: { other: { command: 'other' } } };
  writeFileSync(path, JSON.stringify(original)); const result = run(path); assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(readFileSync(path)).mcpServers.other, original.mcpServers.other);
  assert.deepEqual(JSON.parse(readFileSync(JSON.parse(result.stdout).backup)), original);
}));
test('legacy settings remain unambiguous', () => fixture((path) => {
  writeFileSync(path, JSON.stringify({ schema_version: 1, mcp_servers: { other: { transport: 'stdio', command: 'other' } } }));
  assert.equal(run(path).status, 0); const config = JSON.parse(readFileSync(path));
  assert.equal(config.mcpServers, undefined); assert.equal(config.mcp_servers.sendit.transport, 'streamable_http');
}));
test('dry run makes no configuration file', () => fixture((path) => { assert.equal(run(path, '--dry-run').status, 0); assert.equal(existsSync(path), false); }));
test('malformed, ambiguous, or conflicting config is preserved on failure', () => fixture((path) => {
  for (const value of ['{bad', '[]', '{"mcpServers":{},"mcp_servers":{}}', '{"mcpServers":{"sendit":{"url":"https://other.example/mcp"}}}']) {
    writeFileSync(path, value); assert.equal(run(path).status, 1); assert.equal(readFileSync(path, 'utf8'), value);
  }
}));
