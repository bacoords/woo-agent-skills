---
name: woo-blocks-toolkit
description: WooCommerce block development tools including wp-scripts for block development, checkout/cart block extension points, and block-based customization patterns.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-blocks-toolkit

## When to use

Use this skill when:
- Developing custom blocks for WooCommerce
- Extending the Cart or Checkout blocks
- Adding payment method integrations to block checkout
- Creating custom product blocks
- Using wp-scripts for WooCommerce block development
- Building slotfill extensions for WooCommerce blocks
- Customizing block-based store templates

## Inputs required

- Node.js and npm installed
- Access to WordPress installation with WooCommerce
- Familiarity with React and JavaScript
- Understanding of target integration point (Cart/Checkout/Product)
- WooCommerce Blocks plugin or WooCommerce 8.3+ (blocks included)

## Procedure

### Step 1: Set Up Development Environment

```bash
# Initialize new block plugin
npx @wordpress/create-block@latest my-woo-blocks --namespace=my-woo-blocks

# Navigate to plugin directory
cd my-woo-blocks

# Install WooCommerce block dependencies
npm install @woocommerce/blocks-checkout @woocommerce/blocks-registry @woocommerce/settings --save
```

**For existing plugin:**
```bash
# Add wp-scripts
npm install @wordpress/scripts --save-dev

# Add WooCommerce dependencies
npm install @woocommerce/blocks-checkout @woocommerce/blocks-registry @woocommerce/settings --save
```

### Step 2: Configure Build Scripts

**package.json:**
```json
{
  "scripts": {
    "build": "wp-scripts build",
    "start": "wp-scripts start",
    "lint:js": "wp-scripts lint-js",
    "lint:css": "wp-scripts lint-style",
    "format": "wp-scripts format"
  }
}
```

**webpack.config.js (if custom config needed):**
```javascript
const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
    ...defaultConfig,
    entry: {
        'checkout-extension': './src/checkout-extension/index.js',
        'product-block': './src/product-block/index.js',
    },
};
```

### Step 3: Extend Checkout Block - Add Checkout Field

```javascript
// src/checkout-extension/index.js
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import { __ } from '@wordpress/i18n';

const MyCheckoutField = ({ checkoutExtensionData }) => {
    const { setExtensionData } = checkoutExtensionData;

    return (
        <div className="my-checkout-field">
            <label htmlFor="gift-message">
                {__('Gift Message', 'my-woo-blocks')}
            </label>
            <textarea
                id="gift-message"
                onChange={(e) => setExtensionData('my-woo-blocks', 'gift_message', e.target.value)}
            />
        </div>
    );
};

registerCheckoutBlock({
    metadata: {
        name: 'my-woo-blocks/gift-message',
        parent: ['woocommerce/checkout-shipping-address-block'],
    },
    component: MyCheckoutField,
});
```

**Register on server side:**
```php
<?php
add_action( 'woocommerce_blocks_loaded', function() {
    require_once __DIR__ . '/includes/class-checkout-extension.php';
} );

// includes/class-checkout-extension.php
use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

class My_Checkout_Extension implements IntegrationInterface {
    public function get_name() {
        return 'my-checkout-extension';
    }

    public function initialize() {
        $this->register_scripts();
    }

    public function get_script_handles() {
        return array( 'my-checkout-extension' );
    }

    public function get_editor_script_handles() {
        return array( 'my-checkout-extension' );
    }

    public function get_script_data() {
        return array(
            'option_value' => get_option( 'my_option', '' ),
        );
    }

    private function register_scripts() {
        $asset = require plugin_dir_path( __FILE__ ) . '../build/checkout-extension.asset.php';

        wp_register_script(
            'my-checkout-extension',
            plugins_url( 'build/checkout-extension.js', dirname( __FILE__ ) ),
            $asset['dependencies'],
            $asset['version'],
            true
        );
    }
}

add_action( 'woocommerce_blocks_checkout_block_registration', function( $registry ) {
    $registry->register( new My_Checkout_Extension() );
} );
```

### Step 4: Add Payment Method to Block Checkout

```javascript
// src/payment-method/index.js
import { registerPaymentMethod } from '@woocommerce/blocks-registry';
import { getSetting } from '@woocommerce/settings';
import { decodeEntities } from '@wordpress/html-entities';

const settings = getSetting('my_gateway_data', {});
const label = decodeEntities(settings.title || 'My Payment Method');

const Content = () => {
    return <div>{decodeEntities(settings.description || '')}</div>;
};

const Label = () => {
    return <span>{label}</span>;
};

registerPaymentMethod({
    name: 'my_gateway',
    label: <Label />,
    content: <Content />,
    edit: <Content />,
    canMakePayment: () => true,
    ariaLabel: label,
    supports: {
        features: settings.supports || [],
    },
});
```

