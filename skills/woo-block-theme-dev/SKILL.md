---
name: woo-block-theme-dev
description: Build, modify, review, or debug WooCommerce block themes. Use for Woo block templates and template parts, theme.json and global styles, patterns, product or catalog templates, Cart and Checkout page wrappers, style variations, and Site Editor override problems. Do not use to implement classic-theme changes.
---

# Woo block-theme development

## Confirm the target

1. Inspect the repository and available site runtime:

   ```bash
   node scripts/inspect-woo-context.mjs
   ```

2. Read [site capabilities](references/site-capabilities.md).
3. If runtime confirms a classic active theme, report the mismatch and stop before implementation.
4. If runtime is unavailable, proceed only when one repository theme is unambiguously a block theme. State that active-theme and saved Site Editor state remain unknown.
5. If multiple block themes are equally plausible, list them and ask which theme is the target.

## Research and choose the layer

Follow [the documentation-first workflow](references/docs-first.md) before editing. Then load:

- Template hierarchy, Woo template filenames, parts, patterns, and Cart/Checkout wrappers: [block-theme templates](references/block-theme-templates.md)
- `theme.json`, global styles, style variations, CSS, and cascade debugging: [block-theme styles](references/block-theme-styles.md)

Keep business rules, checkout processing, data persistence, and Store API behavior out of the theme. Route those changes to `woo-extension-dev`.

## Implement

- Follow the target theme's established structure and minimum WordPress version.
- Prefer global styles and public block supports over markup-dependent CSS.
- Preserve assigned Cart and Checkout page content in their page templates.
- Account for saved user templates/styles before treating a theme file as authoritative.
- Keep block markup valid and use stable registered block names.

## Verify

1. Validate `theme.json` and block markup.
2. Test the Site Editor and storefront independently.
3. Check clean theme state and relevant saved user customizations.
4. Exercise every Woo template and responsive/interaction state touched by the change.
5. Run the theme's existing lint/build commands and report any unavailable runtime checks.

## Compatibility

Default new work to WooCommerce 10.x+, WordPress 6.7+, and PHP 8.0+. Use the `theme.json` schema supported by the theme's declared WordPress baseline and verify Woo block availability against the detected Woo version.
