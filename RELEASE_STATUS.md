# SendIt public agent integration release

Verified on September 29, 2026 in Pacific time.
The recommended full MCP endpoint is `https://sendit.infiniteappsai.com/api/mcp`.
Read-only production discovery returned 148 tools.

## Publication

| Distribution | Published result | Review or authentication remaining |
| --- | --- | --- |
| Official MCP Registry | `io.github.Shree-git/sendit` 1.2.0 is active and latest, with the canonical endpoint and public source | User OAuth and social writes were not part of this metadata check |
| Hermes | Public skill tap and release 0.3.0; actual native GitHub skill install verified | Upstream skill and OAuth catalog PR #27727 is open and unmerged |
| OpenClaw runtime | ClawHub `@senditapp/openclaw` 0.2.0 has a clean scan; actual registry install loaded all 41 tools without diagnostics | npm 0.2.0 still needs publisher security-key authentication |
| OpenClaw standalone skill | ClawHub skill 0.2.1 has a clean security verdict; also bundled in the runtime | Its generated Skill Card is missing even after an owner rescan, so standalone registry verification fails |
| Terminal CLI | Public GitHub archive 0.2.1 provides discovery, calls, verification, host config, and the stdio bridge | npm 0.2.1 still needs publisher security-key authentication |
| Grok | Public custom connector instructions, Responses API bot, workflow skill, and valid Cursor marketplace bundle | Publisher application is prepared; submitting accepts legal terms; native Grok Bot import and listing are unverified |
| Muse | Public connection brief, native Muse Code skill, and OAuth settings installer | Directory form is prepared at Review; accepting terms and submitting needs user confirmation, then Meta review |

## Install published packages

```bash
openclaw plugins install clawhub:@senditapp/openclaw@0.2.0
npx --yes --package=https://github.com/Shree-git/sendit-agent-integrations/releases/download/v0.2.1/senditapp-mcp-0.2.1.tgz sendit --help
hermes skills install Shree-git/sendit-hermes-skills/skills/sendit
```

Hermes currently gives the community skill a CAUTION verdict for declared config writes and localhost OAuth callbacks.
Review those findings and the public source before using the documented `--force` install override.
The verified native test used that reviewed override in an isolated home.

See [Grok setup](https://github.com/Shree-git/sendit-agent-integrations/tree/main/grok) and [Muse setup](https://github.com/Shree-git/sendit-agent-integrations/tree/main/muse).
Muse Code 1.4.1 successfully validates and installs the native skill and accepts the MCP settings format.
That stable build disables its preview plugin feature, so skill installation is the tested route.

## Validation

- CLI: 13 executable and MCP SDK acceptance tests passed.
- OpenClaw: 62 unit and contract tests passed, with packed-host acceptance on Node 24 and 26 and a separate actual ClawHub installation on OpenClaw 2026.9.6.
- Hermes: seven native config installer scenarios passed; eight installed files matched their public GitHub blob hashes.
- Grok: eight request, permission, dry-run, smoke-result, and marketplace discovery tests passed.
- Muse: five settings installer tests passed, followed by native skill validation and installation.
- Public GitHub CI passed for the agent integration and OpenClaw repositories.
- An authenticated read of platform requirements succeeded through the installed SendIt connector.

No test sent a social post.
Production discovery and registry metadata do not prove a new OAuth grant in Hermes, Grok, or Muse.
The installed connector read verifies an existing authenticated connection only.
Live xAI API execution needs the user's xAI and SendIt credentials.

## Public source and submissions

- [Agent integration source](https://github.com/Shree-git/sendit-agent-integrations)
- [Hermes tap and releases](https://github.com/Shree-git/sendit-hermes-skills)
- [Hermes upstream PR](https://github.com/NousResearch/hermes-agent/pull/27727)
- [OpenClaw source and releases](https://github.com/Shree-git/sendit-openclaw)
- [ClawHub skill](https://clawhub.ai/shree-git/skills/sendit-openclaw)
- [Official MCP Registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.Shree-git%2Fsendit/versions/latest)

The private application repository stays private.
The public bundles contain integration source, MIT licensing, and documentation without account credentials.
Application website documentation edits are local; this publication does not deploy the shared application workspace.
