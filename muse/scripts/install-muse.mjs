#!/usr/bin/env node
/** Configure Muse Code's native OAuth MCP entry without exposing credentials. */
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, copyFileSync, chmodSync } from 'node:fs';
import { parseArgs } from 'node:util';

try {
  const { values } = parseArgs({ options: { config: { type: 'string' }, 'dry-run': { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('Usage: node scripts/install-muse.mjs [--config PATH] [--dry-run]');
    process.exit(0);
  }
  const configPath = resolve(values.config || join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'muse', 'settings.json'));
  const exists = existsSync(configPath);
  const config = exists ? JSON.parse(readFileSync(configPath, 'utf8')) : { schema_version: 1 };
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Muse settings must contain a JSON object.');
  if (config.schema_version !== undefined && config.schema_version !== 1) throw new Error('Unsupported Muse settings schema_version.');
  if (config.mcpServers !== undefined && config.mcp_servers !== undefined) throw new Error('Both mcpServers and mcp_servers exist. Resolve that ambiguity first.');
  const legacy = config.mcp_servers !== undefined;
  const root = legacy ? 'mcp_servers' : 'mcpServers';
  const servers = config[root] ?? {};
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) throw new Error(`${root} must be an object.`);
  const old = servers.sendit;
  if (old !== undefined && (!old || typeof old !== 'object' || Array.isArray(old))) throw new Error('Existing SendIt entry must be an object.');
  if (old && (old.command || !['https://sendit.infiniteappsai.com/api/mcp', 'https://sendit.infiniteappsai.com/mcp'].includes(old.url))) {
    throw new Error('An existing SendIt entry points to a different server. Rename it before installing.');
  }
  const entry = { ...(old ?? {}), url: 'https://sendit.infiniteappsai.com/api/mcp' };
  delete entry.type; delete entry.transport;
  if (legacy) entry.transport = 'streamable_http'; else entry.type = 'streamable-http';
  config.schema_version = 1;
  config[root] = { ...servers, sendit: entry };
  const next = JSON.stringify(config, null, 2) + '\n';
  const changed = !exists || readFileSync(configPath, 'utf8') !== next;
  let backup;
  if (!values['dry-run'] && changed) {
    mkdirSync(dirname(configPath), { recursive: true });
    if (exists) {
      backup = `${configPath}.sendit-backup-${Date.now()}`;
      copyFileSync(configPath, backup); chmodSync(backup, 0o600);
    }
    const temp = `${configPath}.sendit-${process.pid}.tmp`;
    writeFileSync(temp, next, { mode: 0o600 }); renameSync(temp, configPath);
  }
  console.log(JSON.stringify({ configPath, changed, dryRun: Boolean(values['dry-run']), ...(backup ? { backup } : {}), nextStep: 'muse mcp login sendit' }, null, 2));
} catch (error) {
  console.error(`[SendIt] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
