# Cart and Checkout pathways

Detect Cart and Checkout independently before selecting hooks or UI APIs.

## Shared server behavior

Use documented Woo cart, checkout, and order APIs for calculations, validation, cart item data, and order creation when those APIs support both flows. Keep callbacks idempotent because totals and validation may run more than once.

- Validate and sanitize input at the server boundary.
- Use Woo CRUD objects for resulting order and order-item data.
- Avoid direct writes to order post/meta tables.
- Do not use negative fees as a discount mechanism; use a documented coupon or pricing path.
- Do not trust client-provided prices, totals, permissions, or product eligibility.

## Block Cart and Checkout

- Use Store API extension points for changing request/response data.
- Use `woocommerce_register_additional_checkout_field()` for supported additional fields and register it on the documented Woo initialization hook.
- Use the field API's sanitize and validation hooks rather than classic `$_POST` handlers.
- Use `registerCheckoutFilters` for documented client display filters.
- Use integration interfaces and generated asset metadata for scripts, styles, and server data.
- Check the current hook-alternatives documentation before reusing a shortcode checkout hook.

## Classic shortcode Cart and Checkout

- Use classic checkout field and processing hooks only after confirming shortcode content.
- Sanitize request values, validate before order creation, and save through the order object.
- Treat PHP template overrides as a last resort when a hook cannot express the change.

## Distributed extensions

When supporting both flows, separate adapters around shared domain logic. Do not force both paths through the same UI callback. Declare block compatibility only after testing the block path.

## Verification

- Test cart recalculation, quantity changes, coupons, taxes, shipping, and guest/authenticated checkout as relevant.
- Verify validation in both client UI and server response.
- Confirm data reaches the order through Woo CRUD and appears only to authorized users.
- Test classic and block flows separately when both are supported.

## Current sources

- `https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks.md`
- `https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/additional-checkout-fields.md`
- `https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/filters-in-cart-and-checkout.md`
