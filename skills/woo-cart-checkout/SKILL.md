---
name: woo-cart-checkout
description: Modifying WooCommerce cart and checkout behavior including fees, validation, custom fields, and order processing for both classic and block checkout.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-cart-checkout

## When to use

Use this skill when:
- Adding fees or discounts to the cart
- Validating cart contents or checkout data
- Adding custom fields to checkout
- Modifying order processing
- Extending block-based cart/checkout
- Adding custom cart item data

## Inputs required

- Access to WordPress/WooCommerce installation
- Knowledge of whether site uses classic or block checkout
- Understanding of desired cart/checkout modification

## Procedure

### Step 1: Detect Checkout Type

```bash
# Check for block checkout
wp post get $(wp option get woocommerce_checkout_page_id) --field=post_content | grep -q "woocommerce/checkout" && echo "Block checkout" || echo "Classic checkout"
```

```php
<?php
// Programmatic detection
use Automattic\WooCommerce\Blocks\Utils\CartCheckoutUtils;

$is_block_checkout = class_exists( CartCheckoutUtils::class )
    && CartCheckoutUtils::is_checkout_block_default();
```

---

## Cart Modifications

### Add Cart Fees

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

### Cart Validation

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

### Custom Cart Item Data

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

### Modify Cart Item Price

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

---

## Checkout Fields (Classic)

### Add Checkout Field

```php
<?php
// Add field after billing email
add_filter( 'woocommerce_checkout_fields', function( $fields ) {
    $fields['billing']['billing_company_id'] = array(
        'type'        => 'text',
        'label'       => __( 'Company ID', 'my-extension' ),
        'placeholder' => __( 'Enter company ID', 'my-extension' ),
        'required'    => false,
        'class'       => array( 'form-row-wide' ),
        'priority'    => 35, // After company name (30)
    );

    // Add to shipping section
    $fields['shipping']['shipping_instructions'] = array(
        'type'     => 'textarea',
        'label'    => __( 'Delivery Instructions', 'my-extension' ),
        'required' => false,
        'class'    => array( 'form-row-wide' ),
    );

    return $fields;
} );

// Validate field
add_action( 'woocommerce_checkout_process', function() {
    if ( ! empty( $_POST['billing_company_id'] ) ) {
        $company_id = sanitize_text_field( $_POST['billing_company_id'] );
        if ( strlen( $company_id ) < 5 ) {
            wc_add_notice( __( 'Company ID must be at least 5 characters.', 'my-extension' ), 'error' );
        }
    }
} );

// Save to order meta
add_action( 'woocommerce_checkout_update_order_meta', function( $order_id ) {
    $order = wc_get_order( $order_id );

    if ( ! empty( $_POST['billing_company_id'] ) ) {
        $order->update_meta_data( '_billing_company_id', sanitize_text_field( $_POST['billing_company_id'] ) );
    }
    if ( ! empty( $_POST['shipping_instructions'] ) ) {
        $order->update_meta_data( '_shipping_instructions', sanitize_textarea_field( $_POST['shipping_instructions'] ) );
    }

    $order->save();
} );

// Display in admin order
add_action( 'woocommerce_admin_order_data_after_billing_address', function( $order ) {
    $company_id = $order->get_meta( '_billing_company_id' );
    if ( $company_id ) {
        echo '<p><strong>' . __( 'Company ID', 'my-extension' ) . ':</strong> ' . esc_html( $company_id ) . '</p>';
    }
} );
```

### Remove or Modify Fields

```php
<?php
add_filter( 'woocommerce_checkout_fields', function( $fields ) {
    // Remove field
    unset( $fields['billing']['billing_company'] );

    // Make field optional
    $fields['billing']['billing_phone']['required'] = false;

    // Change label
    $fields['billing']['billing_address_2']['label'] = __( 'Apartment/Suite', 'my-extension' );

    // Reorder fields (lower priority = appears first)
    $fields['billing']['billing_email']['priority'] = 5;

    return $fields;
} );
```

---

## Checkout Fields (Block Checkout)

### Register Additional Field

```php
<?php
// Use woocommerce_init hook for field registration.
add_action( 'woocommerce_init', function() {
    woocommerce_register_additional_checkout_field(
        array(
            'id'         => 'my-extension/company-id',
            'label'      => __( 'Company ID', 'my-extension' ),
            'location'   => 'address', // 'contact', 'address', or 'order'
            'type'       => 'text',
            'required'   => false,
            'attributes' => array(
                'maxLength' => 20,
            ),
        )
    );

    // Select field
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/delivery-time',
            'label'    => __( 'Preferred Delivery Time', 'my-extension' ),
            'location' => 'order',
            'type'     => 'select',
            'options'  => array(
                array( 'value' => 'morning', 'label' => __( 'Morning (9am-12pm)', 'my-extension' ) ),
                array( 'value' => 'afternoon', 'label' => __( 'Afternoon (12pm-5pm)', 'my-extension' ) ),
                array( 'value' => 'evening', 'label' => __( 'Evening (5pm-9pm)', 'my-extension' ) ),
            ),
        )
    );

    // Checkbox field
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/gift-wrap',
            'label'    => __( 'Gift wrap this order', 'my-extension' ),
            'location' => 'order',
            'type'     => 'checkbox',
        )
    );
} );
```

### Conditional Checkout Fields (WooCommerce 9.9+)

Use `hidden` and `required` parameters with JSON Schema conditions to show/hide fields dynamically.

**Show field only when specific product is in cart:**

