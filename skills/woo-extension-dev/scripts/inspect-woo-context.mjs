#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const TOOL_VERSION = "1.0.0";
const IGNORED_DIRECTORIES = new Set([".git", ".codex", ".claude", ".agents", "node_modules", "vendor", "dist", "build", "coverage", ".cache"]);
const TEXT_EXTENSIONS = new Set([".php", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".yml", ".yaml"]);
const KNOWN_WOO_ABILITIES = [
  "woocommerce/products-query",
  "woocommerce/product-create",
  "woocommerce/product-update",
  "woocommerce/product-delete",
  "woocommerce/orders-query",
  "woocommerce/order-update-status",
  "woocommerce/order-add-note",
];

class CliError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    "Usage:",
    "  node scripts/inspect-woo-context.mjs [--repo=<path>] [--wp-path=<path>] [--runtime=auto|off|required]",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { repo: process.cwd(), wpPath: null, runtime: "auto" };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--repo=")) options.repo = arg.slice("--repo=".length);
    else if (arg.startsWith("--wp-path=")) options.wpPath = arg.slice("--wp-path=".length);
    else if (arg.startsWith("--runtime=")) options.runtime = arg.slice("--runtime=".length);
    else throw new CliError(`Unknown option: ${arg}`);
  }
  if (!new Set(["auto", "off", "required"]).has(options.runtime)) {
    throw new CliError("--runtime must be auto, off, or required");
  }
  options.repo = path.resolve(options.repo);
  if (options.wpPath) options.wpPath = path.resolve(options.wpPath);
  if (!fs.existsSync(options.repo) || !fs.statSync(options.repo).isDirectory()) {
    throw new CliError(`Repository directory does not exist: ${options.repo}`);
  }
  if (options.wpPath && (!fs.existsSync(options.wpPath) || !fs.statSync(options.wpPath).isDirectory())) {
    throw new CliError(`WordPress directory does not exist: ${options.wpPath}`);
  }
  return options;
}

function readFileSafe(filePath, maxBytes = 256 * 1024) {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer.subarray(0, maxBytes).toString("utf8");
  } catch {
    return null;
  }
}

