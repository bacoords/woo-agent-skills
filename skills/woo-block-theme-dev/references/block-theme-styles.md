# Woo block-theme styles

Prefer global styles and block supports over selectors tied to Woo's internal markup.

## `theme.json`

- Treat `settings` as controls/capabilities exposed to editors and `styles` as theme defaults.
- Use the schema version supported by the project's minimum WordPress version.
- Target Woo blocks by registered block name under `styles.blocks`.
- Reuse theme presets for color, spacing, and typography instead of hard-coded values.
- Add CSS only when the desired behavior cannot be expressed through global styles or block supports.

## Cascade and editor state

Core defaults, theme JSON, child themes, style variations, and user customizations form a cascade. A selected style variation or saved Site Editor customization may make a file change appear ineffective. Diagnose the active origin before increasing selector specificity.

## Cart and Checkout

Use the documented theming surface and CSS custom properties. Do not rely on transient component structure, generated class names, or nesting that shoppers can rearrange in the editor.

## Verification

- Validate `theme.json` against the appropriate WordPress schema.
- Compare editor and frontend output.
- Test with saved user customizations and with a clean theme state.
- Check responsive layouts and Woo interaction states, not only static catalog screenshots.

## Current sources

- `https://developer.woocommerce.com/docs/theming/block-theme-development/theming-woo-blocks.md`
- `https://developer.woocommerce.com/docs/theming/block-theme-development/cart-and-checkout.md`
