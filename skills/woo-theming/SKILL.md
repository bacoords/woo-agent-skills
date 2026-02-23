---
name: woo-theming
description: WooCommerce theming and styling including template overrides, custom CSS, block styles, and theme integration patterns.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-theming

## When to use

Use this skill when:
- Overriding WooCommerce templates
- Adding custom CSS to WooCommerce pages
- Styling block-based cart/checkout
- Integrating WooCommerce with a theme
- Customizing product display
- Modifying email templates

## Inputs required

- Access to WordPress/WooCommerce installation
- Understanding of desired visual changes
- Knowledge of theme structure (classic or block theme)

## Procedure

### Step 1: Declare WooCommerce Theme Support

```php
<?php
// In theme's functions.php
add_action( 'after_setup_theme', function() {
    add_theme_support( 'woocommerce' );

    // Optional: Product gallery features
    add_theme_support( 'wc-product-gallery-zoom' );
    add_theme_support( 'wc-product-gallery-lightbox' );
    add_theme_support( 'wc-product-gallery-slider' );
} );
```

---

## Template Overrides

### Find Overridable Templates

```bash
# List all WooCommerce templates
find wp-content/plugins/woocommerce/templates -name "*.php"

# Common templates:
# - single-product.php
# - content-product.php
# - archive-product.php
# - cart/cart.php
# - cart/cart-totals.php
# - checkout/form-checkout.php
# - checkout/form-billing.php
# - myaccount/my-account.php
# - myaccount/orders.php
# - emails/email-header.php
```

### Override in Theme

Copy templates to your theme maintaining the path structure:

```
your-theme/
└── woocommerce/
    ├── single-product.php
    ├── content-product.php
    ├── cart/
    │   └── cart.php
    ├── checkout/
    │   └── form-checkout.php
    └── emails/
        └── email-header.php
```

```bash
# Copy template to theme
mkdir -p wp-content/themes/your-theme/woocommerce/cart
cp wp-content/plugins/woocommerce/templates/cart/cart.php wp-content/themes/your-theme/woocommerce/cart/
```

### Override from Plugin

```php
<?php
add_filter( 'woocommerce_locate_template', function( $template, $template_name, $template_path ) {
    $plugin_path = plugin_dir_path( __FILE__ ) . 'templates/' . $template_name;

    if ( file_exists( $plugin_path ) ) {
        return $plugin_path;
    }

    return $template;
}, 10, 3 );
```

### Check Active Template Overrides

```bash
# Via WP-CLI
wp eval "
\$overrides = array();
\$template_dir = get_stylesheet_directory() . '/woocommerce/';
if (is_dir(\$template_dir)) {
    \$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(\$template_dir));
    foreach (\$files as \$file) {
        if (\$file->isFile() && \$file->getExtension() === 'php') {
            echo \$file->getPathname() . PHP_EOL;
        }
    }
}
"
```

---

## Custom CSS

### Enqueue Styles on WooCommerce Pages

```php
<?php
add_action( 'wp_enqueue_scripts', function() {
    // Only on WooCommerce pages
    if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
        wp_enqueue_style(
            'my-woo-styles',
            get_stylesheet_directory_uri() . '/assets/css/woocommerce.css',
            array(),
            '1.0.0'
        );
    }
} );

// Or for plugins
add_action( 'wp_enqueue_scripts', function() {
    if ( is_woocommerce() || is_cart() || is_checkout() ) {
        wp_enqueue_style(
            'my-extension-woo',
            plugins_url( 'assets/css/woocommerce.css', __FILE__ ),
            array(),
            '1.0.0'
        );
    }
} );
```

### Common CSS Customizations

