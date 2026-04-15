---
name: woo-mcp-connect
description: Connect WooCommerce to AI coding assistants via the Model Context Protocol (MCP). Guides through enabling the feature, creating API credentials, and configuring Claude Code or other MCP clients.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-mcp-connect

Connect WooCommerce to AI coding assistants via the Model Context Protocol (MCP).

## When to use

- User wants to connect their WooCommerce store to Claude Code or another MCP client
- User asks about WooCommerce MCP setup or configuration
- User wants AI assistants to interact with their store's products, orders, or data

## Documentation

- [WooCommerce MCP Documentation](https://developer.woocommerce.com/docs/features/mcp.md)

## Inputs required

Before starting, gather from the user:

1. **Store URL** - The full URL of their WooCommerce store (e.g., `https://mystore.com`)
2. **Environment type** - Is this a production site or local development?

## Procedure

### Step 1: Gather information

Ask the user:
- What is your WooCommerce store URL?
- Is this a production site or local development environment?

### Step 2: Enable MCP feature

The MCP integration feature must be enabled in WooCommerce. Provide the user with one of these options:

**Option A: Via WooCommerce Settings (easiest)**

Go to **WooCommerce → Settings → Advanced → Features** and enable "MCP Integration":
- Direct link: `{STORE_URL}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=features#woocommerce_feature_mcp_integration_enabled`

**Option B: Via WP-CLI**
```bash
wp option update woocommerce_feature_mcp_integration_enabled yes
```

**Option C: Via code in theme/plugin**
```php
add_filter( 'woocommerce_features', function( $features ) {
    $features['mcp_integration'] = true;
    return $features;
});
```

### Step 3: Local development only - Allow insecure transport

If the user is on local development (HTTP, not HTTPS), they need to add this filter:

```php
add_filter( 'woocommerce_mcp_allow_insecure_transport', '__return_true' );
```

### Step 4: Create API credentials

Guide the user to create REST API credentials:

1. Go to **WooCommerce → Settings → Advanced → REST API**
   - Direct link: `{STORE_URL}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
2. Click **Add Key**
3. Enter a description (e.g., "Claude Code MCP")
4. Set permissions to **Read/Write** (or appropriate level for their needs)
5. Click **Generate API Key**
6. **Save both keys** - the Consumer Key and Consumer Secret are shown only once

The credentials format is: `consumer_key:consumer_secret`

### Step 5: Configure Claude Code

Provide the user with the command to add the MCP server to Claude Code:

```bash
claude mcp add woocommerce_mcp \
  --env WP_API_URL={STORE_URL}/wp-json/woocommerce/mcp \
  --env CUSTOM_HEADERS='{"X-MCP-API-Key": "{CONSUMER_KEY}:{CONSUMER_SECRET}"}' \
  -- npx -y @automattic/mcp-wordpress-remote@latest
```

Replace the placeholders with the user's actual values:
- `{STORE_URL}` - Their store URL
- `{CONSUMER_KEY}` - The consumer key from Step 4
- `{CONSUMER_SECRET}` - The consumer secret from Step 4

### Step 6: Alternative - Manual MCP configuration

If the user prefers manual configuration or uses a different MCP client, provide this JSON config:

```json
{
  "mcpServers": {
    "woocommerce_mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@automattic/mcp-wordpress-remote@latest"],
      "env": {
        "WP_API_URL": "{STORE_URL}/wp-json/woocommerce/mcp",
        "CUSTOM_HEADERS": "{\"X-MCP-API-Key\": \"{CONSUMER_KEY}:{CONSUMER_SECRET}\"}"
      }
    }
  }
}
```

## Verification

After setup, verify the connection works:

1. Restart Claude Code (or the MCP client)
2. The WooCommerce MCP server should appear in the available tools
3. Test with a simple query like "List recent orders" or "Show products"

If issues occur, check:
- **WooCommerce → Status → Logs** (filter for `woocommerce-mcp`)
- Verify the API key has correct permissions
- Confirm the MCP feature is enabled
- For local dev: ensure the insecure transport filter is active

## Failure modes

| Issue | Cause | Solution |
|-------|-------|----------|
| Server unavailable | MCP feature not enabled | Run the WP-CLI command or add the filter |
| Authentication fails | Invalid credentials | Verify key:secret format, regenerate if needed |
| Connection refused | HTTPS required on production | Ensure site uses HTTPS |
| Connection refused (local) | HTTP blocked | Add `woocommerce_mcp_allow_insecure_transport` filter |

## Available MCP operations

Once connected, the MCP server provides these capabilities:

- **Products**: List, retrieve, create, update, delete (with filtering/pagination)
- **Orders**: List, retrieve, create, update (with filtering/pagination)

All operations respect WooCommerce's existing permission systems.
