# WordPress Abilities and the standard MCP Adapter

Use the WordPress Abilities API as the capability contract and the WordPress MCP Adapter as an optional transport. Do not design an ability as a one-to-one wrapper around an existing REST endpoint unless the domain operation genuinely benefits from that contract.

## Requirements and registration

The Abilities API requires WordPress 6.9 or newer.

- Register categories on `wp_abilities_api_categories_init`.
- Register abilities on `wp_abilities_api_init`.
- Use a stable `namespace/ability-name` identifier.
- Supply translatable labels/descriptions, complete input/output JSON Schemas, a callback, and a permission callback.
- Set accurate annotations for read-only, destructive, and idempotent behavior.
- Use current public/MCP metadata documented for the supported WordPress and adapter versions.
- Use `show_in_rest` only when REST discovery/execution is intended.

Verify with `wp ability exists`, `wp ability get`, `wp ability validate`, `wp ability can-run`, and a safe `wp ability run` call.

## Standard MCP server

The default server exposes adapter tools that discover and execute abilities:

- `mcp-adapter-discover-abilities`
- `mcp-adapter-get-ability-info`
- `mcp-adapter-execute-ability`

Do not expect each Woo ability to appear directly in `tools/list`.

The Woo MCP feature flag controls initialization of WooCommerce's bundled adapter, not registration of canonical Woo abilities. Abilities register independently in the WordPress Abilities registry. Before installing anything, check whether the adapter/default server already comes from Woo or from an active standalone MCP Adapter plugin; use one provider and do not initialize a duplicate.

Local STDIO configuration runs:

```text
wp --path=<site> mcp-adapter serve --server=mcp-adapter-default-server --user=<user>
```

Remote HTTP uses `@automattic/mcp-wordpress-remote` with:

```text
WP_API_URL=https://example.com/wp-json/mcp/mcp-adapter-default-server
WP_API_USERNAME=<wordpress-user>
WP_API_PASSWORD=<application-password>
```

Use a dedicated least-privileged WordPress user. Never print real credentials in generated commands, logs, or responses.

## Woo canonical abilities

Discover actual registered abilities instead of assuming them from the Woo version. The initial canonical set includes:

- `woocommerce/products-query`
- `woocommerce/product-create`
- `woocommerce/product-update`
- `woocommerce/product-delete`
- `woocommerce/orders-query`
- `woocommerce/order-update-status`
- `woocommerce/order-add-note`

Use discovery, inspect the selected ability's schema, and test a read-only query first. Do not execute a write/destructive ability to test connectivity.

## Legacy migration only

Recognize `/wp-json/woocommerce/mcp`, `X-MCP-API-Key`, Woo REST consumer keys, `woocommerce_mcp_allow_insecure_transport`, and `expose_in_deprecated_woocommerce_mcp` only to identify an old configuration.

Migrate the client to the default WordPress MCP server and application-password or local WP-CLI authentication. Verify discovery and a read-only Woo ability before recommending removal of legacy configuration. Revoke old REST keys or remove legacy code only with explicit user approval and after checking for other consumers.

Never offer the deprecated Woo endpoint as a fallback for an unsupported WordPress site.

## Current sources

- `https://developer.woocommerce.com/docs/features/mcp.md`
- `https://developer.wordpress.org/apis/abilities-api/`
- `https://github.com/WordPress/mcp-adapter/`
