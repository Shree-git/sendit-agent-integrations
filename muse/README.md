# SendIt for Meta Muse and Muse Code

Use SendIt for social publishing, scheduling, account connections, and analytics.
The hosted MCP endpoint is `https://sendit.infiniteappsai.com/api/mcp`.
OAuth discovery supports PKCE, dynamic client registration, and refresh tokens.

## Muse personal agent

Paste this into Muse:

```text
Connect to SendIt using its public MCP endpoint https://sendit.infiniteappsai.com/api/mcp.
Read https://raw.githubusercontent.com/Shree-git/sendit-agent-integrations/main/muse/CONNECT.md for setup and workflow instructions.
Use OAuth browser sign-in and save a reusable SendIt social publishing skill.
Start by listing my connected accounts and reading platform requirements.
Publish or schedule only the content and destinations I authorize.
```

Meta's [Muse Connector Platform](https://muse.ai/platform) accepts connectors for review before directory publication.
A custom connection and directory approval are separate outcomes.
See [SUBMISSION.md](SUBMISSION.md) for the listing details and validation boundaries.

## Muse Code

Clone the public integration repository and install the workflow skill:

```bash
git clone https://github.com/Shree-git/sendit-agent-integrations.git
cd sendit-agent-integrations/muse
muse skills validate skills/sendit-social
muse skills install skills/sendit-social --scope user
node scripts/install-muse.mjs --dry-run
node scripts/install-muse.mjs
muse mcp login sendit
```

Restart Muse Code and run `/mcp` to check discovery.
Then ask it to list your SendIt accounts.
The installer preserves other servers, rejects malformed or ambiguous JSON, backs up changes, and writes a private settings file.
Set `XDG_CONFIG_HOME` or pass `--config PATH` to target another configuration directory.

The native `.muse-plugin/plugin.json` bundle contains the workflow skill.
It does not declare a second MCP connection because `muse mcp login` authenticates a server in user settings.
On a build with plugins enabled, install it using `muse plugins install .` instead of the separate skill install.
The stable Muse Code 1.4.1 build tested on September 29, 2026 reports that plugins are unavailable, so the skill install and native MCP configuration are the verified path.

## Terminal fallback

The public SendIt CLI works in Muse's execution environment:

```bash
npx --yes --package=@senditapp/mcp@0.2.1 sendit tools
npx --yes --package=@senditapp/mcp@0.2.1 sendit config muse
```

Use the [public CLI release archive](https://github.com/Shree-git/sendit-agent-integrations/releases/download/v0.2.1/senditapp-mcp-0.2.1.tgz) as a fallback:

```bash
npx --yes --package=https://github.com/Shree-git/sendit-agent-integrations/releases/download/v0.2.1/senditapp-mcp-0.2.1.tgz sendit tools
```

Keep `SENDIT_API_KEY` in the environment for authenticated terminal calls.
The OAuth setup above does not need an API key.

## Validation

```bash
npm test
muse skills validate skills/sendit-social
```

Automated tests use isolated settings files and cover preservation, backups, permissions, malformed configuration, and repeated installation.
Authenticated OAuth and consumer Muse execution require the user's sign-in and account permissions.

## Sources

- [Muse Connector Platform](https://muse.ai/platform)
- [Muse product](https://ai.meta.com/muse/)
- [Muse Code MCP configuration](https://meta-models.github.io/muse-code-sdk/next/guides/extend/mcp-servers/)
- [Muse Code native plugin manifest](https://meta-models.github.io/muse-code-sdk/next/guides/plugins/reference/manifest/)
