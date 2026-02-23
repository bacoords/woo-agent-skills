import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const TOOL_VERSION = "0.1.0";

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
]);

// -- Safe file operations --

function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function readFileSafe(p, maxBytes = 256 * 1024) {
  try {
    const buf = fs.readFileSync(p);
    if (buf.byteLength > maxBytes) return buf.subarray(0, maxBytes).toString("utf8");
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function existsFile(p) {
  const st = statSafe(p);
  return Boolean(st && st.isFile());
}

function existsDir(p) {
  const st = statSafe(p);
  return Boolean(st && st.isDirectory());
}

// -- File discovery --

function findFilesRecursive(repoRoot, predicate, { maxFiles = 6000, maxDepth = 8 } = {}) {
  const results = [];
  const queue = [{ dir: repoRoot, depth: 0 }];
  let visited = 0;

  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) continue;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (DEFAULT_IGNORES.has(ent.name)) continue;
        queue.push({ dir: fullPath, depth: depth + 1 });
        continue;
      }
      if (!ent.isFile()) continue;

      visited += 1;
      if (visited > maxFiles) return { results, truncated: true };
      if (predicate(fullPath)) results.push(fullPath);
    }
  }

  return { results, truncated: false };
}

function scanForTokens(repoRoot, { tokens, exts, maxFiles = 2500, maxDepth = 8 }) {
  const loweredTokens = tokens.map((t) => t.toLowerCase());
  const matches = new Map();

  const { results: files, truncated } = findFilesRecursive(
    repoRoot,
    (p) => {
      const ext = path.extname(p).toLowerCase();
      return exts.includes(ext);
    },
    { maxFiles, maxDepth }
  );

  for (const filePath of files) {
    const contents = readFileSafe(filePath, 128 * 1024);
    if (!contents) continue;
    const haystack = contents.toLowerCase();

    for (let i = 0; i < loweredTokens.length; i += 1) {
      const token = loweredTokens[i];
      if (matches.has(token)) continue;
      if (haystack.includes(token)) matches.set(token, path.relative(repoRoot, filePath));
    }
    if (matches.size === loweredTokens.length) break;
  }

  return {
    truncated,
    matches: Object.fromEntries([...matches.entries()]),
  };
}

// -- Package/Config parsing --

