# Public Marketplace placement

Copy `.cursor-plugin/marketplace.json` from this directory to the root of the public `sendit-agent-integrations` repository.
The published path must be `.cursor-plugin/marketplace.json`, beside `grok/`, `cli/`, and `muse/`.
Copy the Grok plugin package to `grok/` without changing its `.cursor-plugin/plugin.json`, skill paths, or MCP path.
The marketplace entry resolves `grok/.cursor-plugin/plugin.json` from that repository root.

Only `grok/` is a Cursor-format plugin in this distribution.
The CLI and Muse folders are not Marketplace entries.

The manifest fields and root placement follow [Cursor's plugin reference](https://cursor.com/docs/reference/plugins#cursor-multi-plugin-repositories), checked on September 29, 2026.
The manifest names the public publisher, lists the Grok plugin once, and uses a relative source directory.

Validate the exported repository before pushing:

```bash
python3 grok/scripts/validate_marketplace.py .
```

This check verifies discovery paths and bundled assets.
It does not establish Cursor catalog acceptance or Grok Bot installation.
