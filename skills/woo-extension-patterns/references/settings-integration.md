# WooCommerce Settings Integration

## Adding a Settings Tab

Create a new top-level tab in WooCommerce > Settings.

```php
<?php
namespace MyExtension;

defined( 'ABSPATH' ) || exit;

class Settings_Tab extends \WC_Settings_Page {
    public function __construct() {
        $this->id    = 'my_extension';
        $this->label = __( 'My Extension', 'my-extension' );

        parent::__construct();
    }

    public function get_settings(): array {
        return $this->get_settings_for_default_section();
    }

    protected function get_settings_for_default_section(): array {
        return [
            [
                'title' => __( 'General Settings', 'my-extension' ),
                'type'  => 'title',
                'id'    => 'my_extension_general_options',
            ],
            [
                'title'    => __( 'Enable Feature', 'my-extension' ),
                'desc'     => __( 'Enable this feature for the store.', 'my-extension' ),
                'id'       => 'my_extension_enable_feature',
                'type'     => 'checkbox',
                'default'  => 'no',
            ],
            [
                'title'   => __( 'API Key', 'my-extension' ),
                'desc'    => __( 'Enter your API key.', 'my-extension' ),
                'id'      => 'my_extension_api_key',
                'type'    => 'text',
                'default' => '',
            ],
            [
                'type' => 'sectionend',
                'id'   => 'my_extension_general_options',
            ],
        ];
    }
}

// Register the settings tab.
add_filter( 'woocommerce_get_settings_pages', function( $settings ) {
    $settings[] = new Settings_Tab();
    return $settings;
});
```

## Adding a Settings Section

Add a section to an existing WooCommerce settings tab.

```php
<?php
// Add section to Products tab.
add_filter( 'woocommerce_get_sections_products', function( $sections ) {
    $sections['my_extension'] = __( 'My Extension', 'my-extension' );
    return $sections;
});

// Add settings to the section.
add_filter( 'woocommerce_get_settings_products', function( $settings, $current_section ) {
    if ( 'my_extension' !== $current_section ) {
        return $settings;
    }

    return [
        [
            'title' => __( 'My Extension Settings', 'my-extension' ),
            'type'  => 'title',
            'id'    => 'my_extension_section',
        ],
        [
            'title'   => __( 'Option Name', 'my-extension' ),
            'id'      => 'my_extension_option',
            'type'    => 'text',
            'default' => '',
        ],
        [
            'type' => 'sectionend',
            'id'   => 'my_extension_section',
        ],
    ];
}, 10, 2 );
```

## Settings Field Types

```php
<?php
// Text input.
[
    'title'       => __( 'Text Field', 'my-extension' ),
    'id'          => 'my_text_field',
    'type'        => 'text',
    'default'     => '',
    'desc_tip'    => __( 'Tooltip help text.', 'my-extension' ),
    'placeholder' => __( 'Enter value...', 'my-extension' ),
]

// Number input.
[
    'title'             => __( 'Number Field', 'my-extension' ),
    'id'                => 'my_number_field',
    'type'              => 'number',
    'default'           => 10,
    'custom_attributes' => [
        'min'  => 0,
        'max'  => 100,
        'step' => 1,
    ],
]

// Textarea.
[
    'title'   => __( 'Textarea', 'my-extension' ),
    'id'      => 'my_textarea',
    'type'    => 'textarea',
    'default' => '',
    'css'     => 'width: 400px; height: 100px;',
]

// Select dropdown.
[
    'title'   => __( 'Select', 'my-extension' ),
    'id'      => 'my_select',
    'type'    => 'select',
    'default' => 'option_1',
    'options' => [
        'option_1' => __( 'Option 1', 'my-extension' ),
        'option_2' => __( 'Option 2', 'my-extension' ),
        'option_3' => __( 'Option 3', 'my-extension' ),
    ],
]

// Multi-select.
[
    'title'   => __( 'Multi Select', 'my-extension' ),
    'id'      => 'my_multiselect',
    'type'    => 'multiselect',
    'class'   => 'wc-enhanced-select',
    'default' => [],
    'options' => [
        'option_1' => __( 'Option 1', 'my-extension' ),
        'option_2' => __( 'Option 2', 'my-extension' ),
    ],
]

// Checkbox.
[
    'title'   => __( 'Checkbox', 'my-extension' ),
    'desc'    => __( 'Enable this option.', 'my-extension' ),
    'id'      => 'my_checkbox',
    'type'    => 'checkbox',
    'default' => 'no',
]

// Radio buttons.
[
    'title'   => __( 'Radio', 'my-extension' ),
    'id'      => 'my_radio',
    'type'    => 'radio',
    'default' => 'option_1',
    'options' => [
        'option_1' => __( 'Option 1', 'my-extension' ),
        'option_2' => __( 'Option 2', 'my-extension' ),
    ],
]

// Color picker.
[
    'title'   => __( 'Color', 'my-extension' ),
    'id'      => 'my_color',
    'type'    => 'color',
    'default' => '#ffffff',
]

// Password field.
[
    'title' => __( 'Password', 'my-extension' ),
    'id'    => 'my_password',
    'type'  => 'password',
]
```

