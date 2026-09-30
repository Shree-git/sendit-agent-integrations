#!/usr/bin/env node

/**
 * SendIt MCP CLI
 *
 * One-click installer and server for SendIt's MCP integration.
 *
 * Usage:
 *   npx @senditapp/mcp          # Interactive setup wizard
 *   npx @senditapp/mcp serve    # Start MCP stdio server (used by AI clients)
 */

import { startServe } from './serve.js';
import { runSetupWizard } from './setup.js';
import { runCommand } from './commands.js';

try {
  const args = process.argv.slice(2);
  if (args[0] === 'serve') {
    await startServe();
  } else if (args.length === 0 || args[0] === 'setup') {
    await runSetupWizard();
  } else {
    await runCommand(args);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const secret = process.env.SENDIT_API_KEY;
  console.error(`[sendit] ${secret ? message.replaceAll(secret, '[redacted]') : message}`);
  process.exitCode = 1;
}
