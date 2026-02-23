# HPOS (High-Performance Order Storage) Compatibility

## What is HPOS?

HPOS (formerly Custom Order Tables) stores orders in dedicated database tables instead of `wp_posts` and `wp_postmeta`. This provides better performance for stores with many orders.

**WooCommerce 8.2+**: HPOS is the default for new installations.
**WooCommerce 9.0+**: HPOS is enabled by default for all stores.

## Declaring Compatibility

Declare compatibility in `before_woocommerce_init` hook:

```php
<?php
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            MY_EXTENSION_FILE,
            true  // true = compatible, false = incompatible
        );
    }
});
```

## HPOS-Compatible Order Access

### Getting Orders

```php
<?php
// Always use wc_get_order() - works with both storage modes.
$order = wc_get_order( $order_id );

// Query orders with wc_get_orders().
$orders = wc_get_orders( [
    'status'     => 'processing',
    'limit'      => 10,
    'meta_key'   => '_custom_field',
    'meta_value' => 'value',
] );
```

### Order Meta (HPOS-Compatible)

```php
<?php
$order = wc_get_order( $order_id );

// Read meta.
$value = $order->get_meta( '_custom_field' );

// Write meta.
$order->update_meta_data( '_custom_field', 'new_value' );
$order->save();

// Delete meta.
$order->delete_meta_data( '_custom_field' );
$order->save();
```

### Avoid Legacy Patterns

```php
<?php
// BAD - Direct post meta access (breaks with HPOS).
$value = get_post_meta( $order_id, '_custom_field', true );
update_post_meta( $order_id, '_custom_field', 'value' );

// GOOD - Use WC_Order methods.
$order = wc_get_order( $order_id );
$value = $order->get_meta( '_custom_field' );
$order->update_meta_data( '_custom_field', 'value' );
$order->save();

// BAD - Direct database queries on wp_posts.
global $wpdb;
$wpdb->get_results( "SELECT * FROM {$wpdb->posts} WHERE post_type = 'shop_order'" );

// GOOD - Use wc_get_orders().
$orders = wc_get_orders( [ 'type' => 'shop_order' ] );
```

## Checking HPOS Status

```php
<?php
use Automattic\WooCommerce\Utilities\OrderUtil;

// Check if HPOS is enabled.
if ( OrderUtil::custom_orders_table_usage_is_enabled() ) {
    // HPOS is active.
}

// Get correct screen ID for order admin pages.
$screen_id = OrderUtil::custom_orders_table_usage_is_enabled()
    ? wc_get_page_screen_id( 'shop-order' )
    : 'shop_order';
```

## Admin Order Screen Compatibility

```php
<?php
// Add meta box that works with both HPOS and legacy.
add_action( 'add_meta_boxes', function() {
    $screen = class_exists( \Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class )
        && wc_get_container()->get( \Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class )->custom_orders_table_usage_is_enabled()
        ? wc_get_page_screen_id( 'shop-order' )
        : 'shop_order';

    add_meta_box(
        'my_extension_order_data',
        __( 'Extension Data', 'my-extension' ),
        'my_extension_order_meta_box_callback',
        $screen,
        'side',
        'default'
    );
});
```

## Order Data Store

```php
<?php
// Get order data store for advanced operations.
$data_store = WC_Data_Store::load( 'order' );

// Check store type.
$store_class = get_class( $data_store );
// Returns WC_Order_Data_Store_CPT or Automattic\WooCommerce\Internal\DataStores\Orders\OrdersTableDataStore
```

## Migration Considerations

When updating legacy code:

1. Replace `get_post_meta()` with `$order->get_meta()`
2. Replace `update_post_meta()` with `$order->update_meta_data()` + `$order->save()`
3. Replace `wp_posts` queries with `wc_get_orders()`
4. Replace `'shop_order'` screen with `wc_get_page_screen_id( 'shop-order' )`
5. Add `FeaturesUtil::declare_compatibility()` declaration

## Testing Both Modes

Test your extension with both storage modes:

```php
// In wp-config.php or test setup:
// Enable HPOS.
add_filter( 'woocommerce_custom_orders_table_enabled', '__return_true' );

// Disable HPOS (legacy mode).
add_filter( 'woocommerce_custom_orders_table_enabled', '__return_false' );
```

## Key Gotchas

1. **Always declare compatibility** - WooCommerce shows warnings for undeclared extensions
2. **Call `$order->save()`** after `update_meta_data()` - changes are not persisted automatically
3. **HPOS uses different table** - `{prefix}wc_orders` instead of `wp_posts`
4. **Order ID != Post ID** with HPOS - don't assume they're interchangeable
5. **Test both modes** - sync mode keeps both tables updated during transition
