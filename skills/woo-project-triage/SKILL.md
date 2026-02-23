---
name: woo-project-triage
description: Detects WooCommerce project type, version, HPOS mode, and active features. Foundation skill for routing.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-project-triage

## When to use

- Starting any WooCommerce-related task to understand the project context
- Before suggesting code patterns to ensure compatibility with project type
- When determining if HPOS (High-Performance Order Storage) patterns apply
- When checking if Block Checkout integration is needed
- Before routing to specialized WooCommerce skills (payment gateways, shipping, etc.)

## Inputs required

- `repoRoot`: Path to the repository root (defaults to current working directory)

## Procedure

### 0) Run the detection script

```bash
node skills/woo-project-triage/scripts/detect_woo_project.mjs
```

The script outputs a JSON report to stdout. Parse it to extract:

- `project.primary`: The detected project type
- `features.hposCompatible`: Whether HPOS compatibility is declared
- `features.blockCheckoutReady`: Whether Block Checkout integration exists
- `features.extensionTypes`: Array of detected extension types (payment-gateway, shipping-method, etc.)

### 1) Interpret project type

| `project.primary` | Description | Next Steps |
|-------------------|-------------|------------|
| `woo-core` | WooCommerce core repository | Use internal WC patterns, check `plugins/woocommerce/` |
| `woo-extension` | WooCommerce extension/plugin | Check HPOS compat, WC version requirements |
| `woo-theme` | Theme with WooCommerce support | Check template overrides, `woocommerce/` folder |
| `woo-site` | WordPress site with WC installed | Identify which plugin/theme to modify |
| `unknown` | Could not detect WC project | Verify WC dependency exists |

### 2) Check HPOS status

If `features.hposCompatible` is `false` and this is a `woo-extension`:

1. Look for missing `FeaturesUtil::declare_compatibility()` call
2. Check if extension uses legacy `$wpdb` queries on `wp_posts` for orders
3. Route to `woo-extension-architecture` skill for HPOS remediation

### 3) Check Block Checkout readiness

If `features.blockCheckoutReady` is `false` and extension type includes `payment-gateway` or `shipping-method`:

1. Extension may not work with Block Checkout
2. Route to `woo-blocks-toolkit` for Block integration patterns
3. See [Cart and Checkout Extensibility](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md)

### 4) Route to specialized skill

Based on `features.extensionTypes`, route to appropriate skill:

| Extension Type | Skill |
|---------------|-------|
| `payment-gateway` | `woo-extension-patterns` + `woo-blocks-toolkit` |
| `shipping-method` | `woo-extension-patterns` + `woo-blocks-toolkit` |
| Settings integration | `woo-settings` |
| Cart/checkout mods | `woo-cart-checkout` |
| Template overrides | `woo-theming` |
| General extension | `woo-extension-patterns` |

## Verification

1. Script exits with code 0 and outputs valid JSON
2. `project.primary` is not `unknown` for known WC projects
3. `features.hposCompatible` accurately reflects presence of `FeaturesUtil::declare_compatibility()`
4. `recommendations.notes` contains actionable items when issues detected

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `project.primary` is `unknown` | No WC plugin headers or class usage found | Verify this is a WooCommerce project; check for `WC requires at least` header |
| HPOS not detected but exists | Compatibility declared in non-standard location | Check for `FeaturesUtil` usage manually in `includes/` |
| Extension types empty | No WC base classes extended | Check if extension uses hooks only (still valid) |
| `scanTruncated: true` | Too many files in repo | Increase `maxFiles` in script or narrow search scope |

**Quick checks:**

```bash
# Verify WooCommerce headers exist
grep -r "WC requires at least" --include="*.php" .

# Check for HPOS compatibility
grep -r "declare_compatibility" --include="*.php" .

# Find WC class extensions
grep -r "extends WC_" --include="*.php" .
```

## Escalation

- WooCommerce extension development: https://developer.woocommerce.com/docs/getting-started.md
- HPOS compatibility guide: https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book.md
- HPOS overview: https://developer.woocommerce.com/docs/features/high-performance-order-storage.md
- Block Checkout integration: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md
