# Documentation-first workflow

Use current upstream documentation before choosing a WooCommerce API or extensibility surface.

## Required sequence

1. Inspect the repository and, when available, the running site with `inspect-woo-context.mjs`.
2. Convert the task and detected capabilities into a narrow search query.
3. Search the Woo developer documentation index:

   ```bash
   node scripts/woo-docs.mjs search "checkout additional fields"
   ```

4. Fetch one to three relevant results as Markdown:

   ```bash
   node scripts/woo-docs.mjs fetch "https://developer.woocommerce.com/docs/example/path/"
   ```

5. Read the pages before selecting an implementation. Record the chosen pathway and source URLs in the work summary.

## Canonical endpoints

- Documentation index: `https://developer.woocommerce.com/llms.txt`
- Full documentation export: `https://developer.woocommerce.com/llms-full.txt`
- Individual document: remove the trailing slash from a `/docs/.../` URL and append `.md`

Prefer individual documents over loading `llms-full.txt`; the full export is a fallback for tools that cannot search or fetch individual pages.

## Source order

1. Current Woo developer documentation.
2. Current WordPress developer documentation for WordPress-owned APIs.
3. WooCommerce and WordPress source/code reference when public docs do not settle behavior.
4. Bundled references in this skill.

Treat blog posts as supporting context unless they explicitly announce a current contract. Do not use old snippets merely because they match the task wording.

## Offline fallback

If live documentation cannot be reached:

- Continue with the bundled references when they cover the task.
- State that the live lookup failed.
- Identify any API or version claim that still needs verification.
- Avoid claiming that an evolving API is current.

Do not silently skip documentation discovery.
