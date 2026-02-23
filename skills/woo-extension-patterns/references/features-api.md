# WooCommerce Features API

## Overview

The Features API (`FeaturesUtil`) allows extensions to declare compatibility with WooCommerce features and check feature status at runtime.

## Declaring Feature Compatibility

Declare compatibility in `before_woocommerce_init` hook:

```php
<?php
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        // HPOS (Custom Order Tables).
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            MY_EXTENSION_FILE,
            true
        );

        // Block-based Cart and Checkout.
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'cart_checkout_blocks',
            MY_EXTENSION_FILE,
            true
        );
    }
});
```

## Available Features

| Feature ID | Description |
|------------|-------------|
| `custom_order_tables` | HPOS - High Performance Order Storage |
| `cart_checkout_blocks` | Block-based Cart and Checkout |
| `product_block_editor` | Block-based Product Editor |

## Checking Feature Status

```php
<?php
use Automattic\WooCommerce\Utilities\FeaturesUtil;

// Check if a feature is enabled.
if ( FeaturesUtil::feature_is_enabled( 'custom_order_tables' ) ) {
    // HPOS is enabled.
}

// Check if your extension declared compatibility.
$compatibility = FeaturesUtil::get_compatible_plugins_for_feature( 'custom_order_tables' );
// Returns array of compatible plugin files.
```

## Conditional Feature Loading

```php
<?php
add_action( 'before_woocommerce_init', function() {
    $features = class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class );

    if ( $features ) {
        // Modern WooCommerce - declare compatibility.
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            MY_EXTENSION_FILE,
            true
        );
    }
});

add_action( 'woocommerce_init', function() {
    // Load feature-specific code based on enabled features.
    if ( class_exists( \Automattic\WooCommerce\Utilities\OrderUtil::class ) ) {
        if ( \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
            // Load HPOS-specific functionality.
            require_once MY_EXTENSION_PATH . 'includes/hpos-functions.php';
        }
    }
});
```

## Block Checkout Integration

Declare Block Checkout compatibility and implement integration:

```php
<?php
// Declare compatibility.
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'cart_checkout_blocks',
            MY_EXTENSION_FILE,
            true
        );
    }
});

// Register Block Checkout integration.
add_action( 'woocommerce_blocks_loaded', function() {
    if ( class_exists( 'Automattic\WooCommerce\Blocks\Integrations\IntegrationRegistry' ) ) {
        add_action(
            'woocommerce_blocks_checkout_block_registration',
            function( $integration_registry ) {
                $integration_registry->register( new My_Block_Integration() );
            }
        );
    }
});
```

## Feature Detection Pattern

```php
<?php
namespace MyExtension;

class Feature_Support {
    public static function supports_hpos(): bool {
        return class_exists( \Automattic\WooCommerce\Utilities\OrderUtil::class )
            && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
    }

    public static function supports_block_checkout(): bool {
        return class_exists( \Automattic\WooCommerce\Blocks\Integrations\IntegrationRegistry::class );
    }

    public static function supports_product_block_editor(): bool {
        return class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class )
            && \Automattic\WooCommerce\Utilities\FeaturesUtil::feature_is_enabled( 'product_block_editor' );
    }
}
```

## Handling Incompatibility

If your extension is NOT compatible with a feature:

```php
<?php
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        // Declare incompatibility - WooCommerce will show admin notice.
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            MY_EXTENSION_FILE,
            false  // Not compatible
        );
    }
});

// Show custom admin notice for incompatibility.
add_action( 'admin_notices', function() {
    if ( ! class_exists( \Automattic\WooCommerce\Utilities\OrderUtil::class ) ) {
        return;
    }

    if ( \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
        ?>
        <div class="notice notice-warning">
            <p>
                <?php esc_html_e(
                    'My Extension is not yet compatible with High-Performance Order Storage. Some features may not work correctly.',
                    'my-extension'
                ); ?>
            </p>
        </div>
        <?php
    }
});
```

## Key Gotchas

1. **Use `before_woocommerce_init`** - compatibility must be declared before WC initializes
2. **Check class exists** - `FeaturesUtil` doesn't exist in older WC versions
3. **Feature != Enabled** - declaring compatibility doesn't enable the feature
4. **Third value is boolean** - `true` = compatible, `false` = incompatible
5. **Pass plugin file path** - use main plugin file constant, not `__FILE__` in includes