```css
/* Product Grid */
.woocommerce ul.products li.product {
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 8px;
    transition: box-shadow 0.2s ease;
}

.woocommerce ul.products li.product:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Product Title */
.woocommerce ul.products li.product .woocommerce-loop-product__title {
    font-size: 1rem;
    font-weight: 600;
}

/* Price */
.woocommerce ul.products li.product .price {
    color: #333;
    font-size: 1.1rem;
}

.woocommerce ul.products li.product .price del {
    color: #999;
}

.woocommerce ul.products li.product .price ins {
    color: #e63946;
    text-decoration: none;
}

/* Add to Cart Button */
.woocommerce ul.products li.product .button {
    background-color: #0073aa;
    color: #fff;
    border-radius: 4px;
    padding: 0.75rem 1.5rem;
}

.woocommerce ul.products li.product .button:hover {
    background-color: #005a87;
}

/* Single Product */
.woocommerce div.product div.images {
    margin-bottom: 2rem;
}

.woocommerce div.product .product_title {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.woocommerce div.product .woocommerce-product-rating {
    margin-bottom: 1rem;
}

/* Cart Table */
.woocommerce-cart table.cart {
    border-collapse: separate;
    border-spacing: 0 0.5rem;
}

.woocommerce-cart table.cart td {
    vertical-align: middle;
    padding: 1rem;
    background: #f9f9f9;
}

/* Checkout Form */
.woocommerce-checkout .form-row {
    margin-bottom: 1.5rem;
}

.woocommerce-checkout .form-row label {
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.woocommerce-checkout .form-row input,
.woocommerce-checkout .form-row select,
.woocommerce-checkout .form-row textarea {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.75rem;
}

/* Notices */
.woocommerce-message,
.woocommerce-info {
    border-left-color: #0073aa;
}

.woocommerce-error {
    border-left-color: #e63946;
}
```

---

## Block Checkout/Cart Styling

### Enqueue Block Styles

```php
<?php
add_action( 'wp_enqueue_scripts', function() {
    if ( has_block( 'woocommerce/checkout' ) || has_block( 'woocommerce/cart' ) ) {
        wp_enqueue_style(
            'my-woo-blocks',
            get_stylesheet_directory_uri() . '/assets/css/woo-blocks.css',
            array(),
            '1.0.0'
        );
    }
} );

// Or always load for block editor and frontend
add_action( 'enqueue_block_assets', function() {
    wp_enqueue_style(
        'my-woo-blocks',
        get_stylesheet_directory_uri() . '/assets/css/woo-blocks.css',
        array(),
        '1.0.0'
    );
} );
```

### Block Checkout CSS

```css
/* Cart Block */
.wc-block-cart {
    --wc-block-components-product-name-color: #333;
}

.wc-block-cart .wc-block-cart__main {
    padding: 2rem;
    background: #f9f9f9;
    border-radius: 8px;
}

.wc-block-cart .wc-block-cart-items__row {
    border-bottom: 1px solid #eee;
    padding: 1rem 0;
}

/* Checkout Block */
.wc-block-checkout {
    --wc-block-components-text-input-border-radius: 4px;
    --wc-block-components-button-border-radius: 4px;
}

.wc-block-checkout__form {
    gap: 2rem;
}

.wc-block-checkout__main {
    padding: 2rem;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* Express Payment Buttons */
.wc-block-components-express-payment {
    border-bottom: 1px solid #eee;
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
}

/* Order Summary */
.wc-block-components-order-summary {
    background: #f9f9f9;
    padding: 1.5rem;
    border-radius: 8px;
}

/* Place Order Button */
.wc-block-components-checkout-place-order-button {
    background: #0073aa;
    font-size: 1.1rem;
    padding: 1rem 2rem;
}

.wc-block-components-checkout-place-order-button:hover {
    background: #005a87;
}

/* Form Fields */
.wc-block-components-text-input input,
.wc-block-components-text-input select {
    border: 1px solid #ddd;
    padding: 0.75rem;
}

.wc-block-components-text-input input:focus,
.wc-block-components-text-input select:focus {
    border-color: #0073aa;
    box-shadow: 0 0 0 1px #0073aa;
}
```

### CSS Custom Properties (Block Checkout)

```css
/* Use WC Blocks CSS variables for consistent theming */
:root {
    /* Colors */
    --wc-block-components-button-background-color: #0073aa;
    --wc-block-components-button-text-color: #fff;
    --wc-block-components-link-color: #0073aa;

    /* Border radius */
    --wc-block-components-border-radius: 4px;
    --wc-block-components-button-border-radius: 4px;
    --wc-block-components-text-input-border-radius: 4px;

    /* Spacing */
    --wc-block-components-product-name-font-size: 1rem;
}
```