function parsePackageJson(repoRoot) {
  const p = path.join(repoRoot, "package.json");
  if (!existsFile(p)) return null;
  const txt = readFileSafe(p);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function parseComposerJson(repoRoot) {
  const p = path.join(repoRoot, "composer.json");
  if (!existsFile(p)) return null;
  const txt = readFileSafe(p);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function detectPackageManager(repoRoot) {
  const hasPnpm = existsFile(path.join(repoRoot, "pnpm-lock.yaml"));
  const hasYarn = existsFile(path.join(repoRoot, "yarn.lock"));
  const hasNpm = existsFile(path.join(repoRoot, "package-lock.json"));
  const hasBun = existsFile(path.join(repoRoot, "bun.lockb")) || existsFile(path.join(repoRoot, "bun.lock"));
  if (hasPnpm) return "pnpm";
  if (hasYarn) return "yarn";
  if (hasBun) return "bun";
  if (hasNpm) return "npm";
  return null;
}

// -- Plugin/Theme header detection --

function detectPluginHeader(filePath) {
  const contents = readFileSafe(filePath, 128 * 1024);
  if (!contents) return null;

  const headerMatch = contents.match(/^\s*Plugin Name:\s*(.+)\s*$/im);
  if (!headerMatch) return null;

  const header = {
    name: headerMatch[1].trim(),
    version: null,
    requiresWP: null,
    requiresPHP: null,
    requiresWC: null,
    wcTested: null,
  };

  const versionMatch = contents.match(/^\s*Version:\s*(.+)\s*$/im);
  if (versionMatch) header.version = versionMatch[1].trim();

  const requiresWPMatch = contents.match(/^\s*Requires at least:\s*(.+)\s*$/im);
  if (requiresWPMatch) header.requiresWP = requiresWPMatch[1].trim();

  const requiresPHPMatch = contents.match(/^\s*Requires PHP:\s*(.+)\s*$/im);
  if (requiresPHPMatch) header.requiresPHP = requiresPHPMatch[1].trim();

  // WooCommerce-specific headers
  const requiresWCMatch = contents.match(/^\s*WC requires at least:\s*(.+)\s*$/im);
  if (requiresWCMatch) header.requiresWC = requiresWCMatch[1].trim();

  const wcTestedMatch = contents.match(/^\s*WC tested up to:\s*(.+)\s*$/im);
  if (wcTestedMatch) header.wcTested = wcTestedMatch[1].trim();

  return header;
}

function detectThemeHeader(filePath) {
  const contents = readFileSafe(filePath, 128 * 1024);
  if (!contents) return null;
  const headerMatch = contents.match(/^\s*Theme Name:\s*(.+)\s*$/im);
  if (!headerMatch) return null;
  return headerMatch[1].trim();
}

// -- WooCommerce-specific detection --

function detectWooCommerceCore(repoRoot) {
  // Check for woocommerce.php in standard locations
  const candidates = [
    path.join(repoRoot, "woocommerce.php"),
    path.join(repoRoot, "wp-content", "plugins", "woocommerce", "woocommerce.php"),
    path.join(repoRoot, "plugins", "woocommerce", "woocommerce.php"),
  ];

  for (const candidate of candidates) {
    if (existsFile(candidate)) {
      const header = detectPluginHeader(candidate);
      if (header && header.name.toLowerCase().includes("woocommerce")) {
        return { path: path.relative(repoRoot, candidate), header };
      }
    }
  }

  // Scan wp-content/plugins for WooCommerce
  const pluginsDir = path.join(repoRoot, "wp-content", "plugins");
  if (existsDir(pluginsDir)) {
    try {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith("woocommerce")) {
          const mainFile = path.join(pluginsDir, entry.name, "woocommerce.php");
          if (existsFile(mainFile)) {
            const header = detectPluginHeader(mainFile);
            if (header) return { path: path.relative(repoRoot, mainFile), header };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function detectHPOSCompatibility(repoRoot) {
  // Scan for HPOS compatibility declarations
  const hposScan = scanForTokens(repoRoot, {
    tokens: [
      "declare_compatibility",
      "custom_order_tables",
      "\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil",
      "FeaturesUtil::declare_compatibility",
      "woocommerce_hpos_enabled",
      "OrderUtil::custom_orders_table_usage_is_enabled",
    ],
    exts: [".php"],
    maxFiles: 2500,
    maxDepth: 8,
  });

  const declaresCompatibility = Boolean(
    hposScan.matches["declare_compatibility"] ||
    hposScan.matches["featuresutil::declare_compatibility"]
  );

  const usesHPOSApis = Boolean(
    hposScan.matches["custom_order_tables"] ||
    hposScan.matches["orderutil::custom_orders_table_usage_is_enabled"]
  );

  return {
    declaresCompatibility,
    usesHPOSApis,
    matches: hposScan.matches,
    scanTruncated: hposScan.truncated,
  };
}

function detectBlockCheckout(repoRoot) {
  // Scan for Block Checkout/Cart usage
  const blockScan = scanForTokens(repoRoot, {
    tokens: [
      "woocommerce/checkout",
      "woocommerce/cart",
      "woocommerce-blocks",
      "StoreApi",
      "\\Automattic\\WooCommerce\\StoreApi",
      "IntegrationInterface",
      "woocommerce_blocks_loaded",
      "ExtendSchema",
    ],
    exts: [".php", ".js", ".ts", ".tsx", ".json"],
    maxFiles: 2500,
    maxDepth: 8,
  });

  const usesBlockCheckout = Boolean(
    blockScan.matches["woocommerce/checkout"] ||
    blockScan.matches["woocommerce/cart"]
  );

  const extendsStoreApi = Boolean(
    blockScan.matches["storeapi"] ||
    blockScan.matches["integrationinterface"] ||
    blockScan.matches["extendschema"]
  );

  return {
    usesBlockCheckout,
    extendsStoreApi,
    matches: blockScan.matches,
    scanTruncated: blockScan.truncated,
  };
}

function detectExtensionType(repoRoot) {
  // Detect the type of WooCommerce extension
  const typeScan = scanForTokens(repoRoot, {
    tokens: [
      // Payment Gateway
      "WC_Payment_Gateway",
      "extends WC_Payment_Gateway",
      "process_payment",
      // Shipping Method
      "WC_Shipping_Method",
      "extends WC_Shipping_Method",
      "calculate_shipping",
      // Product Type
      "WC_Product",
      "extends WC_Product",
      "woocommerce_product_class",
      // Email
      "WC_Email",
      "extends WC_Email",
      // Integration
      "WC_Integration",
      "extends WC_Integration",
      // REST API
      "WC_REST_Controller",
      "register_rest_route",
      "wc/v3",
      // Admin
      "WC_Admin_Settings",
      "woocommerce_settings_tabs",
    ],
    exts: [".php"],
    maxFiles: 2500,
    maxDepth: 8,
  });

  const types = [];

  if (typeScan.matches["wc_payment_gateway"] || typeScan.matches["extends wc_payment_gateway"]) {
    types.push("payment-gateway");
  }
  if (typeScan.matches["wc_shipping_method"] || typeScan.matches["extends wc_shipping_method"]) {
    types.push("shipping-method");
  }
  if (typeScan.matches["wc_product"] || typeScan.matches["extends wc_product"]) {
    types.push("product-type");
  }
  if (typeScan.matches["wc_email"] || typeScan.matches["extends wc_email"]) {
    types.push("email");
  }
  if (typeScan.matches["wc_integration"] || typeScan.matches["extends wc_integration"]) {
    types.push("integration");
  }
  if (typeScan.matches["wc_rest_controller"] || typeScan.matches["register_rest_route"]) {
    types.push("rest-api");
  }

  return {
    types,
    matches: typeScan.matches,
    scanTruncated: typeScan.truncated,
  };
}

function detectWooHooks(repoRoot) {
  // Scan for common WooCommerce hook usage
  const hookScan = scanForTokens(repoRoot, {
    tokens: [
      "woocommerce_init",
      "woocommerce_loaded",
      "before_woocommerce_init",
      "woocommerce_after_register_post_type",
      "woocommerce_checkout_process",
      "woocommerce_payment_complete",
      "woocommerce_order_status_changed",
      "woocommerce_add_to_cart",
      "woocommerce_cart_calculate_fees",
      "woocommerce_before_checkout_form",
      "woocommerce_product_options_general_product_data",
    ],
    exts: [".php"],
    maxFiles: 2500,
    maxDepth: 8,
  });

  return {
    matches: hookScan.matches,
    hookCount: Object.keys(hookScan.matches).length,
    scanTruncated: hookScan.truncated,
  };
}

function detectWCCli(repoRoot) {
  // Detect WC-CLI command registration
  const cliScan = scanForTokens(repoRoot, {
    tokens: [
      "WP_CLI::add_command",
      "wp wc",
      "wc_cli_commands",
    ],
    exts: [".php", ".sh", ".yml", ".yaml"],
    maxFiles: 2500,
    maxDepth: 8,
  });

  return {
    hasCliCommands: Object.keys(cliScan.matches).length > 0,
    matches: cliScan.matches,
    scanTruncated: cliScan.truncated,
  };
}

// -- Project kind detection --

function detectKinds(repoRoot, signals) {
  const kinds = new Set();

  // Check if this is WooCommerce core
  if (signals.wooCommerceCore) {
    const wcPath = signals.wooCommerceCore.path;
    if (wcPath === "woocommerce.php" || wcPath.endsWith("/woocommerce/woocommerce.php")) {
      // Check if we're in the WooCommerce repo root
      if (existsDir(path.join(repoRoot, "plugins", "woocommerce")) ||
          existsFile(path.join(repoRoot, "woocommerce.php"))) {
        kinds.add("woo-core");
      }
    }
  }

  // Check for WooCommerce site (has WC installed in wp-content)
  if (signals.hasWpContentDir && signals.wooCommerceCore) {
    kinds.add("woo-site");
  }

  // Check for WooCommerce extension
  if (signals.pluginHeader && !kinds.has("woo-core")) {
    // Has WC headers or extends WC classes
    if (signals.pluginHeader.requiresWC ||
        signals.pluginHeader.wcTested ||
        signals.extensionTypes.types.length > 0 ||
        signals.hpos.declaresCompatibility ||
        signals.hooks.hookCount > 0) {
      kinds.add("woo-extension");
    }
  }

  // Check for WooCommerce theme (theme with WC support)
  if (signals.themeName) {
    const wcThemeScan = scanForTokens(repoRoot, {
      tokens: ["woocommerce_content", "wc-template-hooks", "add_theme_support( 'woocommerce'"],
      exts: [".php"],
      maxFiles: 500,
      maxDepth: 4,
    });
    if (Object.keys(wcThemeScan.matches).length > 0) {
      kinds.add("woo-theme");
    }
  }

  if (kinds.size === 0) kinds.add("unknown");

  // Determine primary kind
  const priority = ["woo-core", "woo-extension", "woo-theme", "woo-site", "unknown"];
  let primary = "unknown";
  for (const k of priority) {
    if (kinds.has(k)) {
      primary = k;
      break;
    }
  }

  return { kind: [...kinds], primary };
}

// -- Recommendations --

function buildRecommendations({ primaryKind, packageManager, packageJson, composerJson, tooling, signals }) {
  const commands = [];
  const notes = [];

  if (tooling.node.hasPackageJson) {
    const pm = packageManager ?? "npm";
    const run = pm === "yarn" ? "yarn" : `${pm} run`;
    const hasScript = (name) => Boolean(packageJson?.scripts?.[name]);
    if (hasScript("lint")) commands.push(`${run} lint`);
    if (hasScript("test")) commands.push(`${run} test`);
    if (hasScript("build")) commands.push(`${run} build`);
  }

  if (tooling.php.hasComposerJson) {
    commands.push("composer install");
    if (tooling.php.phpunitXml.length > 0) commands.push("vendor/bin/phpunit");
  }

  // WooCommerce-specific recommendations
  if (primaryKind === "woo-extension") {
    if (!signals.hpos.declaresCompatibility) {
      notes.push("HPOS compatibility not declared. Add FeaturesUtil::declare_compatibility() for WC 8.2+.");
    }
    if (signals.extensionTypes.types.includes("payment-gateway") && !signals.blockCheckout.extendsStoreApi) {
      notes.push("Payment gateway may need Block Checkout integration for full compatibility.");
    }
  }

  if (primaryKind === "woo-site") {
    notes.push("WooCommerce site detected. Use `wp wc` commands for store management.");
  }

  if (signals.scanTruncated) {
    notes.push("Scan truncated due to file limit; some signals may be missing.");
  }

  if (primaryKind === "unknown") {
    notes.push("Could not classify as WooCommerce project. Check for WC plugin headers or WC class usage.");
  }

  return { commands, notes };
}

// -- Main --

function main() {
  const repoRoot = process.cwd();

  // Core paths
  const wpContent = path.join(repoRoot, "wp-content");
  const pluginsDir = path.join(wpContent, "plugins");

  const hasWpContentDir = existsDir(wpContent);
  const hasPluginsDir = existsDir(pluginsDir);

  // Parse configs
  const packageJson = parsePackageJson(repoRoot);
  const composerJson = parseComposerJson(repoRoot);
  const packageManager = detectPackageManager(repoRoot);

  // Detect WooCommerce core
  const wooCommerceCore = detectWooCommerceCore(repoRoot);

  // Detect plugin/theme headers at repo root
  let pluginHeader = null;
  let themeName = null;

  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name.toLowerCase().endsWith(".php") && !pluginHeader) {
      pluginHeader = detectPluginHeader(path.join(repoRoot, entry.name));
    }
    if (entry.name === "style.css" && !themeName) {
      themeName = detectThemeHeader(path.join(repoRoot, entry.name));
    }
  }

  // WooCommerce-specific detection
  const hpos = detectHPOSCompatibility(repoRoot);
  const blockCheckout = detectBlockCheckout(repoRoot);
  const extensionTypes = detectExtensionType(repoRoot);
  const hooks = detectWooHooks(repoRoot);
  const cli = detectWCCli(repoRoot);

  // Find test files
  const phpunitXml = [];
  for (const candidate of ["phpunit.xml", "phpunit.xml.dist"]) {
    const full = path.join(repoRoot, candidate);
    if (existsFile(full)) phpunitXml.push(candidate);
  }

  const hasWpEnv =
    existsFile(path.join(repoRoot, ".wp-env.json")) ||
    existsFile(path.join(repoRoot, ".wp-env.override.json")) ||
    Boolean(packageJson?.devDependencies?.["@wordpress/env"]);

  const hasPlaywright = Boolean(
    packageJson?.devDependencies?.["@playwright/test"] ||
    packageJson?.devDependencies?.["@wordpress/e2e-test-utils-playwright"]
  );

  const hasJest = Boolean(
    packageJson?.devDependencies?.jest ||
    packageJson?.devDependencies?.["@wordpress/jest-preset-default"]
  );

  const hasPhpUnit = phpunitXml.length > 0 ||
    Boolean(composerJson?.["require-dev"]?.["phpunit/phpunit"]);

  // Check for @wordpress/scripts usage
  const usesWordpressScripts = Boolean(
    packageJson?.devDependencies?.["@wordpress/scripts"] ||
    packageJson?.dependencies?.["@wordpress/scripts"]
  );

  // Scan truncation tracking
  const scanTruncated = hpos.scanTruncated || blockCheckout.scanTruncated ||
    extensionTypes.scanTruncated || hooks.scanTruncated;

  const signals = {
    paths: {
      repoRoot,
      wpContent: hasWpContentDir ? wpContent : null,
      pluginsDir: hasPluginsDir ? pluginsDir : null,
    },
    hasWpContentDir,
    hasPluginsDir,
    wooCommerceCore,
    pluginHeader,
    themeName,
    hpos,
    blockCheckout,
    extensionTypes,
    hooks,
    cli,
    scanTruncated,
  };

  const { kind, primary } = detectKinds(repoRoot, signals);

  const tooling = {
    php: {
      hasComposerJson: existsFile(path.join(repoRoot, "composer.json")),
      hasVendorDir: existsDir(path.join(repoRoot, "vendor")),
      phpunitXml,
    },
    node: {
      hasPackageJson: existsFile(path.join(repoRoot, "package.json")),
      packageManager,
      usesWordpressScripts,
    },
    tests: {
      hasPhpUnit,
      hasWpEnv,
      hasPlaywright,
      hasJest,
    },
  };

  // Version extraction
  const versions = {
    woocommerce: wooCommerceCore?.header?.version
      ? { value: wooCommerceCore.header.version, source: wooCommerceCore.path }
      : { value: null, source: null },
    requirements: {
      wcMinimum: pluginHeader?.requiresWC ?? null,
      wcTested: pluginHeader?.wcTested ?? null,
      wpMinimum: pluginHeader?.requiresWP ?? null,
      phpMinimum: pluginHeader?.requiresPHP ?? null,
    },
  };

  const recommendations = buildRecommendations({
    primaryKind: primary,
    packageManager,
    packageJson,
    composerJson,
    tooling,
    signals,
  });

  const report = {
    tool: { name: "detect_woo_project", version: TOOL_VERSION },
    project: { kind, primary, notes: [] },
    signals,
    tooling,
    versions,
    features: {
      hposCompatible: hpos.declaresCompatibility,
      blockCheckoutReady: blockCheckout.extendsStoreApi,
      extensionTypes: extensionTypes.types,
      hasCliCommands: cli.hasCliCommands,
    },
    recommendations,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
