# Checkout Fields (Classic)

For sites using the classic (shortcode-based) checkout.

## Add Checkout Field

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

## Remove or Modify Fields

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

## Field Sections

Available sections for `$fields`:
- `billing` - Billing address fields
- `shipping` - Shipping address fields
- `account` - Account creation fields
- `order` - Order notes section

## Field Types

- `text` - Single line text input
- `textarea` - Multi-line text
- `password` - Password field
- `select` - Dropdown (requires `options` array)
- `radio` - Radio buttons (requires `options` array)
- `checkbox` - Single checkbox
- `email` - Email input
- `tel` - Phone input
- `number` - Number input
