import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeDocsUrl, parseDocsIndex, searchDocsIndex } from "../../shared/skill-resources/scripts/woo-docs.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../..");
const fixtures = path.join(repoRoot, "eval", "fixtures");
const inspector = path.join(repoRoot, "shared", "skill-resources", "scripts", "inspect-woo-context.mjs");
const docsScript = path.join(repoRoot, "shared", "skill-resources", "scripts", "woo-docs.mjs");

function inspect(fixture, extraArgs = [], env = {}) {
  const result = spawnSync(process.execPath, [inspector, `--repo=${path.join(fixtures, fixture)}`, ...extraArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { result, report: result.stdout ? JSON.parse(result.stdout) : null };
}

function createFakeWp(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "woo-fake-wp-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const fakeWp = path.join(temporary, "wp");
  const fixtureScript = path.join(fixtures, "wp-cli", "fake-wp.mjs");
  fs.writeFileSync(fakeWp, `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(fixtureScript)} "$@"\n`, { mode: 0o755 });
  return fakeWp;
}

test("docs index search ranks relevant official pages", () => {
  const markdown = fs.readFileSync(path.join(fixtures, "docs", "llms.txt"), "utf8");
  const entries = parseDocsIndex(markdown);
  assert.equal(entries.length, 4);
  assert.equal(searchDocsIndex(entries, "settings admin", 2)[0].title, "Settings APIs and admin pages");
  assert.equal(entries[0].url, "https://developer.woocommerce.com/docs/extensions/settings-and-config/");
  assert.equal(
    normalizeDocsUrl("https://developer.woocommerce.com/docs/features/mcp/#setup"),
    "https://developer.woocommerce.com/docs/features/mcp.md"
  );
  assert.throws(() => normalizeDocsUrl("https://example.com/docs/mcp/"));
});

test("docs CLI supports deterministic offline search", () => {
  const index = path.join(fixtures, "docs", "llms.txt");
  const result = spawnSync(process.execPath, [docsScript, "search", "block theme", "--limit=1", `--index-file=${index}`], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(JSON.parse(result.stdout).results[0].title, "Theming for Woo blocks");
});

test("static inspection distinguishes extension and theme project types", () => {
  const extension = inspect("extension", ["--runtime=off"]);
  assert.equal(extension.result.status, 0, extension.result.stderr);
  assert.equal(extension.report.project.primary, "woo-extension");
  assert.equal(extension.report.signals.hposCompatibility.detected, true);
  assert.equal(extension.report.signals.legacyWooMcp.detected, false);

  const blockTheme = inspect("block-theme", ["--runtime=off"]);
  assert.equal(blockTheme.report.project.primary, "woo-block-theme");
  assert.equal(blockTheme.report.pathways.theme.value, "block");

  const classicTheme = inspect("classic-theme", ["--runtime=off"]);
  assert.equal(classicTheme.report.project.primary, "woo-classic-theme");
  assert.equal(classicTheme.report.pathways.theme.value, "classic");

  const ambiguous = inspect("ambiguous-themes", ["--runtime=off"]);
  assert.equal(ambiguous.report.project.themeCandidates.length, 2);
  assert.equal(ambiguous.report.pathways.theme.value, "unknown");
});

test("runtime inspection keeps theme, Cart, and Checkout independent", (t) => {
  const fakeWp = createFakeWp(t);

  const site = path.join(fixtures, "site");
  const { result, report } = inspect("site", [`--wp-path=${site}`, "--runtime=required"], { WOO_INSPECT_WP_BIN: fakeWp });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(report.capabilities.activeTheme.value, "block");
  assert.equal(report.capabilities.cart.value, "classic");
  assert.equal(report.capabilities.checkout.value, "block");
  assert.equal(report.capabilities.wcCli.value, "yes");
  assert.equal(report.capabilities.abilitiesApi.value, "yes");
  assert.equal(report.capabilities.mcpDefaultServer.value, "yes");
  assert.equal(report.capabilities.mcpAdapterProvider.value, "woocommerce-bundled");
  assert.equal(report.capabilities.localStdioMcp.value, "yes");
  assert.equal(report.capabilities.remoteHttpMcp.value, "yes");
  assert.equal(report.capabilities.wooCanonicalAbilities.value, "yes");

  const inverse = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    WOO_INSPECT_WP_BIN: fakeWp,
    FAKE_WP_THEME: "classic",
    FAKE_WP_CART: "block",
    FAKE_WP_CHECKOUT: "classic",
  });
  assert.equal(inverse.report.capabilities.activeTheme.value, "classic");
  assert.equal(inverse.report.capabilities.cart.value, "block");
  assert.equal(inverse.report.capabilities.checkout.value, "classic");
});

test("runtime inspection distinguishes adapter providers and missing capabilities", (t) => {
  const fakeWp = createFakeWp(t);
  const site = path.join(fixtures, "site");
  const baseEnvironment = { WOO_INSPECT_WP_BIN: fakeWp };

  const standalone = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_ADAPTER_PROVIDER: "standalone",
  });
  assert.equal(standalone.result.status, 0, standalone.result.stderr);
  assert.equal(standalone.report.capabilities.mcpAdapterProvider.value, "standalone");
  assert.equal(standalone.report.capabilities.wooMcpFeature.value, "no");

  const noAbilities = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_NO_ABILITIES: "1",
  });
  assert.equal(noAbilities.report.capabilities.abilitiesApi.value, "no");
  assert.equal(noAbilities.report.capabilities.wooCanonicalAbilities.value, "unknown");

  const noWooAbilities = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_NO_WOO_ABILITIES: "1",
  });
  assert.equal(noWooAbilities.report.capabilities.abilitiesApi.value, "yes");
  assert.equal(noWooAbilities.report.capabilities.wooCanonicalAbilities.value, "no");

  const oldWordPress = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_WORDPRESS_VERSION: "6.8.3",
  });
  assert.equal(oldWordPress.report.versions.wordpress.value, "6.8.3");
  assert.equal(oldWordPress.report.capabilities.abilitiesApi.value, "no");
  assert.equal(oldWordPress.report.capabilities.wooCanonicalAbilities.value, "unknown");
  assert.match(oldWordPress.report.warnings.join("\n"), /below the 6\.9 minimum/i);

  const noAdapter = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_NO_MCP: "1",
  });
  assert.equal(noAdapter.report.capabilities.mcpAdapter.value, "no");
  assert.equal(noAdapter.report.capabilities.mcpAdapterProvider.value, "none");
  assert.equal(noAdapter.report.capabilities.mcpDefaultServer.value, "no");

  const missingCliExtensions = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_NO_WC: "1",
    FAKE_WP_NO_ABILITY: "1",
  });
  assert.equal(missingCliExtensions.report.capabilities.wcCli.value, "no");
  assert.equal(missingCliExtensions.report.capabilities.abilityCli.value, "no");

  const insecureSite = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    ...baseEnvironment,
    FAKE_WP_SITE_URL: "http://example.test",
  });
  assert.equal(insecureSite.report.capabilities.siteHttps.value, "no");
  assert.equal(insecureSite.report.capabilities.remoteHttpMcp.value, "no");
});

test("required runtime returns exit 3 when WP-CLI is unavailable", () => {
  const { result, report } = inspect("site", ["--runtime=required"], { WOO_INSPECT_WP_BIN: "/definitely/missing/wp" });
  assert.equal(result.status, 3);
  assert.equal(report.capabilities.wpCli.value, "no");
  assert.equal(report.runtime.status, "unavailable");
});

test("required runtime returns exit 3 when WP-CLI cannot bootstrap WordPress", (t) => {
  const fakeWp = createFakeWp(t);
  const site = path.join(fixtures, "site");
  const { result, report } = inspect("site", [`--wp-path=${site}`, "--runtime=required"], {
    WOO_INSPECT_WP_BIN: fakeWp,
    FAKE_WP_BOOTSTRAP_FAIL: "1",
  });
  assert.equal(result.status, 3);
  assert.equal(report.runtime.status, "failed");
  assert.match(report.warnings.join("\n"), /could not bootstrap/i);
});
