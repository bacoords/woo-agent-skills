# Cart Modifications

## Add Cart Fees

```php
<?php
add_action( 'woocommerce_cart_calculate_fees', function( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
        return;
    }

    $subtotal = $cart->get_subtotal();

    // Fixed fee
    if ( $subtotal > 100 ) {
        $cart->add_fee( __( 'Handling Fee', 'my-extension' ), 5.00 );
    }

    // Percentage fee
    $cart->add_fee( __( 'Service Fee (2%)', 'my-extension' ), $subtotal * 0.02 );

    // Discount (negative fee)
    if ( $cart->get_cart_contents_count() >= 5 ) {
        $cart->add_fee( __( 'Bulk Discount', 'my-extension' ), -10.00 );
    }

    // Taxable fee
    $cart->add_fee( __( 'Taxable Fee', 'my-extension' ), 3.00, true );
} );
```

## Cart Validation

```php
<?php
add_action( 'woocommerce_check_cart_items', function() {
    $cart = WC()->cart;

    // Minimum order amount
    if ( $cart->get_subtotal() < 25 ) {
        wc_add_notice(
            __( 'Minimum order amount is $25.', 'my-extension' ),
            'error'
        );
    }

    // Maximum quantity per product
    foreach ( $cart->get_cart() as $cart_item ) {
        if ( $cart_item['quantity'] > 10 ) {
            wc_add_notice(
                sprintf( __( 'Maximum 10 units per product. %s exceeds limit.', 'my-extension' ), $cart_item['data']->get_name() ),
                'error'
            );
        }
    }

    // Product combination restriction
    $product_ids = array_column( $cart->get_cart(), 'product_id' );
    if ( in_array( 123, $product_ids ) && in_array( 456, $product_ids ) ) {
        wc_add_notice(
            __( 'Product A and Product B cannot be purchased together.', 'my-extension' ),
            'error'
        );
    }
} );
```

## Custom Cart Item Data

```php
<?php
// Add custom data when adding to cart
add_filter( 'woocommerce_add_cart_item_data', function( $cart_item_data, $product_id ) {
    if ( isset( $_POST['gift_message'] ) ) {
        $cart_item_data['gift_message'] = sanitize_textarea_field( $_POST['gift_message'] );
    }
    return $cart_item_data;
}, 10, 2 );

// Display custom data in cart
add_filter( 'woocommerce_get_item_data', function( $item_data, $cart_item ) {
    if ( ! empty( $cart_item['gift_message'] ) ) {
        $item_data[] = array(
            'key'   => __( 'Gift Message', 'my-extension' ),
            'value' => $cart_item['gift_message'],
        );
    }
    return $item_data;
}, 10, 2 );

// Save to order line item
add_action( 'woocommerce_checkout_create_order_line_item', function( $item, $cart_item_key, $values, $order ) {
    if ( ! empty( $values['gift_message'] ) ) {
        $item->add_meta_data( __( 'Gift Message', 'my-extension' ), $values['gift_message'] );
    }
}, 10, 4 );
```

## Modify Cart Item Price

```php
<?php
add_action( 'woocommerce_before_calculate_totals', function( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
        return;
    }

    foreach ( $cart->get_cart() as $cart_item ) {
        // Apply custom pricing logic
        if ( ! empty( $cart_item['custom_price'] ) ) {
            $cart_item['data']->set_price( $cart_item['custom_price'] );
        }
    }
}, 20 );
```
