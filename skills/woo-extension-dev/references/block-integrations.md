# Woo block integrations

Use documented public packages and registries. Do not import Woo internal source modules or couple behavior to generated DOM/class names.

## Registration layers

Most block integrations have separate responsibilities:

1. Register/enqueue built JavaScript and styles with generated dependency metadata.
2. Register the server integration on its documented Woo hook or registry.
3. Expose only necessary initial settings through the integration interface.
4. Use Store API or registered WordPress data stores for changing data.
5. Register client behavior with the relevant Woo registry.

Payment methods require the server payment integration and client payment-method registration in addition to the underlying `WC_Payment_Gateway`. Shipping extensions similarly retain server shipping logic and add only the block-facing integration they need.

## Store API

- Extend Store API schemas through documented extension points.
- Namespace extension data with the plugin slug.
- Provide schemas and sanitize/validate inputs.
- Apply permission and cart/customer-context checks server-side.
- Keep response data minimal and never expose secrets or unrestricted customer data.

## Compatibility

Confirm that the target Woo version provides every imported package/export and PHP interface. Use the repository's existing build tooling when present; otherwise prefer the current Woo/WordPress scaffold documented upstream.

## Verification

- Build production assets and confirm every `*.asset.php` file is packaged.
- Verify editor and storefront loading independently.
- Check browser console, Store API responses, and Woo logs.
- Exercise disabled/unavailable payment or shipping states.
- Confirm the classic integration still works when the extension claims both paths.

## Current sources

- `https://developer.woocommerce.com/docs/block-development/getting-started/extensibility-overview.md`
- `https://developer.woocommerce.com/docs/block-development/reference/integration-interface.md`
- `https://developer.woocommerce.com/docs/apis/store-api/extending-store-api.md`