---

## Dynamic Inline Styles

```php
<?php
add_action( 'wp_head', function() {
    $primary_color   = get_option( 'my_extension_primary_color', '#0073aa' );
    $secondary_color = get_option( 'my_extension_secondary_color', '#333' );
    ?>
    <style id="my-extension-dynamic-styles">
        :root {
            --my-ext-primary: <?php echo esc_attr( $primary_color ); ?>;
            --my-ext-secondary: <?php echo esc_attr( $secondary_color ); ?>;
        }

        .woocommerce .button,
        .woocommerce button.button {
            background-color: var(--my-ext-primary);
        }

        .woocommerce .button:hover {
            background-color: color-mix(in srgb, var(--my-ext-primary), black 15%);
        }

        .woocommerce ul.products li.product .woocommerce-loop-product__title {
            color: var(--my-ext-secondary);
        }
    </style>
    <?php
} );
```

---

## Email Template Customization

### Override Email Template

```
your-theme/
└── woocommerce/
    └── emails/
        ├── email-header.php
        ├── email-footer.php
        ├── email-styles.php
        └── customer-completed-order.php
```

### Add Email Styles

```php
<?php
// Add custom styles to emails
add_filter( 'woocommerce_email_styles', function( $css ) {
    $css .= '
        /* Custom email styles */
        #wrapper {
            background-color: #f5f5f5;
        }

        #template_header {
            background-color: #0073aa;
        }

        #template_header h1 {
            color: #ffffff;
        }

        .button {
            background-color: #0073aa !important;
            border-radius: 4px !important;
        }
    ';
    return $css;
} );
```

## Verification

### Checklist

- [ ] Theme declares WooCommerce support
- [ ] Template overrides load from correct location
- [ ] Styles apply to all WooCommerce pages
- [ ] Block checkout styles render correctly
- [ ] No style conflicts with theme
- [ ] Email templates display properly
- [ ] Responsive styles work on mobile

### Test Commands

```bash
# Check theme WC support
wp eval "var_dump(current_theme_supports('woocommerce'));"

# Find template location
wp eval "echo wc_locate_template('cart/cart.php');"

# Check for template overrides
find wp-content/themes/*/woocommerce -name "*.php" 2>/dev/null

# List overridden templates (via Status Report)
wp wc tool run get_system_status_report --user=admin | grep -A50 "Template Overrides"
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Template not overriding | Wrong directory structure | Match exact WC template path |
| Styles not loading | Wrong conditional check | Verify `is_woocommerce()` returns true |
| Block styles not applying | Missing block check | Use `has_block()` or `enqueue_block_assets` |
| Email styles missing | Filter not hooked | Use `woocommerce_email_styles` filter |
| Template changes not showing | Cache | Clear cache, check for caching plugins |
| Outdated template warning | Old template version | Update template from WC source |

### Quick Checks

```bash
# Check if WC template path is correct
wp eval "echo WC()->template_path();"

# Verify stylesheet directory
wp eval "echo get_stylesheet_directory() . '/woocommerce/';"

# Test conditional
wp eval "var_dump(is_woocommerce());" # Run on a product page
```

## Escalation

- Template structure & overrides: https://developer.woocommerce.com/docs/theming/theme-development/template-structure.md
- Classic theme handbook: https://developer.woocommerce.com/docs/theming/theme-development/classic-theme-developer-handbook.md
- Block theme development: https://developer.woocommerce.com/docs/theming/block-theme-development/theming-woo-blocks.md
- Cart and checkout theming: https://developer.woocommerce.com/docs/theming/block-theme-development/cart-and-checkout.md
- Child theme setup: https://developer.woocommerce.com/docs/theming/theme-development/set-up-a-child-theme.md
- Fixing outdated templates: https://developer.woocommerce.com/docs/theming/theme-development/fixing-outdated-woocommerce-templates.md
