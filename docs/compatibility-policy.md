# Compatibility policy

## General baseline

- WooCommerce 10.x+
- WordPress 6.7+
- PHP 8.0+

Use modern Woo APIs and assume HPOS is the default order storage architecture, but inspect actual runtime state and declared project requirements. Do not add compatibility below these floors unless the repository explicitly changes its policy.

## Capability gates

- WordPress Abilities API: WordPress 6.9+
- Woo abilities through MCP: require the Abilities API, an available standard WordPress MCP Adapter server, and discovery of the needed `woocommerce/*` ability
- Block APIs and Woo Settings UI: verify availability against detected Woo/WordPress versions and current docs

Version numbers alone do not prove that a feature is enabled or registered. Report a prerequisite or unknown capability instead of substituting a deprecated pathway.

Compatibility details belong in skill procedures and references, not YAML frontmatter.
