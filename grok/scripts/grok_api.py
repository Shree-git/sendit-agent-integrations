#!/usr/bin/env python3
"""Use SendIt through xAI's Responses API; Python 3.10+, no dependencies.

Run --dry-run to inspect a redacted request without network access.
Run --smoke with XAI_API_KEY and SENDIT_API_KEY to verify a read-only MCP call.
"""

from __future__ import annotations

import argparse
import copy
import ipaddress
import json
import os
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

XAI_RESPONSES_URL = "https://api.x.ai/v1/responses"
DEFAULT_MCP_URL = "https://sendit.infiniteappsai.com/api/mcp"
DEFAULT_MODEL = "grok-4.7"
READ_ONLY_TOOLS = (
    "list_connected_accounts",
    "get_platform_requirements",
    "get_scheduled_posts",
    "get_analytics",
)
WRITE_TOOLS = ("publish_content", "schedule_content")
SMOKE_PROMPT = "Call SendIt's list_connected_accounts tool and summarize the connection status. Do not publish or schedule anything."


def validate_mcp_url(url: str) -> str:
    """Remote MCP runs on xAI's servers and needs a public HTTPS URL."""
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("SENDIT_MCP_URL must be a public HTTPS URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("SENDIT_MCP_URL must not contain credentials, query parameters, or fragments")
    hostname = parsed.hostname.lower().rstrip(".")
    if hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal")) or "." not in hostname:
        raise ValueError("Remote MCP cannot reach localhost or a private network hostname")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError("Remote MCP requires a public IP address")
    return url


def build_request(
    message: str,
    sendit_api_key: str,
    *,
    model: str = DEFAULT_MODEL,
    mcp_url: str = DEFAULT_MCP_URL,
    write_tools: tuple[str, ...] = (),
    approve_writes: bool = False,
) -> dict[str, Any]:
    """Build the documented Responses API Remote MCP request."""
    if not message.strip() or not model.strip():
        raise ValueError("A non-empty message and model are required")
    if not sendit_api_key.strip() or "\n" in sendit_api_key or "\r" in sendit_api_key:
        raise ValueError("SENDIT_API_KEY is required and must be a single-line value")
    if any(tool not in WRITE_TOOLS for tool in write_tools):
        raise ValueError("Only publish_content and schedule_content can be enabled as write tools")
    if write_tools and not approve_writes:
        raise ValueError("Enabling write tools requires --approve-writes")
    allowed_tools = list(dict.fromkeys((*READ_ONLY_TOOLS, *write_tools)))
    return {
        "model": model,
        "input": [{"role": "user", "content": message}],
        "tools": [{
            "type": "mcp",
            "server_url": validate_mcp_url(mcp_url),
            "server_label": "sendit",
            "server_description": "SendIt connected social accounts, social publishing, scheduling, and analytics.",
            "allowed_tools": allowed_tools,
            "headers": {"Authorization": f"Bearer {sendit_api_key}"},
        }],
    }


def redact_request(payload: dict[str, Any]) -> dict[str, Any]:
    """Return a copy suitable for a dry-run log."""
    redacted = copy.deepcopy(payload)
    for tool in redacted.get("tools", []):
        if "headers" in tool:
            tool["headers"] = {name: "[REDACTED]" for name in tool["headers"]}
        if "authorization" in tool:
            tool["authorization"] = "[REDACTED]"
    return redacted


def call_xai(payload: dict[str, Any], xai_api_key: str) -> dict[str, Any]:
    """Send one request; transport failures never include credential-bearing bodies."""
    if not xai_api_key.strip() or "\n" in xai_api_key or "\r" in xai_api_key:
        raise ValueError("XAI_API_KEY is required and must be a single-line value")
    request = Request(
        XAI_RESPONSES_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {xai_api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=120) as response:
            result = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"xAI returned HTTP {error.code}; check API access, model, and MCP authentication") from None
    except (URLError, TimeoutError):
        raise RuntimeError("xAI request failed or timed out; check connectivity") from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise RuntimeError("xAI returned an invalid JSON response") from None
    if not isinstance(result, dict):
        raise RuntimeError("xAI returned an unexpected response shape")
    if result.get("error"):
        raise RuntimeError("xAI returned an API error; check API access and MCP authentication")
    return result


def response_text(response: dict[str, Any]) -> str:
    """Extract assistant text from a Responses API result."""
    texts = []
    for item in response.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                texts.append(content.get("text", ""))
    return "\n".join(texts)


def verify_smoke(response: dict[str, Any]) -> None:
    """Require successful tool execution, not a model's claim of connectivity."""
    calls = [item for item in response.get("output", []) if item.get("type") == "mcp_call"]
    accounts = [item for item in calls if item.get("name", "").split(".")[-1].split("__")[-1] == "list_connected_accounts"]
    if not accounts:
        raise RuntimeError("Smoke failed: response contained no list_connected_accounts MCP call")
    for call in calls:
        name = call.get("name", "").split(".")[-1].split("__")[-1]
        if name not in READ_ONLY_TOOLS:
            raise RuntimeError("Smoke failed: response contained an unexpected MCP tool")
        if call.get("error") or call.get("status") in ("failed", "incomplete"):
            raise RuntimeError("Smoke failed: MCP tool execution returned an error")
        output = call.get("output")
        if isinstance(output, str):
            try:
                output = json.loads(output)
            except json.JSONDecodeError:
                raise RuntimeError("Smoke failed: MCP result was not valid JSON") from None
        if not isinstance(output, dict) or output.get("isError") or output.get("success") is False:
            raise RuntimeError("Smoke failed: MCP result did not contain a successful tool response")
        for content in output.get("content", []):
            if content.get("type") == "text":
                try:
                    data = json.loads(content.get("text", ""))
                except json.JSONDecodeError:
                    continue
                if isinstance(data, dict) and (data.get("success") is False or data.get("isError")):
                    raise RuntimeError("Smoke failed: SendIt returned an application error")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print a redacted request without sending it")
    parser.add_argument("--smoke", action="store_true", help="Require a successful read-only account-list tool call")
    parser.add_argument("--message", default=SMOKE_PROMPT, help="Message for Grok; tools remain read-only by default")
    parser.add_argument("--allow-write-tool", action="append", choices=WRITE_TOOLS, default=[])
    parser.add_argument("--approve-writes", action="store_true", help="Authorize the named write tools for this request")
    args = parser.parse_args(argv)
    try:
        if args.smoke and args.allow_write_tool:
            raise ValueError("--smoke cannot enable write tools")
        sendit_key = os.environ.get("SENDIT_API_KEY", "")
        xai_key = os.environ.get("XAI_API_KEY", "")
        payload = build_request(
            args.message,
            sendit_key or ("dry-run-placeholder" if args.dry_run else ""),
            model=os.environ.get("XAI_MODEL", DEFAULT_MODEL),
            mcp_url=os.environ.get("SENDIT_MCP_URL", DEFAULT_MCP_URL),
            write_tools=tuple(args.allow_write_tool),
            approve_writes=args.approve_writes,
        )
        if args.dry_run:
            print(json.dumps(redact_request(payload), indent=2))
            return 0
        response = call_xai(payload, xai_key)
        if args.smoke:
            verify_smoke(response)
            print("Smoke passed: SendIt list_connected_accounts executed successfully.")
        text = response_text(response)
        for secret in (sendit_key, xai_key):
            if secret:
                text = text.replace(secret, "[REDACTED]")
        print(text or "No assistant text returned.")
        return 0
    except (ValueError, RuntimeError) as error:
        print(f"[SendIt] {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
