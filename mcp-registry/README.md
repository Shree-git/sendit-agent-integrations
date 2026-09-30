# SendIt in the official MCP Registry

This manifest updates the existing `io.github.Shree-git/sendit` entry to version `1.2.0`.
Earlier versions `1.0.0` and `1.1.0` were published in January 2026.
Version `1.2.0` was published on September 30, 2026 at `02:03:11 UTC`.
The public registry readback confirmed `active` status and `isLatest: true`.
The update uses the canonical `https://sendit.infiniteappsai.com/api/mcp` endpoint and the public [agent integration repository](https://github.com/Shree-git/sendit-agent-integrations).

The entry describes a hosted Streamable HTTP server.
It declares no installable package, so npm ownership metadata and a package `mcpName` field are not required for this listing.
Clients discover OAuth through SendIt's protected resource metadata and complete account authorization in the browser.
No access token or API key belongs in `server.json`.

## Validate and publish

Use the official `mcp-publisher` release from [modelcontextprotocol/registry](https://github.com/modelcontextprotocol/registry/releases).
Check the downloaded archive against its release checksum before using it.

```bash
mcp-publisher validate server.json
mcp-publisher login github
mcp-publisher publish server.json
```

The interactive login requests GitHub authorization.
An existing GitHub token can instead be supplied through `MCP_GITHUB_TOKEN` to `mcp-publisher login github` without granting a new OAuth application permission.
Read the token from the credential store into the subprocess environment; do not print it or pass it in command arguments.
The authenticated GitHub username must own `io.github.Shree-git/*`.

New registry versions are published separately from older versions.
Keep the existing namespace and server name, and increment the manifest version for later updates.
A registry metadata update does not deploy the hosted server.

## Verification

Read [the public registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.Shree-git%2Fsendit/versions/latest) after publishing.
Confirm the latest version, public repository URL, remote URL, and active status.
A valid metadata entry does not prove that an account can finish OAuth or publish a social post.

## Primary references

- [Remote server format](https://modelcontextprotocol.io/registry/remote-servers)
- [Official registry requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [Publisher commands](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md)
- [GitHub token authentication implementation](https://github.com/modelcontextprotocol/registry/blob/main/cmd/publisher/auth/github-at.go)
- [Registry terms](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/terms-of-service.mdx)

Registry submissions dedicate the submitted metadata to CC0 under the registry terms.
This dedication applies to the listing metadata, while referenced package source keeps its own license.
