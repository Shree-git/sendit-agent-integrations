# SendIt for Grok

Use SendIt's public remote MCP endpoint with grok.com or an xAI API bot.
This package also contains a Cursor-format plugin candidate and a saved-skill workflow for Grok Bot.

| Interface | Setup | Status |
| --- | --- | --- |
| grok.com | Add a custom connector at `https://sendit.infiniteappsai.com/api/mcp` | Official xAI custom-connector route |
| Grok Bot | Marketplace plugin and saved skill | Package ready for review; installation in Bot unverified |
| xAI API bot | `scripts/grok_api.py` | Responses request and CLI contracts tested locally |

## Connect grok.com

1. Connect the intended social accounts in [SendIt](https://sendit.infiniteappsai.com).
2. Open [Grok connectors](https://grok.com/connectors), choose New Connector, then Custom.
3. Enter `https://sendit.infiniteappsai.com/api/mcp` and complete the authentication flow.
4. Ask: "Use SendIt to list my connected accounts. Do not publish anything."

The endpoint supports OAuth browser authentication and SendIt API keys for clients that accept an Authorization header.
Do not put a key in the URL or ordinary chat.
The legacy `/mcp` alias remains available; use `/api/mcp` for new connections.
The custom connector route is documented in [xAI connectors](https://docs.x.ai/grok/connectors).

## Grok Bot package

The plugin pairs `mcp.json` with [the SendIt skill](skills/sendit-social/SKILL.md).
Its MCP definition uses OAuth and contains no credentials.
Grok Bot installs supported connectors from Marketplace; users authenticate in a browser and attach a connector with `@` or a saved skill with `/`.
See [xAI's Bot connection guide](https://docs.x.ai/grok-bot/computer-and-apps) and [skills guide](https://docs.x.ai/grok-bot/skills-routines-and-automations).

The manifest follows [Cursor's plugin reference](https://cursor.com/docs/reference/plugins).
xAI documents that Grok Bot inherits Cursor's connector policy, but the Bot docs do not explicitly promise that every local Cursor-format plugin loads in Bot.
Verify this package in Grok Bot after Marketplace review before calling it supported there.

To use the workflow before a listing is available, attach `skills/sendit-social/SKILL.md` to a Bot and ask it to save the instructions as a SendIt skill.
The skill needs a connected SendIt MCP tool or a configured CLI; saving instructions alone does not grant access.
Bots on one account share their cloud computer and credentials.
Use secure credential handoff for CLI setup, and omit credentials from public Bot templates.

For local Cursor acceptance testing, copy this entire directory to `~/.cursor/plugins/local/sendit-grok`, reload Cursor, authenticate SendIt, and run the read-only account-list prompt.
Local plugin imports must be allowed by the host or team policy.
For public review, host this directory in a public Git repository and submit the repository at [Cursor Marketplace publishing](https://cursor.com/marketplace/publish).
A multi-plugin repository needs a `.cursor-plugin/marketplace.json` entry pointing to this directory.
Catalog acceptance and an installed Grok Bot connection require separate evidence.

## Run an API bot

Requires Python 3.10 or later.
The script has no third-party dependencies.

```bash
python3 scripts/grok_api.py --dry-run
python3 -m unittest discover -s test -p 'test_*.py' -v
```

Set `XAI_API_KEY` and `SENDIT_API_KEY` through your secret manager or environment, then run:

```bash
python3 scripts/grok_api.py --smoke
```

The smoke request exposes only account listing, platform requirements, scheduled-post listing, and analytics.
It requires an actual successful account-list MCP call in the API output.
A model's prose about a connection does not count as a pass.
Set `XAI_MODEL` to override the documented `grok-4.7` default or `SENDIT_MCP_URL` for a public HTTPS deployment.
Localhost and private IP addresses are rejected because xAI makes the remote connection.

For an approved publication, supply the exact content and destination and enable only the needed write tool:

```bash
python3 scripts/grok_api.py \
  --allow-write-tool publish_content \
  --approve-writes \
  --message 'Publish this exact text to my connected LinkedIn account: Hello from SendIt.'
```

This command publishes real content.
Use `--dry-run` to review its redacted request first.
xAI's [Remote MCP docs](https://docs.x.ai/developers/tools/remote-mcp) specify the Responses `tools` contract and state that `require_approval` and `connector_id` are unsupported.
The script therefore applies its tool allowlist before the request and requires a separate flag to enable writes.

For a full server catalog, discover `tools/list` rather than assuming this example's short allowlist contains every SendIt capability.
