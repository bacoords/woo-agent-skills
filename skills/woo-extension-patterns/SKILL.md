---
name: woo-extension-patterns
description: WooCommerce extension development patterns including structure, lifecycle hooks, settings integration, HPOS compatibility declarations, and update mechanisms.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-extension-patterns

## When to use

- Creating a new WooCommerce extension from scratch
- Auditing an existing extension for HPOS/Block Checkout compatibility
- Adding settings pages to WooCommerce admin
- Implementing activation/deactivation/uninstall hooks
- Declaring feature compatibility (HPOS, Block Checkout)
- Refactoring extension to use modern WooCommerce patterns

## Inputs required

- `repoRoot`: Path to the extension's root directory

## Procedure

### 0) Triage and analyze extension

1. Run project triage:
   ```bash
   node skills/woo-project-triage/scripts/detect_woo_project.mjs
   ```

2. Run extension analysis:
   ```bash
   node skills/woo-extension-patterns/scripts/detect_woo_extensions.mjs
   ```

Parse the JSON output to understand current state.

### 1) Verify extension structure

Check `structure` section of analysis output:

| Check | Expected | Reference |
|-------|----------|-----------|
| `mainFile` exists | Plugin header found | [references/structure.md](references/structure.md) |
| `directories.includes` or `directories.src` | Has code organization | [references/structure.md](references/structure.md) |
| WC headers present | `WC requires at least`, `WC tested up to` | [references/structure.md](references/structure.md) |

If missing main plugin file or WC headers, create proper bootstrap per [references/structure.md](references/structure.md).

### 2) Check HPOS compatibility

Examine `compatibility.hpos` in analysis:

| Status | Action |
|--------|--------|
| `declared: false` | Add `FeaturesUtil::declare_compatibility()` |
| `hasLegacyPatterns: true` | Replace `get_post_meta()` with `$order->get_meta()` |
| `usesOrderUtil: false` | Consider using `OrderUtil` for HPOS-aware operations |

**Declare HPOS compatibility:**

```php
<?php
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            __FILE__,
            true
        );
    }
} );
```

**Check if HPOS is active:**

```php
<?php
use Automattic\WooCommerce\Utilities\OrderUtil;

if ( OrderUtil::custom_orders_table_usage_is_enabled() ) {
    // HPOS is active
}
```

**Replace legacy order meta access:**

```php
<?php
// OLD (not HPOS compatible):
$value = get_post_meta( $order_id, '_custom_key', true );
update_post_meta( $order_id, '_custom_key', $value );

// NEW (HPOS compatible):
$order = wc_get_order( $order_id );
$value = $order->get_meta( '_custom_key' );
$order->update_meta_data( '_custom_key', $value );
$order->save(); // Critical: must call save()
```

**Check order type (HPOS-aware):**

```php
<?php
use Automattic\WooCommerce\Utilities\OrderUtil;

// Instead of: 'shop_order' === get_post_type( $id )
if ( OrderUtil::is_order( $post_id ) ) {
    $order = wc_get_order( $post_id );
}
```

See: [HPOS Extension Recipe Book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book.md)

### 3) Check Block Checkout compatibility

Examine `compatibility.blockCheckout` in analysis:

| Status | Action |
|--------|--------|
| `declared: false` | Add Block Checkout compatibility declaration |
| `implementsIntegration: false` | If payment/shipping, add `IntegrationInterface` implementation |

**Declare Block Checkout compatibility:**

```php
<?php
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'cart_checkout_blocks',
            __FILE__,
            true
        );
    }
} );
```

**Check if Block Checkout is active:**

```php
<?php
use Automattic\WooCommerce\Blocks\Utils\CartCheckoutUtils;

if ( class_exists( CartCheckoutUtils::class ) && CartCheckoutUtils::is_checkout_block_default() ) {
    // Block checkout is active
}
```

See: [Cart and Checkout Extensibility](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md)

### 4) Verify lifecycle hooks

Check `lifecycle` section:

| Check | If Missing |
|-------|------------|
| `hasDependencyCheck: false` | Add WooCommerce active check before initialization - [references/lifecycle.md](references/lifecycle.md) |
| `hasActivation: false` | Add activation hook if extension needs setup |
| `hasUninstall: false` | Add `uninstall.php` for cleanup |

### 5) Implement settings (if needed)

If extension needs admin settings, use the `woo-settings` skill for detailed patterns.

**Quick example - Add section to existing tab:**

```php
<?php
// Add section to Products tab
add_filter( 'woocommerce_get_sections_products', function( $sections ) {
    $sections['my_section'] = __( 'My Section', 'my-extension' );
    return $sections;
} );

add_filter( 'woocommerce_get_settings_products', function( $settings, $section ) {
    if ( 'my_section' === $section ) {
        return array(
            array(
                'title' => __( 'My Settings', 'my-extension' ),
                'type'  => 'title',
                'id'    => 'my_settings',
            ),
            array(
                'title'   => __( 'Enable Feature', 'my-extension' ),
                'id'      => 'my_extension_enable',
                'type'    => 'checkbox',
                'default' => 'no',
            ),
            array( 'type' => 'sectionend', 'id' => 'my_settings' ),
        );
    }
    return $settings;
}, 10, 2 );
```

See: [Settings API](https://developer.woocommerce.com/docs/settings-api.md) and [Adding Sections](https://developer.woocommerce.com/docs/extensions/settings-and-config/adding-a-section-to-a-settings-tab.md)

## Verification

1. Detection script runs without errors
2. `compatibility.hpos.declared` is `true`
3. `compatibility.hpos.hasLegacyPatterns` is `false`
4. `lifecycle.hasDependencyCheck` is `true`
5. Plugin activates without errors when WooCommerce is active
6. Plugin shows appropriate notice when WooCommerce is missing

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "WooCommerce not found" errors | Missing dependency check | Add `class_exists('WooCommerce')` check on `plugins_loaded` |
| HPOS warning in admin | Missing compatibility declaration | Add `FeaturesUtil::declare_compatibility()` in `before_woocommerce_init` |
| Orders not saving custom data | Using `update_post_meta()` | Replace with `$order->update_meta_data()` + `$order->save()` |
| Settings not saving | Missing nonce or wrong option name | Check `woocommerce_update_options` hook |
| Extension loads before WC | Wrong hook priority | Use `plugins_loaded` with priority 20+ |

**Quick checks:**

```bash
# Find HPOS compatibility declaration
grep -r "declare_compatibility" --include="*.php" .

# Find legacy order meta access
grep -r "get_post_meta.*order" --include="*.php" .

# Find WC dependency check
grep -r "class_exists.*WooCommerce" --include="*.php" .
```

## Escalation

- Extension development guide: https://developer.woocommerce.com/docs/getting-started.md
- HPOS recipe book: https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book.md
- HPOS overview: https://developer.woocommerce.com/docs/features/high-performance-order-storage.md
- Compatibility declarations: https://developer.woocommerce.com/docs/compatibility-and-interoperability-for-woocommerce-extensions.md
- Settings API: https://developer.woocommerce.com/docs/settings-api.md
- Block Checkout integration: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md
