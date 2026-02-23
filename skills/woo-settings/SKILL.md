---
name: woo-settings
description: Adding settings pages and options to WooCommerce admin using the WC Settings API, including new tabs, sections, and field types.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-settings

## When to use

Use this skill when:
- Adding a new settings tab to WooCommerce
- Adding a section to an existing WooCommerce settings tab
- Creating plugin/extension configuration options
- Using WC Settings API field types
- Reading and saving WooCommerce settings

## Inputs required

- Access to WordPress/WooCommerce installation
- Understanding of settings structure needed
- Field types and validation requirements

## Procedure

### Step 1: Add a New Settings Tab

```php
<?php
// Add a new settings tab
add_filter( 'woocommerce_settings_tabs_array', function( $tabs ) {
    $tabs['my_settings'] = __( 'My Settings', 'my-extension' );
    return $tabs;
}, 50 );

// Render settings fields
add_action( 'woocommerce_settings_tabs_my_settings', function() {
    woocommerce_admin_fields( my_extension_get_settings() );
} );

// Save settings
add_action( 'woocommerce_update_options_my_settings', function() {
    woocommerce_update_options( my_extension_get_settings() );
} );

function my_extension_get_settings() {
    return array(
        array(
            'title' => __( 'General Settings', 'my-extension' ),
            'type'  => 'title',
            'desc'  => __( 'Configure the main extension options.', 'my-extension' ),
            'id'    => 'my_settings_section',
        ),
        array(
            'title'   => __( 'Enable Feature', 'my-extension' ),
            'desc'    => __( 'Check to enable the main feature.', 'my-extension' ),
            'id'      => 'my_extension_enable',
            'type'    => 'checkbox',
            'default' => 'no',
        ),
        array(
            'title'   => __( 'API Key', 'my-extension' ),
            'desc'    => __( 'Enter your API key.', 'my-extension' ),
            'id'      => 'my_extension_api_key',
            'type'    => 'text',
            'default' => '',
        ),
        array(
            'title'   => __( 'Mode', 'my-extension' ),
            'id'      => 'my_extension_mode',
            'type'    => 'select',
            'options' => array(
                'sandbox' => __( 'Sandbox', 'my-extension' ),
                'live'    => __( 'Live', 'my-extension' ),
            ),
            'default' => 'sandbox',
        ),
        array(
            'type' => 'sectionend',
            'id'   => 'my_settings_section',
        ),
    );
}
```

### Step 2: Add Section to Existing Tab

```php
<?php
// Add section to Products tab
add_filter( 'woocommerce_get_sections_products', function( $sections ) {
    $sections['my_section'] = __( 'My Section', 'my-extension' );
    return $sections;
} );

// Add settings to the section
add_filter( 'woocommerce_get_settings_products', function( $settings, $section ) {
    if ( 'my_section' === $section ) {
        return array(
            array(
                'title' => __( 'My Product Settings', 'my-extension' ),
                'type'  => 'title',
                'id'    => 'my_product_settings',
            ),
            array(
                'title'             => __( 'Default Stock Quantity', 'my-extension' ),
                'id'                => 'my_extension_default_stock',
                'type'              => 'number',
                'default'           => 100,
                'custom_attributes' => array(
                    'min'  => 0,
                    'step' => 1,
                ),
            ),
            array(
                'type' => 'sectionend',
                'id'   => 'my_product_settings',
            ),
        );
    }
    return $settings;
}, 10, 2 );
```

**Available tabs to extend:**
- `general` - General settings
- `products` - Product settings
- `shipping` - Shipping settings
- `tax` - Tax settings
- `checkout` - Checkout/Payments
- `account` - Account & Privacy
- `email` - Email settings
- `advanced` - Advanced settings

### Step 3: Available Field Types

```php
<?php
function my_extension_field_examples() {
    return array(
        // Text input
        array(
            'title'       => __( 'Text Field', 'my-extension' ),
            'id'          => 'my_text_field',
            'type'        => 'text',
            'default'     => '',
            'placeholder' => __( 'Enter value', 'my-extension' ),
        ),

        // Password
        array(
            'title' => __( 'Password', 'my-extension' ),
            'id'    => 'my_password',
            'type'  => 'password',
        ),

        // Textarea
        array(
            'title' => __( 'Description', 'my-extension' ),
            'id'    => 'my_textarea',
            'type'  => 'textarea',
            'css'   => 'width: 400px; height: 100px;',
        ),

        // Checkbox
        array(
            'title'   => __( 'Enable Option', 'my-extension' ),
            'id'      => 'my_checkbox',
            'type'    => 'checkbox',
            'default' => 'no',
        ),

        // Select dropdown
        array(
            'title'   => __( 'Select Option', 'my-extension' ),
            'id'      => 'my_select',
            'type'    => 'select',
            'options' => array(
                'option1' => __( 'Option 1', 'my-extension' ),
                'option2' => __( 'Option 2', 'my-extension' ),
                'option3' => __( 'Option 3', 'my-extension' ),
            ),
            'default' => 'option1',
        ),

        // Multi-select
        array(
            'title'   => __( 'Multi Select', 'my-extension' ),
            'id'      => 'my_multiselect',
            'type'    => 'multiselect',
            'class'   => 'wc-enhanced-select',
            'options' => array(
                'opt1' => __( 'Option 1', 'my-extension' ),
                'opt2' => __( 'Option 2', 'my-extension' ),
                'opt3' => __( 'Option 3', 'my-extension' ),
            ),
        ),

        // Radio buttons
        array(
            'title'   => __( 'Radio Options', 'my-extension' ),
            'id'      => 'my_radio',
            'type'    => 'radio',
            'options' => array(
                'yes' => __( 'Yes', 'my-extension' ),
                'no'  => __( 'No', 'my-extension' ),
            ),
            'default' => 'no',
        ),

        // Number
        array(
            'title'             => __( 'Number Field', 'my-extension' ),
            'id'                => 'my_number',
            'type'              => 'number',
            'default'           => 10,
            'custom_attributes' => array(
                'min'  => 0,
                'max'  => 100,
                'step' => 5,
            ),
        ),

        // Color picker
        array(
            'title'   => __( 'Color', 'my-extension' ),
            'id'      => 'my_color',
            'type'    => 'color',
            'default' => '#0073aa',
        ),

        // Image width (special WC field)
        array(
            'title'   => __( 'Image Size', 'my-extension' ),
            'id'      => 'my_image_size',
            'type'    => 'image_width',
            'default' => array(
                'width'  => 300,
                'height' => 300,
                'crop'   => 1,
            ),
        ),
    );
}
```

