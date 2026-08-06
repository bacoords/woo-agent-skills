# Contributing to WooCommerce Agent Skills

Contributions should improve how an AI assistant chooses and verifies a WooCommerce development pathway. Prefer current upstream contracts, deterministic inspection, and concise procedures over large collections of snippets.

## Improve a skill

1. Inspect the current skill, its referenced resources, and matching eval scenarios.
2. Verify technical claims against current WooCommerce or WordPress developer documentation.
3. Edit canonical shared resources under `shared/skill-resources/` when more than one skill uses the guidance.
4. Materialize shared resources:

   ```bash
   node shared/scripts/sync-skill-resources.mjs --write
   ```

5. Add or update a JSON scenario under `eval/scenarios/` and fixture tests for deterministic helpers.
6. Run `node eval/harness/run.mjs`.

## Create a skill

Check the existing skill descriptions first to avoid overlapping triggers. Then run:

```bash
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"
```

Every skill requires:

- `SKILL.md` with only `name` and `description` in YAML frontmatter.
- A concise imperative procedure with verification and failure behavior.
- `agents/openai.yaml` with display name, short description, and a default prompt mentioning `$skill-name`.
- At least one JSON eval scenario.
- References or scripts only when they add reusable, non-obvious value.

Put all trigger conditions in the frontmatter description. Keep `SKILL.md` under 500 lines and link directly to one-level `references/` or `scripts/` resources.

## Technical expectations

- Default to WooCommerce 10.x+, WordPress 6.7+, and PHP 8.0+.
- Gate the WordPress Abilities API on WordPress 6.9+.
- Inspect active-site capabilities instead of inferring them from repository code.
- Search current Woo developer docs before choosing an API.
- Use Woo CRUD and public extensibility APIs; avoid direct order storage or unstable DOM/internal-package coupling.
- Keep deprecated Woo MCP details only in explicit migration guidance.
- Preserve user changes and never use destructive verification steps.

## Submit

Open a focused pull request that explains the behavior change, sources consulted, scenarios added, and validation performed.
