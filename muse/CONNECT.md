# Connect Muse to SendIt

SendIt is social publishing infrastructure with a hosted Streamable HTTP MCP server.
Use `https://sendit.infiniteappsai.com/api/mcp` and discover its tools rather than hardcoding a tool count.

Read the protected-resource metadata at `https://sendit.infiniteappsai.com/.well-known/oauth-protected-resource`.
Follow its authorization-server discovery and use authorization code with S256 PKCE.
The server supports dynamic client registration and the scopes `mcp` and `offline_access`.
Keep grants in Muse's credential storage.
Ask the person to sign in through the browser and authorize their SendIt account.

If the host needs a custom connector implementation, use its supported execution environment and a standard MCP client.
The public SendIt CLI at `@senditapp/mcp` is an alternative for terminal environments that support Node.js 20 or later.
Its `tools` command discovers schemas, and `call <tool> [JSON]` calls a discovered tool with `SENDIT_API_KEY` supplied through the environment.
Prefer OAuth for the consumer connection.
Never place credentials in a URL or save them in a skill.

After connecting, call `list_connected_accounts` and `get_platform_requirements` as read-only checks.
Save the workflow in `skills/sendit-social/SKILL.md` as a reusable skill.
Use only destinations and content the person authorized.
Validate platform limits before publishing, check status before retrying uncertain writes, and report actual per-platform outcomes.
