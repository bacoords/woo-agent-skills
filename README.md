# Agent Skills for WooCommerce

**Teach AI coding assistants how to build WooCommerce extensions the right way.**

Agent Skills are portable bundles of instructions, checklists, and scripts that help AI assistants (Claude, Copilot, Codex, Cursor, etc.) understand WooCommerce development patterns, avoid common mistakes, and follow best practices.

## Why Agent Skills?

AI coding assistants are powerful, but they often:
- Generate outdated WooCommerce patterns (pre-HPOS, deprecated hooks)
- Miss critical security considerations in payment gateway development
- Skip proper HPOS compatibility declarations
- Ignore existing tooling in your repo

Agent Skills solve this by giving AI assistants **expert-level WooCommerce knowledge** in a format they can actually use.

## Available Skills

| Skill | What it teaches |
|-------|-----------------|
| **woo-project-triage** | Detects WooCommerce project type, version, HPOS mode, and active features |
| **woo-extension-patterns** | Extension structure, lifecycle hooks, settings integration, HPOS compatibility |
| **woo-settings** | Adding settings pages and options using WC Settings API |
| **woo-cart-checkout** | Modifying cart and checkout behavior, custom fields, order processing |
| **woo-theming** | Template overrides, custom CSS, block styles, theme integration |
| **woo-cli** | WooCommerce CLI commands (`wp wc`), bulk operations, data import/export |
| **woo-logging-debugging** | WC Logger usage, log reading, Query Monitor, debug mode, status reports |
| **woo-action-scheduler** | Action Scheduler CLI, viewing/managing queued actions, debugging failed jobs |
| **woo-import-export** | Built-in CSV importer/exporter, bulk CLI operations, data transformation |
| **woo-blocks-toolkit** | wp-scripts for block development, checkout/cart block extension points |

## Quick Start

### Install globally for Claude Code

```bash
# Clone agent-skills
git clone https://github.com/WordPress/agent-skills.git
cd agent-skills

# Build the distribution
node shared/scripts/skillpack-build.mjs --clean

# Install all skills globally (available across all projects)
node shared/scripts/skillpack-install.mjs --global

# Or install specific skills only
node shared/scripts/skillpack-install.mjs --global --skills=woo-project-triage,woo-extension-patterns
```

This installs skills to `~/.claude/skills/` where Claude Code will automatically discover them.

### Install into your repo

```bash
# Clone agent-skills
git clone https://github.com/WordPress/agent-skills.git
cd agent-skills

# Build the distribution
node shared/scripts/skillpack-build.mjs --clean

# Install into your WooCommerce project
node shared/scripts/skillpack-install.mjs --dest=../your-woo-project --targets=codex,vscode,claude
```

This copies skills into:
- `.codex/skills/` for OpenAI Codex
- `.github/skills/` for VS Code / GitHub Copilot
- `.claude/skills/` for Claude Code (project-level)

### Available options

```bash
# List available skills
node shared/scripts/skillpack-install.mjs --list

# Dry run (preview without installing)
node shared/scripts/skillpack-install.mjs --global --dry-run

# Install specific skills to a project
node shared/scripts/skillpack-install.mjs --dest=../my-repo --targets=claude --skills=woo-cli
```

### Manual installation

Copy any skill folder from `skills/` into your project's instructions directory for your AI assistant.

## How It Works

Each skill contains:

```
skills/woo-extension-patterns/
├── SKILL.md              # Main instructions (when to use, procedure, verification)
├── references/           # Deep-dive docs on specific topics
│   ├── hpos-compatibility.md
│   ├── lifecycle-hooks.md
│   └── ...
└── scripts/              # Deterministic helpers (detection, validation)
    └── detect_extension.mjs
```

When you ask your AI assistant to work on WooCommerce code, it reads these skills and follows the documented procedures rather than guessing.

## Compatibility

- **WooCommerce 10.x+** (WordPress 6.7+, PHP 8.0+)
- Works with any AI assistant that supports project-level instructions

## Contributing

**We welcome contributions!** This project is a great way to share your WooCommerce expertise—you don't need to be a coding wizard. Most skills are written in Markdown, focusing on clear procedures and best practices.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

Quick commands:

```bash
# Scaffold a new skill
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"

# Validate skills
node eval/harness/run.mjs
```

## Documentation

- [Authoring Guide](docs/authoring-guide.md) - How to create and improve skills
- [Principles](docs/principles.md) - Design philosophy
- [Packaging](docs/packaging.md) - Build and distribution
- [Compatibility Policy](docs/compatibility-policy.md) - Version targeting

## License

GPL-2.0-or-later
