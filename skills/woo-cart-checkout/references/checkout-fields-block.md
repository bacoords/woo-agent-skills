# Checkout Fields (Block Checkout)

For sites using the block-based checkout (WooCommerce 8.3+).

## Register Additional Field

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

## Field Locations

- `contact` - Contact information section (email, phone)
- `address` - Address section (appears in both billing and shipping)
- `order` - Additional information section

## Sanitize and Validate Fields

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

## Conditional Fields (WooCommerce 9.9+)

Use `hidden` and `required` parameters with JSON Schema conditions to show/hide fields dynamically.

### Show field when specific product is in cart

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

### Show field when cart needs shipping

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

### Show field based on cart total

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

### Show field based on customer country

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

## Condition Schema Reference

### Cart conditions

```php
'cart' => array(
    'properties' => array(
        // Product IDs in cart
        'items' => array(
            'contains' => array(
                'enum' => array( 74, 75, 76 ),
            ),
        ),
        // Shipping requirement
        'needs_shipping' => array(
            'const' => true,
        ),
        // Cart totals
        'totals' => array(
            'properties' => array(
                'totalPrice' => array(
                    'minimum' => 10000, // Cents
                    'maximum' => 50000,
                ),
            ),
        ),
    ),
),
```

### Customer conditions

```php
'customer' => array(
    'properties' => array(
        'address' => array(
            'properties' => array(
                'country' => array(
                    'enum' => array( 'US', 'CA' ),
                ),
            ),
        ),
    ),
),
```

### Negation

Wrap any condition in `not` to invert it:

```php
'items' => array(
    'not' => array(
        'contains' => array(
            'enum' => array( 74 ),
        ),
    ),
),
```
