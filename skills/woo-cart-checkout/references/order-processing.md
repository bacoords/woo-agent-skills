# Order Processing

## Modify Order Before Save

```php
<?php
add_action( 'woocommerce_checkout_order_created', function( $order ) {
    // Add custom meta
    $order->update_meta_data( '_order_source', 'web' );
    $order->update_meta_data( '_checkout_timestamp', current_time( 'mysql' ) );

    // Modify order data
    if ( $order->get_total() > 500 ) {
        $order->add_order_note( __( 'High-value order flagged for review.', 'my-extension' ) );
    }

    $order->save();
} );
```

## After Payment Complete

```php
<?php
add_action( 'woocommerce_payment_complete', function( $order_id ) {
    $order = wc_get_order( $order_id );

    // Trigger external integration
    do_action( 'my_extension_order_paid', $order );

    // Add order note
    $order->add_order_note( __( 'Payment verified successfully.', 'my-extension' ) );

    // Update meta
    $order->update_meta_data( '_payment_verified', 'yes' );
    $order->save();
} );
```

## Order Status Change

```php
<?php
add_action( 'woocommerce_order_status_changed', function( $order_id, $old_status, $new_status, $order ) {
    // When order is completed
    if ( 'completed' === $new_status ) {
        // Send to fulfillment system
        do_action( 'my_extension_fulfill_order', $order );
    }

    // When order is cancelled
    if ( 'cancelled' === $new_status ) {
        // Restore inventory, notify customer, etc.
    }
}, 10, 4 );
```

## Key Order Hooks

| Hook | When it fires |
|------|---------------|
| `woocommerce_checkout_order_created` | Order created, before payment |
| `woocommerce_payment_complete` | Payment successful |
| `woocommerce_order_status_changed` | Any status change |
| `woocommerce_order_status_{status}` | Specific status (e.g., `_completed`) |
| `woocommerce_new_order` | New order saved to database |
| `woocommerce_thankyou` | Thank you page displayed |
