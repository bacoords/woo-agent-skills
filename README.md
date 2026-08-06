# Agent Skills for WooCommerce

Portable instructions and deterministic helpers that teach AI coding assistants to inspect a WooCommerce project, consult current developer documentation, and select the correct extensibility pathway before changing code.

## Skills

| Skill | Purpose |
|---|---|
| **woo-extension-dev** | General Woo extension development: registration, settings, HPOS/orders, Cart/Checkout, Store API, blocks, and Abilities |
| **woo-block-theme-dev** | Woo block-theme templates, patterns, `theme.json`, global styles, and Site Editor troubleshooting |
| **woo-mcp-connect** | Connect to canonical Woo abilities through the standard WordPress MCP Adapter or migrate a legacy Woo MCP client |

The two development skills share a docs-first and capability-inspection workflow. Theme type, Cart type, and Checkout type are detected independently instead of inferred from one another.

## Build and install

```bash
git clone https://github.com/WordPress/agent-skills.git
cd agent-skills
node shared/scripts/skillpack-build.mjs --clean
```

Install all skills into a project:

```bash
node shared/scripts/skillpack-install.mjs \
  --dest=../your-woo-project \
  --targets=codex,vscode,claude
```

Install selected skills:

```bash
node shared/scripts/skillpack-install.mjs \
  --dest=../your-woo-project \
  --targets=codex \
  --skills=woo-extension-dev,woo-block-theme-dev
```

Install globally for Claude Code:

```bash
node shared/scripts/skillpack-install.mjs --global
```

Target locations:

- Codex: `.codex/skills/`
- VS Code / GitHub Copilot: `.github/skills/`
- Claude Code: `.claude/skills/`

Manual installation is also supported: each checked-in `skills/<name>/` directory contains its required references and scripts.

## How the shared resources work

Canonical references and helpers live under `shared/skill-resources/`. A manifest selects which resources each skill receives. Materialized copies are committed inside each skill so installations stay self-contained and symlink-free.

```bash
# Update materialized copies after editing canonical resources
node shared/scripts/sync-skill-resources.mjs --write

# Verify that copies have not drifted
node shared/scripts/sync-skill-resources.mjs --check
```

The skillpack build and evaluation harness reject drift automatically.

## Compatibility

- General baseline: WooCommerce 10.x+, WordPress 6.7+, PHP 8.0+
- Abilities API and standard Woo MCP workflows: WordPress 6.9+ and actual discovery of the required abilities
- Filesystem-based assistants with Node.js; runtime inspection uses WP-CLI when available

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [authoring guide](docs/authoring-guide.md).

```bash
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"
node eval/harness/run.mjs
```

Additional documentation:

- [Principles](docs/principles.md)
- [Packaging](docs/packaging.md)
- [Compatibility policy](docs/compatibility-policy.md)

## License

GPL-2.0-or-later