function readJsonSafe(filePath) {
  const text = readFileSafe(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findFiles(root, { maxFiles = 8000, maxDepth = 12 } = {}) {
  const files = [];
  const queue = [{ directory: root, depth: 0 }];
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth > maxDepth) continue;
    let entries;
    try {
      entries = fs.readdirSync(current.directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.directory, entry.name);
      if (entry.isDirectory()) {
        const relativeDirectory = path.relative(root, fullPath).split(path.sep).join("/");
        const isVsCodeSkillDirectory = relativeDirectory === ".github/skills";
        if (!IGNORED_DIRECTORIES.has(entry.name) && !isVsCodeSkillDirectory) {
          queue.push({ directory: fullPath, depth: current.depth + 1 });
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
        if (files.length >= maxFiles) {
          truncated = true;
          return { files, truncated };
        }
      }
    }
  }
  return { files, truncated };
}

function headerValue(contents, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return contents.match(new RegExp(`^\\s*(?:\\*\\s*)?${escaped}:\\s*(.+?)\\s*$`, "im"))?.[1]?.trim() || null;
}

function relative(root, filePath) {
  return path.relative(root, filePath) || ".";
}

function collectStaticReport(repoRoot) {
  const { files, truncated } = findFiles(repoRoot);
  const pluginCandidates = [];
  const themeRoots = new Map();
  const matches = {};
  const tokens = {
    hposCompatibility: ["declare_compatibility", "custom_order_tables"],
    cartCheckoutCompatibility: ["cart_checkout_blocks"],
    blockIntegration: ["IntegrationInterface", "registerCheckoutFilters", "ExtendSchema", "@woocommerce/blocks"],
    settingsIntegration: ["WC_Settings_API", "WC_Settings_Page", "woocommerce_get_settings_"],
    abilities: ["wp_register_ability", "wp_abilities_api_init", "wp_get_abilities"],
    legacyWooMcp: [
      "/wp-json/woocommerce/mcp",
      "X-MCP-API-Key",
      "woocommerce_mcp_allow_insecure_transport",
      "expose_in_deprecated_woocommerce_mcp",
    ],
    wcCliUsage: ["wp wc"],
  };

  for (const key of Object.keys(tokens)) matches[key] = [];

  for (const filePath of files) {
    const basename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    let contents = null;

    if (extension === ".php") {
      contents = readFileSafe(filePath);
      const pluginName = contents && headerValue(contents, "Plugin Name");
      if (pluginName) {
        const candidate = {
          root: relative(repoRoot, path.dirname(filePath)),
          mainFile: relative(repoRoot, filePath),
          name: pluginName,
          version: headerValue(contents, "Version"),
          requiresWordPress: headerValue(contents, "Requires at least"),
          requiresPhp: headerValue(contents, "Requires PHP"),
          requiresWooCommerce: headerValue(contents, "WC requires at least"),
          testedWooCommerce: headerValue(contents, "WC tested up to"),
        };
        candidate.isWooExtension = Boolean(candidate.requiresWooCommerce || /woocommerce|\bWC_/i.test(contents));
        pluginCandidates.push(candidate);
      }
    }

    if (basename === "style.css") {
      contents ||= readFileSafe(filePath);
      const themeName = contents && headerValue(contents, "Theme Name");
      if (themeName) {
        const root = path.dirname(filePath);
        themeRoots.set(root, { root: relative(repoRoot, root), name: themeName, style: relative(repoRoot, filePath) });
      }
    }

    if (basename === "theme.json") {
      const root = path.dirname(filePath);
      const existing = themeRoots.get(root) || { root: relative(repoRoot, root), name: path.basename(root), style: null };
      existing.themeJson = relative(repoRoot, filePath);
      existing.themeJsonVersion = readJsonSafe(filePath)?.version || null;
      themeRoots.set(root, existing);
    }

    if (!TEXT_EXTENSIONS.has(extension)) continue;
    contents ||= readFileSafe(filePath, 128 * 1024);
    if (!contents) continue;
    for (const [key, candidates] of Object.entries(tokens)) {
      if (matches[key].length >= 20) continue;
      if (candidates.some((token) => contents.includes(token))) matches[key].push(relative(repoRoot, filePath));
    }
  }

  const themes = [...themeRoots.entries()].map(([absoluteRoot, theme]) => {
    let templateFiles = [];
    const templatesDirectory = path.join(absoluteRoot, "templates");
    if (fs.existsSync(templatesDirectory)) {
      try {
        templateFiles = fs.readdirSync(templatesDirectory).filter((name) => name.endsWith(".html"));
      } catch {
        templateFiles = [];
      }
    }
    const hasPhpTemplates = fs.existsSync(path.join(absoluteRoot, "woocommerce"));
    return {
      ...theme,
      type: theme.themeJson && templateFiles.length > 0 ? "block" : theme.style ? "classic" : "unknown",
      templateFiles: templateFiles.slice(0, 30),
      hasWooPhpTemplates: hasPhpTemplates,
    };
  });

  const packageJson = readJsonSafe(path.join(repoRoot, "package.json"));
  const composerJson = readJsonSafe(path.join(repoRoot, "composer.json"));
  const packageManager = fs.existsSync(path.join(repoRoot, "pnpm-lock.yaml"))
    ? "pnpm"
    : fs.existsSync(path.join(repoRoot, "yarn.lock"))
      ? "yarn"
      : fs.existsSync(path.join(repoRoot, "bun.lock")) || fs.existsSync(path.join(repoRoot, "bun.lockb"))
        ? "bun"
        : fs.existsSync(path.join(repoRoot, "package-lock.json"))
          ? "npm"
          : null;

  const hasWpCore = files.some((file) => /(^|\/)wp-includes\/version\.php$/.test(file));
  const hasWpSite = files.some((file) => /(^|\/)wp-config\.php$/.test(file)) || files.some((file) => /(^|\/)wp-content\//.test(file));
  const wooPlugins = pluginCandidates.filter((plugin) => plugin.isWooExtension);
  const kinds = [];
  if (hasWpCore) kinds.push("woo-core");
  if (hasWpSite) kinds.push("woo-site");
  if (wooPlugins.length > 0) kinds.push("woo-extension");
  if (themes.some((theme) => theme.type === "block")) kinds.push("woo-block-theme");
  if (themes.some((theme) => theme.type === "classic")) kinds.push("woo-classic-theme");
  if (kinds.length === 0) kinds.push("unknown");

  let primary = "unknown";
  if (hasWpSite) primary = "woo-site";
  else if (wooPlugins.length > 0) primary = "woo-extension";
  else if (themes.some((theme) => theme.type === "block")) primary = "woo-block-theme";
  else if (themes.some((theme) => theme.type === "classic")) primary = "woo-classic-theme";
  else if (hasWpCore) primary = "woo-core";

  return {
    truncated,
    project: { primary, kinds, pluginCandidates, themeCandidates: themes },
    tooling: {
      php: {
        composer: Boolean(composerJson),
        phpunit: files.some((file) => /phpunit.*\.xml(?:\.dist)?$/.test(path.basename(file))),
      },
      node: {
        packageJson: Boolean(packageJson),
        packageManager,
        wordpressScripts: Boolean(packageJson?.dependencies?.["@wordpress/scripts"] || packageJson?.devDependencies?.["@wordpress/scripts"]),
      },
      tests: {
        playwright: files.some((file) => /playwright\.config\./.test(path.basename(file))),
        wpEnv: Boolean(packageJson?.scripts?.env || packageJson?.devDependencies?.["@wordpress/env"]),
      },
    },
    signals: Object.fromEntries(Object.entries(matches).map(([key, value]) => [key, { detected: value.length > 0, files: value }])),
  };
}

function findWordPressRoot(repoRoot, files) {
  let current = repoRoot;
  while (true) {
    if (fs.existsSync(path.join(current, "wp-load.php"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const config = files.find((file) => path.basename(file) === "wp-config.php");
  return config ? path.dirname(config) : null;
}

function run(binary, args, options = {}) {
  return spawnSync(binary, args, {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: options.timeout || 15_000,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
    shell: false,
  });
}

function capability(value = "unknown", source = null, details = null) {
  const result = { value, source };
  if (details !== null) result.details = details;
  return result;
}

function commandAvailable(binary) {
  const result = run(binary, ["--info"], { timeout: 5_000 });
  if (result.error?.code === "ENOENT") return capability("no", "PATH");
  if (!result.error) return capability("yes", "PATH", binary);
  return capability("unknown", "PATH", result.error.message);
}

function parseJsonOutput(result) {
  if (result.status !== 0) return null;
  const output = result.stdout.trim();
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function versionAtLeast(actual, minimum) {
  const parse = (value) => String(value || "").match(/^\d+(?:\.\d+){0,2}/)?.[0].split(".").map(Number) || [];
  const left = parse(actual);
  const right = parse(minimum);
  if (left.length === 0 || right.length === 0) return null;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function inspectRuntime({ repoRoot, wpPath, wpBinary, capabilities, versions, evidence, warnings }) {
  const wp = (args, timeout) => run(wpBinary, [`--path=${wpPath}`, ...args], { cwd: repoRoot, timeout });
  const coreInstalled = wp(["core", "is-installed", "--quiet"]);
  if (coreInstalled.status !== 0) {
    warnings.push(`WP-CLI could not bootstrap an installed WordPress site at ${wpPath}.`);
    if (coreInstalled.stderr.trim()) warnings.push(coreInstalled.stderr.trim());
    return false;
  }

  evidence.push({ check: "wordpress-runtime", source: "wp core is-installed", value: "available" });
  const wpVersion = wp(["core", "version"]);
  if (wpVersion.status === 0) versions.wordpress = { value: wpVersion.stdout.trim(), source: "wp core version" };
  const supportsAbilitiesVersion = versionAtLeast(versions.wordpress.value, "6.9");
  if (supportsAbilitiesVersion === false) {
    warnings.push(`WordPress ${versions.wordpress.value} is below the 6.9 minimum for the Abilities API.`);
  }

  const wooActive = wp(["plugin", "is-active", "woocommerce"]);
  capabilities.woocommerceActive = capability(wooActive.status === 0 ? "yes" : "no", "wp plugin is-active woocommerce");
  if (wooActive.status === 0) {
    const wooVersion = wp(["plugin", "get", "woocommerce", "--field=version"]);
    if (wooVersion.status === 0) versions.woocommerce = { value: wooVersion.stdout.trim(), source: "wp plugin get woocommerce" };
  }

  const hasCommand = (name) => wp(["cli", "has-command", name]).status === 0;
  capabilities.wcCli = capability(hasCommand("wc") ? "yes" : "no", "wp cli has-command wc");
  capabilities.abilityCli = capability(hasCommand("ability") ? "yes" : "no", "wp cli has-command ability");
  capabilities.mcpAdapterCli = capability(hasCommand("mcp-adapter") ? "yes" : "no", "wp cli has-command mcp-adapter");
  const siteUrl = wp(["option", "get", "siteurl"]);
  capabilities.siteHttps = capability(
    siteUrl.status === 0 ? (siteUrl.stdout.trim().startsWith("https://") ? "yes" : "no") : "unknown",
    "wp option get siteurl",
    siteUrl.status === 0 ? siteUrl.stdout.trim() : null
  );

  const php = String.raw`
$classify = static function ( $page_id, $block_name, $shortcode ) {
    $post = $page_id ? get_post( $page_id ) : null;
    if ( ! $post ) { return 'unknown'; }
    if ( has_block( $block_name, $post->post_content ) ) { return 'block'; }
    if ( has_shortcode( $post->post_content, $shortcode ) ) { return 'classic'; }
    return 'unknown';
};
$abilities = array();
if ( function_exists( 'wp_get_abilities' ) ) {
    foreach ( wp_get_abilities() as $ability ) {
        $name = $ability->get_name();
        if ( str_starts_with( $name, 'woocommerce/' ) ) { $abilities[] = $name; }
    }
}
$hpos = null;
if ( class_exists( '\\Automattic\\WooCommerce\\Utilities\\OrderUtil' ) ) {
    $hpos = \\Automattic\\WooCommerce\\Utilities\\OrderUtil::custom_orders_table_usage_is_enabled();
}
echo wp_json_encode( array(
    'theme_slug' => get_stylesheet(),
    'theme_type' => function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ? 'block' : 'classic',
    'cart' => $classify( (int) get_option( 'woocommerce_cart_page_id' ), 'woocommerce/cart', 'woocommerce_cart' ),
    'checkout' => $classify( (int) get_option( 'woocommerce_checkout_page_id' ), 'woocommerce/checkout', 'woocommerce_checkout' ),
    'hpos' => $hpos,
    'abilities_api' => function_exists( 'wp_get_abilities' ),
    'woo_abilities' => $abilities,
    'mcp_adapter_class' => class_exists( '\\WP\\MCP\\Core\\McpAdapter' ),
    'woo_mcp_feature' => get_option( 'woocommerce_feature_mcp_integration_enabled', 'no' ),
) );`;
  const runtime = parseJsonOutput(wp(["eval", php], 25_000));
  if (!runtime) {
    warnings.push("WP-CLI bootstrapped WordPress but the capability probe did not return valid JSON.");
    return false;
  }

  capabilities.activeTheme = capability(runtime.theme_type === "block" ? "block" : "classic", "wp_is_block_theme", runtime.theme_slug);
  capabilities.cart = capability(new Set(["block", "classic"]).has(runtime.cart) ? runtime.cart : "unknown", "assigned Cart page content");
  capabilities.checkout = capability(new Set(["block", "classic"]).has(runtime.checkout) ? runtime.checkout : "unknown", "assigned Checkout page content");
  capabilities.hpos = capability(runtime.hpos === null ? "unknown" : runtime.hpos ? "yes" : "no", "OrderUtil::custom_orders_table_usage_is_enabled");
  capabilities.abilitiesApi = capability(
    supportsAbilitiesVersion === false ? "no" : runtime.abilities_api ? "yes" : "no",
    supportsAbilitiesVersion === false ? "wp core version" : "wp_get_abilities"
  );
  const wooAbilities = Array.isArray(runtime.woo_abilities) ? runtime.woo_abilities.sort() : [];
  capabilities.wooCanonicalAbilities = capability(
    capabilities.abilitiesApi.value !== "yes"
      ? "unknown"
      : KNOWN_WOO_ABILITIES.some((name) => wooAbilities.includes(name))
        ? "yes"
        : "no",
    "WordPress Abilities registry",
    wooAbilities
  );
  capabilities.wooMcpFeature = capability(["yes", "1", 1, true].includes(runtime.woo_mcp_feature) ? "yes" : "no", "woocommerce_feature_mcp_integration_enabled");

  const standaloneAdapter = wp(["plugin", "is-active", "mcp-adapter"]);

  let defaultServer = false;
  if (capabilities.mcpAdapterCli.value === "yes") {
    const servers = wp(["mcp-adapter", "list"]);
    defaultServer = servers.status === 0 && servers.stdout.includes("mcp-adapter-default-server");
    if (servers.status !== 0 && servers.stderr.trim()) warnings.push(`MCP Adapter list failed: ${servers.stderr.trim()}`);
  }
  const adapterAvailable = capabilities.mcpAdapterCli.value === "yes" || runtime.mcp_adapter_class;
  capabilities.mcpAdapter = capability(adapterAvailable ? "yes" : "no", "WP MCP Adapter class/CLI");
  capabilities.mcpAdapterProvider = capability(
    standaloneAdapter.status === 0
      ? "standalone"
      : !adapterAvailable
        ? "none"
        : capabilities.wooMcpFeature.value === "yes"
          ? "woocommerce-bundled"
          : "unknown",
    "active MCP Adapter plugin and Woo feature state"
  );
  capabilities.mcpDefaultServer = capability(defaultServer ? "yes" : adapterAvailable ? "unknown" : "no", "wp mcp-adapter list");
  capabilities.localStdioMcp = capability(defaultServer ? "yes" : "no", "default MCP server plus WP-CLI");
  capabilities.remoteHttpMcp = capability(
    defaultServer && capabilities.siteHttps.value === "yes"
      ? "yes"
      : defaultServer && capabilities.siteHttps.value === "no"
        ? "no"
        : adapterAvailable
          ? "unknown"
          : "no",
    "default MCP server plus HTTPS site URL"
  );

  evidence.push({ check: "active-theme", source: capabilities.activeTheme.source, value: capabilities.activeTheme.value });
  evidence.push({ check: "cart-pathway", source: capabilities.cart.source, value: capabilities.cart.value });
  evidence.push({ check: "checkout-pathway", source: capabilities.checkout.source, value: capabilities.checkout.value });
  evidence.push({ check: "woocommerce-abilities", source: capabilities.wooCanonicalAbilities.source, value: capabilities.wooCanonicalAbilities.value });
  evidence.push({ check: "mcp-adapter-provider", source: capabilities.mcpAdapterProvider.source, value: capabilities.mcpAdapterProvider.value });
  return true;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const staticReport = collectStaticReport(options.repo);
  const scan = findFiles(options.repo, { maxFiles: 8000, maxDepth: 12 });
  const wpPath = options.wpPath || findWordPressRoot(options.repo, scan.files);
  const wpBinary = process.env.WOO_INSPECT_WP_BIN || "wp";
  const capabilities = {
    wpCli: commandAvailable(wpBinary),
    woocommerceActive: capability(),
    wcCli: capability(),
    abilityCli: capability(),
    mcpAdapterCli: capability(),
    siteHttps: capability(),
    activeTheme: capability(),
    cart: capability(),
    checkout: capability(),
    hpos: capability(),
    abilitiesApi: capability(),
    wooCanonicalAbilities: capability(),
    mcpAdapter: capability(),
    mcpAdapterProvider: capability(),
    mcpDefaultServer: capability(),
    wooMcpFeature: capability(),
    localStdioMcp: capability(),
    remoteHttpMcp: capability(),
    legacyWooMcp: capability(staticReport.signals.legacyWooMcp.detected ? "yes" : "no", "repository scan", staticReport.signals.legacyWooMcp.files),
  };
  const versions = {
    wordpress: { value: null, source: null },
    woocommerce: { value: null, source: null },
    declared: staticReport.project.pluginCandidates.map((plugin) => ({
      plugin: plugin.mainFile,
      wordpress: plugin.requiresWordPress,
      php: plugin.requiresPhp,
      woocommerceMinimum: plugin.requiresWooCommerce,
      woocommerceTested: plugin.testedWooCommerce,
    })),
  };
  const evidence = [];
  const warnings = [];
  if (staticReport.truncated) warnings.push("Repository scan reached its file limit; static signals may be incomplete.");

  let runtimeStatus = options.runtime === "off" ? "off" : "unavailable";
  let runtimeSucceeded = false;
  if (options.runtime !== "off") {
    if (capabilities.wpCli.value !== "yes") {
      warnings.push("WP-CLI is not available; active-site capabilities remain unknown.");
    } else if (!wpPath) {
      warnings.push("No WordPress root was found; pass --wp-path to enable runtime inspection.");
    } else {
      runtimeStatus = "attempted";
      runtimeSucceeded = inspectRuntime({
        repoRoot: options.repo,
        wpPath,
        wpBinary,
        capabilities,
        versions,
        evidence,
        warnings,
      });
      runtimeStatus = runtimeSucceeded ? "complete" : "failed";
    }
  }

  let themePathway = capabilities.activeTheme.value;
  let themeSource = capabilities.activeTheme.source;
  if (themePathway === "unknown" && staticReport.project.themeCandidates.length === 1) {
    themePathway = staticReport.project.themeCandidates[0].type;
    themeSource = "single repository theme candidate (not active-site evidence)";
  }
  if (!new Set(["block", "classic"]).has(themePathway)) themePathway = "unknown";

  const recommendations = [];
  if (capabilities.wpCli.value !== "yes") recommendations.push("Use static evidence only and disclose that active-site capabilities are unknown.");
  if (capabilities.legacyWooMcp.value === "yes") recommendations.push("Migrate legacy Woo MCP configuration to the standard WordPress MCP Adapter before removing old credentials or filters.");
  if (capabilities.abilitiesApi.value === "no") recommendations.push("Require WordPress 6.9 or newer for Abilities API work; do not fall back to the deprecated Woo MCP endpoint.");
  if (capabilities.checkout.value === "block") recommendations.push("Use documented block Checkout and Store API extension points for checkout UI/data changes.");
  if (capabilities.checkout.value === "classic") recommendations.push("Use classic checkout hooks only for this confirmed shortcode pathway.");

  const report = {
    tool: { name: "inspect-woo-context", version: TOOL_VERSION },
    project: { root: options.repo, ...staticReport.project },
    tooling: staticReport.tooling,
    versions,
    capabilities,
    pathways: {
      theme: { value: themePathway, source: themeSource },
      cart: capabilities.cart,
      checkout: capabilities.checkout,
      recommendations,
    },
    evidence,
    warnings,
    runtime: { mode: options.runtime, status: runtimeStatus, wpPath },
    signals: staticReport.signals,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (options.runtime === "required" && !runtimeSucceeded) return 3;
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}\n`);
  process.exitCode = error.exitCode || 1;
}
