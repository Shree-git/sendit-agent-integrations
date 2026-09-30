# Public SendIt agent integrations

Checked against current official host documentation on September 29, 2026.
The live full-agent endpoint is `https://sendit.infiniteappsai.com/api/mcp`.
It exposed 148 tools during this release's read-only discovery check.

| Host | Public integration | Install path |
| --- | --- | --- |
| Hermes | Workflow skill and native OAuth MCP configuration | `hermes skills install Shree-git/sendit-hermes-skills/skills/sendit` |
| OpenClaw | Native plugin and ClawHub workflow skill | `openclaw plugins install npm:@senditapp/openclaw@0.2.0` |
| Grok | Custom MCP connector, Bot skill, and Responses API bot | Add the public endpoint at grok.com/connectors; use the public Grok bundle for bot workflows |
| Meta Muse | Hosted MCP connector submission and custom connection brief | Read the public Muse connection brief; directory availability requires Meta approval |
| Muse Code | Native OAuth MCP settings and installable workflow skill | Run the public installer, then `muse mcp login sendit` |
| Any terminal agent | SendIt CLI and stdio bridge | `npx @senditapp/mcp@0.2.0 --help` |

The public source is [sendit-agent-integrations](https://github.com/Shree-git/sendit-agent-integrations).
Hermes and OpenClaw retain their existing dedicated public repositories.
The private application repository is not required by users.

OAuth and API-key authentication are both supported by SendIt.
Prefer the host's OAuth credential store for interactive connectors.
Terminal and developer bot integrations can use `SENDIT_API_KEY` through their secret storage.

Grok custom MCP connections are documented by [xAI](https://docs.x.ai/grok/connectors).
The API bot follows the [Responses Remote MCP contract](https://docs.x.ai/developers/tools/remote-mcp).
The Cursor-format Grok plugin bundle is a review candidate; its import into Grok Bot is not verified.

Muse now has a public [connector submission platform](https://muse.ai/platform).
Its native Code plugin format is documented in developer preview, but the tested stable 1.4.1 build disables plugins.
The native skill and MCP settings path works in that build.

See the package READMEs for source links, exact commands, and validation boundaries.
