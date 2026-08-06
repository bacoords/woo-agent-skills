# Authoring guide

Keep skill entrypoints concise and procedural. Put detailed, changing, or domain-specific guidance in references and repeated deterministic work in scripts.

## Workflow

1. Define realistic prompts and the evidence required to answer them safely.
2. Inspect the repository/site before asking the user for discoverable facts.
3. Search the current Woo documentation index and read relevant Markdown documents.
4. Add or update canonical resources under `shared/skill-resources/` when guidance is shared.
5. Materialize resources with `node shared/scripts/sync-skill-resources.mjs --write`.
6. Add JSON scenarios and fixture-driven tests.
7. Run `node eval/harness/run.mjs` and build every target.

## Skill shape

- Frontmatter contains only `name` and `description`.
- The description contains all triggering contexts.
- The body uses imperative instructions and stays under 500 lines.
- References are one hop from `SKILL.md` and loaded only for the relevant domain.
- `agents/openai.yaml` contains quoted `display_name`, `short_description`, and `default_prompt` values.

Scaffold with:

```bash
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"
```

## Capability rules

- Treat runtime evidence as authoritative for active state.
- Treat repository code as evidence of support or intent only.
- Keep active theme, Cart, and Checkout pathways independent.
- Preserve `unknown` and ask a focused question only when the unknown changes the implementation.
- Prefer deterministic scripts over shell snippets an agent would have to reconstruct.

## Shared resources

`shared/skill-resources/manifest.json` maps canonical flat reference/script filenames to skills. Do not edit materialized copies under `skills/*/references` or `skills/*/scripts`; edit the canonical file and sync it.

The build and eval harness run sync in check mode so packages cannot ship stale copies.
