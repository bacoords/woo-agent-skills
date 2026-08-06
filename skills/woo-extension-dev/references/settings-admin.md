# Settings and Woo Admin placement

Choose placement before writing fields.

| Requirement | Use |
|---|---|
| Settings owned by a gateway, shipping method, or integration | Its inherited `WC_Settings_API` implementation |
| A few settings that belong to an existing Woo tab | Register a section and fields for that tab |
| A full tab with one or more sections | Subclass `WC_Settings_Page` |
| A workflow that is not settings | A Woo Admin-connected PHP page or registered React page |
| A link from Woo Home | A store-management link; do not use it as persistence |

## Guardrails

- Prefer the smallest appropriate navigation surface.
- Let Woo render, sanitize, and save native field types when possible.
- Use unique, extension-prefixed IDs and stable option names.
- Define defaults explicitly and distinguish an unset value from a saved false/empty value.
- Sanitize at the owning API boundary and escape on output.
- Check capabilities and nonces for custom save handlers.
- Keep secrets out of HTML, logs, REST responses, and client boot data.
- Use the current Settings UI only after verifying the feature/API is available; retain the documented PHP registration and save flow.

## Hooks for a section in an existing tab

Use `woocommerce_get_sections_{tab}` to register the section and `woocommerce_get_settings_{tab}` to supply fields. Return untouched settings for other sections.

## Verification

- Load the intended tab/section directly and through Woo navigation.
- Save valid, empty, and invalid values.
- Confirm unauthorized users cannot view or save.
- Confirm defaults and existing stored values survive upgrades.
- Test with the current Settings UI feature both enabled and disabled when the extension opts into it.

## Current source

- `https://developer.woocommerce.com/docs/extensions/settings-and-config.md`
