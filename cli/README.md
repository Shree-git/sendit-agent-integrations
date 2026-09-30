# SendIt CLI and MCP bridge

Discover and call SendIt tools from the terminal, or connect an AI host through the MCP stdio bridge.
Requires Node.js 20 or later.

```bash
npx @senditapp/mcp@0.2.0 --help
npx @senditapp/mcp@0.2.0 tools
```

For a persistent command:

```bash
npm install -g @senditapp/mcp@0.2.0
sendit --help
```

## Terminal commands

| Command | Behavior |
| --- | --- |
| `setup` | Interactive AI client setup |
| `tools` | Discover the full remote MCP catalog as JSON, including all pages |
| `call <tool> [JSON]` | Call a discovered tool with a JSON object or piped stdin |
| `verify` | Verify `SENDIT_API_KEY` with a read-only authenticated call |
| `config <host>` | Print setup for `hermes`, `openclaw`, `grok`, or `muse` |
| `serve` | Run the MCP stdio bridge |

The bare command opens the setup wizard.
Help and unknown commands never open the wizard.
Failures return a nonzero exit status, including MCP tool results marked `isError`.

Set `SENDIT_API_KEY` through your environment or secret manager before authenticated calls.
Obtain a key from [SendIt settings](https://sendit.infiniteappsai.com/dashboard/settings).

```bash
sendit verify
sendit call list_connected_accounts '{}'
printf '%s' '{"platform":"linkedin"}' | sendit call get_platform_requirements
```

`call` can publish, schedule, or modify data when you select a write tool.
Inspect the tool schema with `tools` and provide only content and destinations the user authorized.

## Agent integrations

- [Hermes skill and OAuth setup](https://github.com/Shree-git/sendit-hermes-skills)
- [OpenClaw native plugin](https://github.com/Shree-git/sendit-openclaw)
- [Grok connector, Bot skill, and API bot](https://github.com/Shree-git/sendit-agent-integrations/tree/main/grok)
- [Meta Muse and Muse Code](https://github.com/Shree-git/sendit-agent-integrations/tree/main/muse)

`config hermes` prints JSON representing the YAML `mcp_servers` mapping.
Use Hermes's native `hermes mcp add` or the public skill installer to apply it.
`config muse` prints the `mcpServers` mapping for native Muse Code settings.
The Muse installer adds the required `schema_version` field and preserves existing configuration.
`config grok` prints a read-only Responses API tool definition; supply authentication through your application's secret storage.
`config openclaw` prints native plugin install and authentication commands.
These commands print guidance without changing the host configuration.

## MCP stdio setup

Add this entry to a host that uses `mcpServers`:

```json
{
  "mcpServers": {
    "sendit": {
      "command": "npx",
      "args": ["-y", "@senditapp/mcp@0.2.0", "serve"],
      "env": { "SENDIT_API_KEY": "YOUR_SENDIT_API_KEY" }
    }
  }
}
```

The bridge preserves tool results and resources and supports HTTP JSON and SSE responses through the MCP SDK.
Its default remote endpoint is `https://sendit.infiniteappsai.com/api/mcp`.
Use `SENDIT_MCP_URL` for a self-hosted deployment or local acceptance testing.
The interactive wizard retains the existing Claude Desktop, Claude Code, VS Code, Cursor, and Windsurf adapters.
Use each host's documented configuration path when configuring it manually.

## Development

```bash
npm ci
npm test
npm pack --dry-run
```

Acceptance tests run the real executable and an SDK stdio client against an isolated HTTP fixture.
They cover authentication, protocol negotiation, resources, paginated discovery, SSE, piped JSON, error exit status, and redaction.
Production discovery was verified separately; fixture tests do not prove a completed user OAuth grant or social publication.

MIT licensed.
