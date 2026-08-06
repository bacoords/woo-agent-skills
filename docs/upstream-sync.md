# Upstream documentation maintenance

Woo developer documentation is live and machine-readable:

- `https://developer.woocommerce.com/llms.txt` provides the searchable index.
- `https://developer.woocommerce.com/llms-full.txt` provides the full Markdown export.
- Individual `/docs/.../` pages are available by removing the trailing slash and appending `.md`.

Skills must search the live index and fetch relevant pages at task time. Bundled references should contain durable decision rules and guardrails, not mirrors of full upstream pages.

When an upstream contract changes:

1. Update the canonical reference under `shared/skill-resources/`.
2. Update inspector/doc helper behavior if capability detection changed.
3. Add a regression scenario and fixture test.
4. Run resource sync, the eval harness, and all package builds.
5. Include upstream source links and affected pathways in the pull request.

Automated refreshes may update indexes or flag deltas, but should not rewrite procedural guidance without review.
