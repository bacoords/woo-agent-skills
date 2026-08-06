# Woo block-theme templates

Confirm the target is a block theme before editing HTML templates.

## Structure

- Put templates directly in `templates/` and template parts directly in `parts/`.
- Override a Woo block template by using its documented filename, such as `single-product.html` or `archive-product.html`.
- Keep template-specific overrides narrower than general catalog templates.
- Remember that a user's Site Editor customization can override the corresponding theme file in the database.

## Cart and Checkout pages

Keep the assigned Cart and Checkout page content authoritative. Theme page templates should wrap `core/post-content` with the documented Woo page-content wrapper and store notices. Do not replace page content by placing `woocommerce/cart` or `woocommerce/checkout` directly in `page-cart.html` or `page-checkout.html`.

## Patterns

Use theme-owned patterns for reusable compositions, not for business logic. Keep slugs stable, translations correct, and referenced blocks available at the declared Woo/WordPress baseline.

## Verification

- Validate block markup and template placement.
- Check frontend and Site Editor rendering.
- Inspect saved user templates before diagnosing a theme file as ignored.
- Test product, taxonomy, search, cart, checkout, and order-confirmation templates touched by the change.

## Current source

- `https://developer.woocommerce.com/docs/theming/block-theme-development/theming-woo-blocks.md`
