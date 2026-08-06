# Packaging and installation

The source of truth for skill entrypoints is `skills/`. Shared reference/script source lives in `shared/skill-resources/` and is materialized into each skill according to its manifest.

## Prepare resources

```bash
node shared/scripts/sync-skill-resources.mjs --write
node shared/scripts/sync-skill-resources.mjs --check
```

Commit materialized copies so a skill folder can be installed manually. Do not use symlinks.

## Build

```bash
node shared/scripts/skillpack-build.mjs --clean
```

Outputs:

- `dist/codex/.codex/skills/*`
- `dist/vscode/.github/skills/*`
- `dist/claude/.claude/skills/*`

The builder refuses to run when materialized shared resources drift from their canonical source.

## Install

```bash
node shared/scripts/skillpack-install.mjs \
  --dest=../some-repo \
  --targets=codex,vscode,claude
```

Install mode defaults to `replace` per selected skill directory. Use `--skills=<comma-separated-names>` to select skills and `--dry-run` to preview.