### Step 4: Reading Settings

```php
<?php
// Get single option
$enabled = get_option( 'my_extension_enable', 'no' ) === 'yes';
$api_key = get_option( 'my_extension_api_key', '' );
$mode    = get_option( 'my_extension_mode', 'sandbox' );

// Get with WC helper (handles arrays/defaults better)
$value = WC_Admin_Settings::get_option( 'my_extension_api_key', '' );

// Check checkbox value
if ( 'yes' === get_option( 'my_extension_enable', 'no' ) ) {
    // Feature is enabled
}

// Get multiselect (returns array)
$selected = get_option( 'my_multiselect', array() );
```

### Step 5: Custom Field Validation

```php
<?php
add_filter( 'woocommerce_admin_settings_sanitize_option_my_extension_api_key', function( $value, $option, $raw_value ) {
    // Custom validation
    if ( strlen( $value ) < 10 ) {
        WC_Admin_Settings::add_error( __( 'API Key must be at least 10 characters.', 'my-extension' ) );
        return get_option( 'my_extension_api_key', '' ); // Return old value
    }

    // Sanitize
    return sanitize_text_field( $value );
}, 10, 3 );
```

### Step 6: Conditional Settings Display

```php
<?php
function my_extension_get_settings() {
    $settings = array(
        array(
            'title' => __( 'Settings', 'my-extension' ),
            'type'  => 'title',
            'id'    => 'my_settings',
        ),
        array(
            'title'   => __( 'Enable Advanced Mode', 'my-extension' ),
            'id'      => 'my_extension_advanced',
            'type'    => 'checkbox',
            'default' => 'no',
        ),
    );

    // Conditionally add settings
    if ( 'yes' === get_option( 'my_extension_advanced', 'no' ) ) {
        $settings[] = array(
            'title' => __( 'Advanced Option', 'my-extension' ),
            'id'    => 'my_extension_advanced_option',
            'type'  => 'text',
        );
    }

    $settings[] = array(
        'type' => 'sectionend',
        'id'   => 'my_settings',
    );

    return $settings;
}
```

## Verification

### Checklist

- [ ] Settings tab/section appears in WooCommerce > Settings
- [ ] All fields render correctly
- [ ] Settings save without errors
- [ ] Settings load with correct values after save
- [ ] Default values apply for new installations
- [ ] Validation errors display properly

### Test Commands

```bash
# Check if settings saved
wp option get my_extension_enable
wp option get my_extension_api_key

# List all extension options
wp option list --search="my_extension_*"

# Update setting via CLI
wp option update my_extension_enable yes
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Settings not saving | Missing update hook | Add `woocommerce_update_options_{tab}` action |
| Tab not appearing | Wrong hook priority | Use priority 50+ on `settings_tabs_array` |
| Fields not rendering | Missing render hook | Add `woocommerce_settings_tabs_{tab}` action |
| Checkbox always unchecked | Wrong comparison | Use `=== 'yes'` not `== true` |
| Select not enhanced | Missing class | Add `'class' => 'wc-enhanced-select'` |
| Settings reset on save | Wrong option name | Ensure `id` matches between get/update |

### Quick Checks

```bash
# Verify hooks are registered
wp eval "print_r(has_action('woocommerce_settings_tabs_my_settings'));"

# Check option exists
wp option get my_extension_enable --format=json

# Debug settings array
wp eval "print_r(my_extension_get_settings());"
```

## Escalation

- WC Settings API: https://developer.woocommerce.com/docs/settings-api.md
- Adding sections to tabs: https://developer.woocommerce.com/docs/extensions/settings-and-config/adding-a-section-to-a-settings-tab.md
- Creating custom settings: https://developer.woocommerce.com/docs/extensions/settings-and-config/implementing-settings.md
- Settings and config overview: https://developer.woocommerce.com/docs/category/settings-and-config/
- Working with admin pages: https://developer.woocommerce.com/docs/extensions/settings-and-config/working-with-woocommerce-admin-pages.md
