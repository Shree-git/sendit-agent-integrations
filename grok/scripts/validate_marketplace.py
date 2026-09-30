#!/usr/bin/env python3
"""Validate this bundle's exported Cursor Marketplace discovery paths."""

import argparse
import json
from pathlib import Path, PurePosixPath
import re
import sys


def relative_path(root: Path, value: str) -> Path:
    """Resolve a manifest path without escaping its declared package root."""
    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts or "\\" in value:
        raise ValueError("Manifest paths must be relative and cannot contain parent traversal")
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError("Manifest path resolves outside its package")
    return resolved


def validate_marketplace(root: Path) -> list[str]:
    """Check the documented fields used by this distribution, then resolve each plugin."""
    manifest_path = root / ".cursor-plugin" / "marketplace.json"
    if manifest_path.stat().st_size > 10 * 1024 * 1024:
        raise ValueError("Marketplace manifest exceeds Cursor's 10 MB limit")
    marketplace = json.loads(manifest_path.read_text())
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", marketplace.get("name", "")):
        raise ValueError("Marketplace name must be kebab-case")
    if not isinstance(marketplace.get("owner"), dict) or not marketplace["owner"].get("name"):
        raise ValueError("Marketplace owner.name is required")
    plugins = marketplace.get("plugins")
    if not isinstance(plugins, list) or not plugins:
        raise ValueError("Marketplace plugins must be a non-empty array")
    names = []
    for entry in plugins:
        name = entry.get("name", "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or name in names:
            raise ValueError("Plugin names must be unique kebab-case identifiers")
        if not isinstance(entry.get("source"), str):
            raise ValueError("This distribution uses string plugin source directories")
        plugin_root = relative_path(root, entry["source"])
        manifest = json.loads((plugin_root / ".cursor-plugin" / "plugin.json").read_text())
        if manifest.get("name") != name:
            raise ValueError("Marketplace entry name does not match the plugin manifest")
        for field in ("logo", "mcpServers", "skills"):
            value = manifest.get(field)
            if not isinstance(value, str) or not relative_path(plugin_root, value).exists():
                raise ValueError(f"Plugin {field} does not resolve to a bundled path")
        skills = relative_path(plugin_root, manifest["skills"])
        if not skills.is_dir() or not any(skills.glob("*/SKILL.md")):
            raise ValueError("Plugin skills path contains no packaged skill")
        mcp = json.loads(relative_path(plugin_root, manifest["mcpServers"]).read_text())
        if not isinstance(mcp.get("mcpServers"), dict) or not mcp["mcpServers"]:
            raise ValueError("Plugin MCP config contains no servers")
        names.append(name)
    return names


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, help="Root of the exported public Git repository")
    args = parser.parse_args()
    try:
        names = validate_marketplace(args.root)
        print("Marketplace discovery paths valid: " + ", ".join(names))
    except (OSError, ValueError, TypeError) as error:
        print(f"[SendIt] Marketplace validation failed: {error}", file=sys.stderr)
        sys.exit(1)