```php
<?php
add_action( 'woocommerce_init', function() {
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/subscription-birthday',
            'label'    => __( 'Your Birthday', 'my-extension' ),
            'location' => 'order',
            'type'     => 'text',

            // Hidden when product ID 74 is NOT in cart.
            'hidden'   => array(
                'cart' => array(
                    'properties' => array(
                        'items' => array(
                            'not' => array(
                                'contains' => array(
                                    'enum' => array( 74 ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),

            // Required only when product ID 74 IS in cart.
            'required' => array(
                'cart' => array(
                    'properties' => array(
                        'items' => array(
                            'contains' => array(
                                'enum' => array( 74 ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    );
} );
```

**Show field only when cart needs shipping:**

```php
<?php
add_action( 'woocommerce_init', function() {
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/delivery-instructions',
            'label'    => __( 'Delivery Instructions', 'my-extension' ),
            'location' => 'order',
            'type'     => 'text',

            // Only show for physical products (hide when no shipping needed).
            'hidden'   => array(
                'cart' => array(
                    'properties' => array(
                        'needs_shipping' => array(
                            'const' => false,
                        ),
                    ),
                ),
            ),
        )
    );
} );
```

**Show field based on cart total:**

```php
<?php
add_action( 'woocommerce_init', function() {
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/large-order-notes',
            'label'    => __( 'Large Order Notes', 'my-extension' ),
            'location' => 'order',
            'type'     => 'text',

            // Only show for orders over $500 (hide when total <= $500).
            'hidden'   => array(
                'cart' => array(
                    'properties' => array(
                        'totals' => array(
                            'properties' => array(
                                'totalPrice' => array(
                                    'maximum' => 50000, // Cents.
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    );
} );
```

**Show field based on customer country:**

```php
<?php
add_action( 'woocommerce_init', function() {
    woocommerce_register_additional_checkout_field(
        array(
            'id'       => 'my-extension/tax-id',
            'label'    => __( 'Tax ID / VAT Number', 'my-extension' ),
            'location' => 'address',
            'type'     => 'text',

            // Only show for EU countries (hide when NOT in EU).
            'hidden'   => array(
                'customer' => array(
                    'properties' => array(
                        'address' => array(
                            'properties' => array(
                                'country' => array(
                                    'not' => array(
                                        'enum' => array( 'DE', 'FR', 'IT', 'ES', 'NL' ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    );
} );
```

### Sanitize and Validate Block Checkout Fields

```php
<?php
// Sanitize field value.
add_action(
    'woocommerce_sanitize_additional_field',
    function( $value, $key ) {
        if ( 'my-extension/company-id' !== $key ) {
            return $value;
        }
        return sanitize_text_field( strtoupper( $value ) );
    },
    10,
    2
);

// Validate field value.
add_action(
    'woocommerce_validate_additional_field',
    function( \WP_Error $errors, $key, $value ) {
        if ( 'my-extension/company-id' !== $key || empty( $value ) ) {
            return;
        }
        if ( strlen( $value ) < 5 ) {
            $errors->add(
                'invalid_company_id',
                __( 'Company ID must be at least 5 characters.', 'my-extension' )
            );
        }
    },
    10,
    3
);
```

---

## Order Processing

### Modify Order Before Save

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

### After Payment Complete

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

### Order Status Change

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

## Verification

### Checklist

- [ ] Cart fees calculate correctly
- [ ] Cart validation prevents invalid checkout
- [ ] Custom cart item data displays and saves
- [ ] Checkout fields appear in correct location
- [ ] Field validation works for both classic and block
- [ ] Order meta saves correctly
- [ ] Admin order display shows custom fields

### Test Commands

```bash
# Check order meta
wp post meta get <order_id> _billing_company_id

# List order meta
wp post meta list <order_id> | grep my_extension

# Test cart calculation
wp eval "WC()->cart->add_to_cart(123); WC()->cart->calculate_totals(); print_r(WC()->cart->get_fees());"
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Fee not showing | Hook priority too low | Use priority 20+ on `cart_calculate_fees` |
| Validation not triggering | Wrong hook | Use `checkout_process` for classic, `woocommerce_validate_additional_field` for blocks |
| Field not saving | Missing save hook | Add `checkout_update_order_meta` handler (classic) |
| Block field not appearing | Wrong hook | Register on `woocommerce_init` hook |
| Conditional field always hidden | Wrong JSON Schema | Use `not` wrapper to invert condition |
| Conditional field not updating | WC version too old | Requires WooCommerce 9.9+ for conditional fields |
| Cart item data lost | Missing unique key | Ensure cart_item_data creates unique hash |
| Fees doubled | Hook running twice | Add `is_admin()` check |

### Quick Checks

```bash
# Verify cart hooks
wp eval "print_r(has_action('woocommerce_cart_calculate_fees'));"

# Check checkout field registration
wp eval "print_r(WC()->checkout()->get_checkout_fields('billing'));"

# Test order meta
wp eval "\$order = wc_get_order(123); print_r(\$order->get_meta_data());"
```

## Escalation

- Additional checkout fields: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/additional-checkout-fields.md
- Conditional checkout fields (WC 9.9+): https://developer.woocommerce.com/docs/block-development/tutorials/how-to-conditional-additional-fields.md
- How to add checkout fields guide: https://developer.woocommerce.com/docs/block-development/tutorials/how-to-additional-checkout-fields-guide.md
- Cart and Checkout extensibility: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md
- Block Checkout architecture: https://developer.woocommerce.com/2023/09/18/architecture-of-cart-and-checkout-blocks/
- Modifying checkout fields: https://developer.woocommerce.com/2023/09/20/getting-to-know-woo-modifying-existing-cart-and-checkout-block-fields/