**Server-side registration:**
```php
<?php
use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

class My_Gateway_Blocks extends AbstractPaymentMethodType {
    protected $name = 'my_gateway';

    public function initialize() {
        $this->settings = get_option( 'woocommerce_my_gateway_settings', array() );
    }

    public function is_active() {
        return ! empty( $this->settings['enabled'] ) && 'yes' === $this->settings['enabled'];
    }

    public function get_payment_method_script_handles() {
        $asset = require plugin_dir_path( __FILE__ ) . '../build/payment-method.asset.php';

        wp_register_script(
            'my-gateway-blocks',
            plugins_url( 'build/payment-method.js', dirname( __FILE__ ) ),
            $asset['dependencies'],
            $asset['version'],
            true
        );

        return array( 'my-gateway-blocks' );
    }

    public function get_payment_method_data() {
        return array(
            'title'       => $this->settings['title'] ?? 'My Gateway',
            'description' => $this->settings['description'] ?? '',
            'supports'    => array( 'products' ),
        );
    }
}

add_action( 'woocommerce_blocks_payment_method_type_registration', function( $registry ) {
    $registry->register( new My_Gateway_Blocks() );
} );
```

### Step 5: Create Custom Product Block

```javascript
// src/product-block/index.js
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

registerBlockType('my-woo-blocks/product-badge', {
    apiVersion: 2,
    title: __('Product Badge', 'my-woo-blocks'),
    category: 'woocommerce',
    icon: 'tag',
    attributes: {
        badgeText: {
            type: 'string',
            default: 'Sale',
        },
    },
    edit: ({ attributes, setAttributes }) => {
        const blockProps = useBlockProps();

        return (
            <div {...blockProps}>
                <input
                    type="text"
                    value={attributes.badgeText}
                    onChange={(e) => setAttributes({ badgeText: e.target.value })}
                />
            </div>
        );
    },
    save: ({ attributes }) => {
        const blockProps = useBlockProps.save();

        return (
            <div {...blockProps}>
                <span className="product-badge">{attributes.badgeText}</span>
            </div>
        );
    },
});
```

### Step 6: Use Store API in Blocks

```javascript
// src/components/ProductStock.js
import { useSelect } from '@wordpress/data';
import { CART_STORE_KEY } from '@woocommerce/block-data';

const CartTotal = () => {
    const cartTotals = useSelect((select) => {
        const store = select(CART_STORE_KEY);
        return store.getCartTotals();
    });

    return (
        <div className="my-cart-total">
            Total: {cartTotals.total_price}
        </div>
    );
};

export default CartTotal;
```

### Step 7: Build and Deploy

```bash
# Development mode (watch for changes)
npm start

# Production build
npm run build

# Lint code
npm run lint:js
npm run lint:css

# Format code
npm run format
```

**Deploy checklist:**
```bash
# Build production assets
npm run build

# Verify build output
ls -la build/

# Check asset files exist
test -f build/checkout-extension.js && echo "JS built" || echo "JS missing"
test -f build/checkout-extension.asset.php && echo "Asset file built" || echo "Asset file missing"
```

### Step 8: SlotFill Extensions

```javascript
// src/slotfill-extension/index.js
import { registerPlugin } from '@wordpress/plugins';
import { ExperimentalOrderMeta } from '@woocommerce/blocks-checkout';
import { __ } from '@wordpress/i18n';

const OrderMetaExtension = () => {
    return (
        <ExperimentalOrderMeta>
            <div className="my-order-meta">
                {__('Custom order information here', 'my-woo-blocks')}
            </div>
        </ExperimentalOrderMeta>
    );
};

registerPlugin('my-order-meta', {
    render: OrderMetaExtension,
    scope: 'woocommerce-checkout',
});
```

## Verification

### Checklist

- [ ] npm dependencies installed correctly
- [ ] Build completes without errors
- [ ] Asset files generated in build directory
- [ ] Blocks registered in WordPress admin
- [ ] Checkout extensions appear in checkout
- [ ] Payment methods show in block checkout
- [ ] No console errors in browser
- [ ] Server-side integration registered

### Test Commands

```bash
# Verify build output
npm run build && ls -la build/

# Check for build errors
npm run lint:js

# Verify WooCommerce blocks loaded
wp eval "var_dump(class_exists('Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType'));"

# Check registered blocks
wp eval "print_r(WP_Block_Type_Registry::get_instance()->get_all_registered());" | grep my-woo

# Test checkout page loads
curl -s "http://localhost/checkout/" | grep -q "wc-block-checkout" && echo "Checkout block active"
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Module not found" | Missing npm dependency | Run `npm install` |
| Block not appearing | Registration error | Check browser console, verify register call |
| Build fails | Webpack config error | Check webpack.config.js, clear node_modules |
| Payment method missing | Interface not implemented | Ensure extends AbstractPaymentMethodType |
| Checkout extension missing | Wrong hook used | Verify `woocommerce_blocks_checkout_block_registration` |
| Script not loading | Asset file missing | Check build/ for .asset.php files |

### Quick Checks

```bash
# Check node/npm versions
node -v && npm -v

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json && npm install

# Check WooCommerce Blocks active
wp plugin list | grep woocommerce

# View browser console for JS errors
# Open DevTools > Console

# Check script enqueued
wp eval "global \$wp_scripts; print_r(\$wp_scripts->registered['my-checkout-extension'] ?? 'Not found');"
```

## Escalation

- Cart and Checkout extensibility: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md
- Extensibility overview: https://developer.woocommerce.com/docs/block-development/getting-started/extensibility-overview.md
- IntegrationInterface (scripts/styles): https://developer.woocommerce.com/docs/block-development/reference/integration-interface.md
- Additional checkout fields: https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/additional-checkout-fields.md
- wp-scripts: https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/
- Tutorial - Extending Checkout: https://developer.woocommerce.com/2023/08/07/extending-the-woocommerce-checkout-block-to-add-custom-shipping-options/
