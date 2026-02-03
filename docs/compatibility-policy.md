# Compatibility policy

This repo is an authoring workspace for WooCommerce-focused Agent Skills.

## Compatibility contract (v1)

Skills in this repo target:

- WooCommerce **10.x+**
- WordPress **6.7+**
- PHP **8.0+**

## Authoring rules

Skills should:

- Use modern WooCommerce APIs and patterns exclusively.
- Assume HPOS is enabled (it's the default in WooCommerce 9+).
- Leverage PHP 8.0+ features (constructor promotion, named arguments, match expressions).
- Prefer detection + guardrails (triage) over hard-coded assumptions.
- Default guidance assumes WooCommerce 10.x+ — don't add backwards compatibility for older versions.
