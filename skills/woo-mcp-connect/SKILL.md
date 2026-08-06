---
name: woo-mcp-connect
description: Connect AI clients to WooCommerce abilities through the standard WordPress MCP Adapter, verify discovery and safe execution, troubleshoot WordPress MCP connectivity, or migrate a deprecated Woo-specific MCP configuration. Use for local STDIO, remote HTTP, application-password authentication, default MCP server discovery, and Woo ability availability.
---

# Connect Woo abilities through WordPress MCP

Use the WordPress Abilities API as the capability layer and the WordPress MCP Adapter as the transport. Do not configure the deprecated Woo-specific server for new connections.

## Inspect first

1. Gather the local WordPress path or remote site URL, environment type, intended WordPress user, MCP client, and required read/write operations.
2. Run:

   ```bash
   node scripts/inspect-woo-context.mjs --wp-path=<local-wordpress-path>
   ```

   For a remote-only site, inspect the available repository and gather version/adapter facts from the site administrator.
3. Read [Abilities and standard MCP](references/abilities-mcp.md) and [site capabilities](references/site-capabilities.md).
4. Follow [the documentation-first workflow](references/docs-first.md) because the adapter and ability metadata are evolving.

Require WordPress 6.9 or newer. Confirm that canonical `woocommerce/*` abilities are actually registered; do not infer them from a version number alone.

## Select one standard transport

### Local WordPress: STDIO

Prefer the existing default adapter server:

```json
{
  "mcpServers": {
    "wordpress-woo": {
      "command": "wp",
      "args": [
        "--path=/absolute/path/to/wordpress",
        "mcp-adapter",
        "serve",
        "--server=mcp-adapter-default-server",
        "--user=least-privileged-user"
      ]
    }
  }
}
```

### Remote WordPress: HTTP proxy

Use a dedicated least-privileged WordPress user and an Application Password:

```json
{
  "mcpServers": {
    "wordpress-woo": {
      "command": "npx",
      "args": ["-y", "@automattic/mcp-wordpress-remote@latest"],
      "env": {
        "WP_API_URL": "https://example.com/wp-json/mcp/mcp-adapter-default-server",
        "WP_API_USERNAME": "wordpress-user",
        "WP_API_PASSWORD": "application-password"
      }
    }
  }
}
```

Keep real credentials out of chat, shell history, committed files, screenshots, and logs. Translate the generic configuration to client-specific syntax only when needed.

## Verify safely

1. Confirm the default server is available with `wp mcp-adapter list` for local sites.
2. Confirm `tools/list` exposes the adapter's discovery, info, and execution tools. Do not expect one top-level MCP tool per Woo ability.
3. Call ability discovery and confirm the required `woocommerce/*` IDs.
4. Inspect the selected ability schema and annotations.
5. Execute a read-only query, such as product or order discovery, with the minimum result size.
6. Do not execute a write or destructive ability merely to prove connectivity.

## Migrate legacy configurations

If the inspector reports legacy signals, use the migration section in [Abilities and standard MCP](references/abilities-mcp.md). Produce a redacted configuration diff, establish the standard connection, and verify a read-only Woo ability first. Recommend credential revocation or code removal only after checking for other consumers and obtaining explicit approval.

## Troubleshoot

- No Abilities API: upgrade WordPress; do not fall back to the deprecated Woo server.
- No adapter/default server: determine whether Woo's bundled adapter or the standalone WordPress adapter should own it; avoid duplicate packages.
- No Woo abilities: verify Woo activation/version, inspect `wp ability list`, and check registration errors.
- Authentication failure: verify the WordPress user/Application Password and HTTPS endpoint without printing secrets.
- Permission failure: inspect the ability permission callback and current user's capabilities.
- Unexpected write exposure: review ability annotations, schema, permissions, and MCP public metadata before continuing.

## Compatibility

Require WordPress 6.9+ and actual discovery of the needed Woo abilities. Treat the standard adapter and Woo MCP integration as evolving APIs and verify current documentation during every setup or migration.
