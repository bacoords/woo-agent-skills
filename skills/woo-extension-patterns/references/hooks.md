# Key WooCommerce Hooks

## Initialization Hooks

```php
// Before WooCommerce initializes - use for feature declarations.
add_action( 'before_woocommerce_init', function() {
    // Declare HPOS compatibility here.
});

// After WooCommerce is fully loaded.
add_action( 'woocommerce_init', function() {
    // Safe to use all WC functions.
});

// After all WC classes are loaded.
add_action( 'woocommerce_loaded', function() {
    // Extend WC classes here.
});

// After post types registered.
add_action( 'woocommerce_after_register_post_type', function() {
    // Register custom post types that depend on WC.
});
```

## Cart Hooks

```php
// When item added to cart.
add_action( 'woocommerce_add_to_cart', function( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) {
    // Track additions, validate, etc.
}, 10, 6 );

// Modify cart item data before adding.
add_filter( 'woocommerce_add_cart_item_data', function( $cart_item_data, $product_id, $variation_id ) {
    $cart_item_data['custom_field'] = 'value';
    return $cart_item_data;
}, 10, 3 );

// Calculate cart fees.
add_action( 'woocommerce_cart_calculate_fees', function( $cart ) {
    if ( some_condition() ) {
        $cart->add_fee( __( 'Extra Fee', 'my-extension' ), 10.00 );
    }
});

// Validate cart before checkout.
add_action( 'woocommerce_check_cart_items', function() {
    if ( invalid_condition() ) {
        wc_add_notice( __( 'Cart validation failed.', 'my-extension' ), 'error' );
    }
});
```

## Checkout Hooks

```php
// Add custom checkout fields.
add_action( 'woocommerce_after_checkout_billing_form', function( $checkout ) {
    woocommerce_form_field( 'custom_field', [
        'type'     => 'text',
        'label'    => __( 'Custom Field', 'my-extension' ),
        'required' => true,
    ], $checkout->get_value( 'custom_field' ) );
});

// Validate checkout fields.
add_action( 'woocommerce_checkout_process', function() {
    if ( empty( $_POST['custom_field'] ) ) {
        wc_add_notice( __( 'Custom field is required.', 'my-extension' ), 'error' );
    }
});

// Save custom checkout data to order.
add_action( 'woocommerce_checkout_create_order', function( $order, $data ) {
    if ( ! empty( $_POST['custom_field'] ) ) {
        $order->update_meta_data( '_custom_field', sanitize_text_field( $_POST['custom_field'] ) );
    }
}, 10, 2 );
```

## Order Hooks

```php
// Order status changed.
add_action( 'woocommerce_order_status_changed', function( $order_id, $old_status, $new_status, $order ) {
    // React to status change.
}, 10, 4 );

// Specific status transitions.
add_action( 'woocommerce_order_status_pending_to_processing', function( $order_id, $order ) {
    // Order moved from pending to processing.
}, 10, 2 );

// Payment complete.
add_action( 'woocommerce_payment_complete', function( $order_id ) {
    $order = wc_get_order( $order_id );
    // Handle successful payment.
});

// Order created (HPOS-compatible).
add_action( 'woocommerce_new_order', function( $order_id, $order ) {
    // New order created.
}, 10, 2 );
```

## Product Hooks

```php
// Add custom product data tab.
add_filter( 'woocommerce_product_data_tabs', function( $tabs ) {
    $tabs['my_custom_tab'] = [
        'label'    => __( 'Custom Tab', 'my-extension' ),
        'target'   => 'my_custom_tab_data',
        'priority' => 60,
    ];
    return $tabs;
});

// Custom tab content.
add_action( 'woocommerce_product_data_panels', function() {
    global $post;
    ?>
    <div id="my_custom_tab_data" class="panel woocommerce_options_panel">
        <?php
        woocommerce_wp_text_input( [
            'id'    => '_custom_product_field',
            'label' => __( 'Custom Field', 'my-extension' ),
        ] );
        ?>
    </div>
    <?php
});

// Save custom product data.
add_action( 'woocommerce_process_product_meta', function( $post_id ) {
    $product = wc_get_product( $post_id );
    $product->update_meta_data( '_custom_product_field', sanitize_text_field( $_POST['_custom_product_field'] ?? '' ) );
    $product->save();
});

// Modify product price display.
add_filter( 'woocommerce_get_price_html', function( $price_html, $product ) {
    return $price_html . ' <small>(' . __( 'excl. tax', 'my-extension' ) . ')</small>';
}, 10, 2 );
```

## Admin Hooks

```php
// Add WooCommerce admin menu item.
add_action( 'admin_menu', function() {
    add_submenu_page(
        'woocommerce',
        __( 'My Extension', 'my-extension' ),
        __( 'My Extension', 'my-extension' ),
        'manage_woocommerce',
        'my-extension',
        'my_extension_admin_page'
    );
});

// Add settings section.
add_filter( 'woocommerce_get_sections_products', function( $sections ) {
    $sections['my_extension'] = __( 'My Extension', 'my-extension' );
    return $sections;
});

// Admin order meta boxes.
add_action( 'add_meta_boxes', function() {
    $screen = class_exists( '\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController' )
        && wc_get_container()->get( \Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class )->custom_orders_table_usage_is_enabled()
        ? wc_get_page_screen_id( 'shop-order' )
        : 'shop_order';

    add_meta_box(
        'my_extension_order_box',
        __( 'My Extension Data', 'my-extension' ),
        'my_extension_order_meta_box',
        $screen,
        'side'
    );
});
```

## Email Hooks

```php
// Add content to order emails.
add_action( 'woocommerce_email_order_details', function( $order, $sent_to_admin, $plain_text, $email ) {
    if ( $email->id === 'customer_completed_order' ) {
        echo '<p>' . __( 'Thank you for your order!', 'my-extension' ) . '</p>';
    }
}, 20, 4 );

// Add custom email.
add_filter( 'woocommerce_email_classes', function( $email_classes ) {
    $email_classes['WC_My_Custom_Email'] = new WC_My_Custom_Email();
    return $email_classes;
});
```

## Key Gotchas

1. **Use `before_woocommerce_init`** for feature declarations (HPOS, Block Checkout)
2. **Priority matters** - WC hooks often have specific execution order expectations
3. **HPOS-aware meta boxes** - use `wc_get_page_screen_id()` for order screens
4. **Checkout hooks changed** - Block Checkout uses different hooks than classic
5. **Filter vs Action** - filters must return a value, actions don't
