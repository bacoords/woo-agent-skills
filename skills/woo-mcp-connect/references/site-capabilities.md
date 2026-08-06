# Site capabilities and pathway selection

Inspect capabilities independently. A block theme does not prove that Cart or Checkout uses blocks, and block-ready extension code does not prove that the active site uses it.

## Evidence levels

| Evidence | What it can establish |
|---|---|
| Runtime WordPress/WP-CLI result | Active plugin, theme, option, page content, command, or registered ability |
| Repository structure and code | Supported or intended behavior, never active-site state |
| User statement | Target intent; verify against runtime when access is available |

Preserve `unknown` when runtime is unavailable. Never convert a static match into an active-site fact.

## Independent capabilities

- Active theme: `block`, `classic`, or `unknown`.
- Cart page: `block`, `classic`, or `unknown`.
- Checkout page: `block`, `classic`, or `unknown`.
- HPOS: enabled, disabled, or unknown.
- WP-CLI, `wp wc`, `wp ability`, and `wp mcp-adapter`: available, unavailable, or unknown.
- WordPress Abilities API, MCP default server, and canonical Woo abilities: available, unavailable, or unknown.
- MCP Adapter provider: WooCommerce bundled adapter, active standalone plugin, unavailable, or unknown.

Run:

```bash
node scripts/inspect-woo-context.mjs
```

Use `--wp-path=<path>` when the WordPress installation is outside the repository. Use `--runtime=required` only when the task cannot be completed safely without active-site evidence.

## Selection rules

- For a site-specific task, use the active Cart/Checkout surface detected for that page.
- For a distributed extension, inspect its declared support and existing architecture. Ask which surfaces must be supported only if that decision changes the implementation and cannot be inferred.
- Prefer shared server-side Woo APIs when documented to support both flows; verify each hook against block Checkout documentation.
- Use block APIs for block UI behavior. Do not manipulate block markup through DOM selectors.
- Use classic shortcode hooks or PHP template overrides only when the target surface is confirmed classic.
- Keep site data and presentational theme work separate. Persistent business behavior belongs in an extension, not a theme.

## Ambiguity

When multiple plugin or theme roots are present, list the candidates and select only when ownership is clear. Ask for the target when two or more candidates are equally plausible.