## Reading Settings

```php
<?php
// Get single option.
$api_key = get_option( 'my_extension_api_key', '' );

// Check checkbox.
$enabled = 'yes' === get_option( 'my_extension_enable_feature', 'no' );

// Get with WC helper (handles array/serialized).
$settings = WC_Admin_Settings::get_option( 'my_extension_settings' );
```

## Custom Settings Field

```php
<?php
// Register custom field type.
add_action( 'woocommerce_admin_field_my_custom_type', function( $value ) {
    $option_value = get_option( $value['id'], $value['default'] ?? '' );
    ?>
    <tr valign="top">
        <th scope="row" class="titledesc">
            <label for="<?php echo esc_attr( $value['id'] ); ?>">
                <?php echo esc_html( $value['title'] ); ?>
            </label>
        </th>
        <td class="forminp">
            <!-- Custom field HTML -->
            <input type="text"
                   name="<?php echo esc_attr( $value['id'] ); ?>"
                   id="<?php echo esc_attr( $value['id'] ); ?>"
                   value="<?php echo esc_attr( $option_value ); ?>"
            />
            <p class="description"><?php echo esc_html( $value['desc'] ?? '' ); ?></p>
        </td>
    </tr>
    <?php
});

// Save custom field.
add_action( 'woocommerce_update_option_my_custom_type', function( $value ) {
    if ( isset( $_POST[ $value['id'] ] ) ) {
        update_option( $value['id'], sanitize_text_field( wp_unslash( $_POST[ $value['id'] ] ) ) );
    }
});
```

## Settings with Subsections

```php
<?php
class My_Settings_Page extends \WC_Settings_Page {
    public function __construct() {
        $this->id    = 'my_extension';
        $this->label = __( 'My Extension', 'my-extension' );
        parent::__construct();
    }

    public function get_sections(): array {
        return [
            ''         => __( 'General', 'my-extension' ),
            'advanced' => __( 'Advanced', 'my-extension' ),
            'api'      => __( 'API', 'my-extension' ),
        ];
    }

    protected function get_settings_for_default_section(): array {
        return [ /* General settings */ ];
    }

    protected function get_settings_for_advanced_section(): array {
        return [ /* Advanced settings */ ];
    }

    protected function get_settings_for_api_section(): array {
        return [ /* API settings */ ];
    }
}
```

## Key Gotchas

1. **Prefix option IDs** - use `my_extension_` prefix to avoid conflicts
2. **Checkbox values** - stored as 'yes'/'no' strings, not boolean
3. **Use `wc-enhanced-select`** class for searchable dropdowns
4. **Sanitize on save** - WC handles basic sanitization but custom fields need manual handling
5. **Translations** - wrap all strings in `__()` or `esc_html__()`
