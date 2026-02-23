---
name: woo-cart-checkout
description: Modifying WooCommerce cart and checkout behavior including fees, validation, custom fields, and order processing for both classic and block checkout.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-cart-checkout

## When to use

- Adding fees or discounts to the cart
- Validating cart contents or checkout data
- Adding custom fields to checkout
- Modifying order processing
- Extending block-based cart/checkout
- Adding custom cart item data

## Procedure

### Step 1: Detect Checkout Type

```bash
# Check for block checkout
wp post get $(wp option get woocommerce_checkout_page_id) --field=post_content | grep -q "woocommerce/checkout" && echo "Block checkout" || echo "Classic checkout"
```

```php
<?php
use Automattic\WooCommerce\Blocks\Utils\CartCheckoutUtils;

$is_block_checkout = class_exists( CartCheckoutUtils::class )
    && CartCheckoutUtils::is_checkout_block_default();
```

### Step 2: Choose the right pattern

| Task | Checkout Type | Reference |
|------|---------------|-----------|
| Add cart fees/discounts | Both | [references/cart-modifications.md](references/cart-modifications.md) |
| Validate cart contents | Both | [references/cart-modifications.md](references/cart-modifications.md) |
| Custom cart item data | Both | [references/cart-modifications.md](references/cart-modifications.md) |
| Add checkout fields | Classic | [references/checkout-fields-classic.md](references/checkout-fields-classic.md) |
| Add checkout fields | Block | [references/checkout-fields-block.md](references/checkout-fields-block.md) |
| Conditional fields | Block (WC 9.9+) | [references/checkout-fields-block.md](references/checkout-fields-block.md) |
| Modify order on save | Both | [references/order-processing.md](references/order-processing.md) |
| React to order status | Both | [references/order-processing.md](references/order-processing.md) |

### Step 3: Implement and test

1. Implement the pattern from the appropriate reference
2. Test with the verification checklist below
3. Check failure modes if issues arise

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
