---
name: woo-extension-dev
description: Build, modify, review, or debug WooCommerce extensions and plugins. Use for Woo registration and lifecycle, settings or Woo Admin pages, HPOS and orders, Cart or Checkout customization, Store API and block integrations, payment or shipping extensions, WordPress Abilities, or any task that must choose between classic and block Woo extensibility.
---

# Woo extension development

## Start with evidence

1. Inspect the repository and available WordPress runtime:

   ```bash
   node scripts/inspect-woo-context.mjs
   ```

2. Read [site capabilities](references/site-capabilities.md). Keep active theme, Cart, and Checkout pathways independent. Preserve `unknown` when no runtime evidence exists.
3. Search current Woo documentation before selecting an API. Follow [the documentation-first workflow](references/docs-first.md).
4. State the detected context, selected extensibility surface, and source documents before implementing.

If block versus classic changes the design and remains unknown after inspection, ask one focused question about the required target surfaces.

## Load only the relevant domain

- Bootstrap, lifecycle, feature declarations, scripts, and assets: [extension registration](references/extension-registration.md)
- Settings, integrations, settings tabs/sections, or Woo Admin pages: [settings and admin](references/settings-admin.md)
- Cart calculations, validation, checkout fields, or order creation: [Cart and Checkout](references/cart-checkout.md)
- Orders, metadata, status transitions, or storage: [orders and HPOS](references/orders-hpos.md)
- Store API, Checkout blocks, payment/shipping block UI, or client registries: [block integrations](references/block-integrations.md)
- Agent-callable operations, WordPress Abilities, or MCP exposure: [Abilities and MCP](references/abilities-mcp.md)

For domains not bundled here, use the same inspection and docs-first sequence rather than improvising a pattern.

## Implement

- Follow the repository's existing architecture and tooling when compatible with current docs.
- Put persistent business behavior in an extension, not a theme.
- Use Woo-owned APIs and CRUD boundaries instead of direct database, DOM, or generic WordPress workarounds.
- Gate version-specific APIs against detected or declared versions.
- Add server-side validation, authorization, sanitization, escaping, and idempotency appropriate to the operation.
- Keep classic and block adapters separate around shared domain logic when both are required.

## Verify

1. Run the repository's focused tests, lint, and production build.
2. Exercise the detected active pathway; test both pathways only when the extension claims both.
3. Re-run the inspector after structural or registration changes.
4. Confirm feature declarations, packaged asset metadata, permissions, failure handling, and logs.
5. Report any runtime or documentation gap that limited verification.

## Compatibility

Default new work to WooCommerce 10.x+, WordPress 6.7+, and PHP 8.0+. Honor stricter project requirements. Require WordPress 6.9+ for the Abilities API, and verify evolving APIs against current documentation before use.
