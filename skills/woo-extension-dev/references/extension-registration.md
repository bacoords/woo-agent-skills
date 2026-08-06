# Extension registration and lifecycle

## Bootstrap

- Put the WordPress plugin header in one main plugin file.
- Declare WooCommerce requirements in the plugin header and check that Woo is available before initializing Woo-specific services.
- Load runtime services on documented WordPress/Woo hooks; do not execute Woo APIs at file include time.
- Keep activation/deactivation work idempotent. Do not flush rewrite rules or run migrations on every request.
- Use namespaces and Composer autoloading when the project already supports them; follow the repository's existing architecture otherwise.

## Compatibility declarations

Register Woo feature compatibility on `before_woocommerce_init` with `FeaturesUtil::declare_compatibility()`. Declare only features the extension actually supports and has tested. Treat HPOS and Cart/Checkout block compatibility as independent declarations.

Do not infer compatibility from the absence of direct database access. Inspect every order, checkout, and storage pathway first.

## Assets

- Register scripts and styles before enqueueing them.
- Use generated `*.asset.php` dependency/version metadata from the WordPress build pipeline.
- Use Woo integration interfaces or documented registration hooks for block assets and data.
- Load assets only on relevant storefront/editor/admin screens.
- Use localized data only for small boot data; prefer registered data stores or REST/Store API for changing state.

## Extension surfaces

Choose the owning API instead of a generic WordPress workaround:

| Need | Preferred owner |
|---|---|
| Gateway configuration | `WC_Payment_Gateway` / `WC_Settings_API` |
| Shipping configuration | `WC_Shipping_Method` / `WC_Settings_API` |
| External service integration | `WC_Integration` |
| Full Woo settings tab | `WC_Settings_Page` |
| Storefront cart/checkout data | Store API or documented cart/checkout hooks |
| Order persistence | Woo CRUD objects |
| Agent-callable operation | WordPress Abilities API |

## Verification

- Confirm initialization occurs once and at the documented hook.
- Confirm feature declarations point at the main plugin file.
- Confirm generated asset dependencies exist in production builds.
- Exercise activation twice and confirm it remains safe.
- Run the repository's lint, unit, integration, and end-to-end commands that cover the changed surface.

## Current sources

- `https://developer.woocommerce.com/docs/extensions/core-concepts.md`
- `https://developer.woocommerce.com/docs/extension-development-best-practices.md`
- `https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book.md`
