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
]);

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

function findFilesRecursive(repoRoot, predicate, { maxFiles = 3000, maxDepth = 6 } = {}) {
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

function detectPluginHeader(filePath) {
  const contents = readFileSafe(filePath, 64 * 1024);
  if (!contents) return null;

  const headerMatch = contents.match(/^\s*Plugin Name:\s*(.+)\s*$/im);
  if (!headerMatch) return null;

  const header = {
    name: headerMatch[1].trim(),
    file: filePath,
    version: null,
    requiresWP: null,
    requiresPHP: null,
    requiresWC: null,
    wcTested: null,
    textDomain: null,
  };

  const versionMatch = contents.match(/^\s*Version:\s*(.+)\s*$/im);
  if (versionMatch) header.version = versionMatch[1].trim();

  const requiresWPMatch = contents.match(/^\s*Requires at least:\s*(.+)\s*$/im);
  if (requiresWPMatch) header.requiresWP = requiresWPMatch[1].trim();

  const requiresPHPMatch = contents.match(/^\s*Requires PHP:\s*(.+)\s*$/im);
  if (requiresPHPMatch) header.requiresPHP = requiresPHPMatch[1].trim();

  const requiresWCMatch = contents.match(/^\s*WC requires at least:\s*(.+)\s*$/im);
  if (requiresWCMatch) header.requiresWC = requiresWCMatch[1].trim();

  const wcTestedMatch = contents.match(/^\s*WC tested up to:\s*(.+)\s*$/im);
  if (wcTestedMatch) header.wcTested = wcTestedMatch[1].trim();

  const textDomainMatch = contents.match(/^\s*Text Domain:\s*(.+)\s*$/im);
  if (textDomainMatch) header.textDomain = textDomainMatch[1].trim();

  return header;
}

function analyzeExtensionStructure(repoRoot) {
  const structure = {
    mainFile: null,
    hasIncludesDir: existsDir(path.join(repoRoot, "includes")),
    hasSrcDir: existsDir(path.join(repoRoot, "src")),
    hasAssetsDir: existsDir(path.join(repoRoot, "assets")),
    hasTemplatesDir: existsDir(path.join(repoRoot, "templates")),
    hasLanguagesDir: existsDir(path.join(repoRoot, "languages")),
    hasTestsDir: existsDir(path.join(repoRoot, "tests")),
    usesNamespaces: false,
    usesAutoloading: false,
    hasReadme: existsFile(path.join(repoRoot, "readme.txt")) || existsFile(path.join(repoRoot, "README.md")),
  };

  // Find main plugin file
  const rootPhpFiles = [];
  try {
    const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && ent.name.endsWith(".php")) {
        rootPhpFiles.push(path.join(repoRoot, ent.name));
      }
    }
  } catch {
    // ignore
  }

  for (const phpFile of rootPhpFiles) {
    const header = detectPluginHeader(phpFile);
    if (header) {
      structure.mainFile = {
        path: path.relative(repoRoot, phpFile),
        header,
      };
      break;
    }
  }

  // Check for namespaces and autoloading
  const composerJson = path.join(repoRoot, "composer.json");
  if (existsFile(composerJson)) {
    const contents = readFileSafe(composerJson);
    if (contents) {
      try {
        const composer = JSON.parse(contents);
        structure.usesAutoloading = Boolean(
          composer.autoload?.["psr-4"] ||
          composer.autoload?.classmap
        );
        if (composer.autoload?.["psr-4"]) {
          structure.usesNamespaces = true;
        }
      } catch {
        // ignore
      }
    }
  }

  return structure;
}

function analyzeHPOSCompatibility(repoRoot) {
  const hpos = {
    declaresCompatibility: false,
    compatibilityValue: null,
    declarationFile: null,
    usesOrderUtil: false,
    usesLegacyOrderQueries: false,
    issues: [],
  };

  const { results: phpFiles } = findFilesRecursive(
    repoRoot,
    (p) => p.endsWith(".php"),
    { maxFiles: 2000, maxDepth: 6 }
  );

  for (const phpFile of phpFiles) {
    const contents = readFileSafe(phpFile, 128 * 1024);
    if (!contents) continue;

    // Check for FeaturesUtil::declare_compatibility
    const declareMatch = contents.match(
      /FeaturesUtil::declare_compatibility\s*\(\s*['"]custom_order_tables['"]\s*,\s*[^,]+,\s*(true|false)/i
    );
    if (declareMatch && !hpos.declaresCompatibility) {
      hpos.declaresCompatibility = true;
      hpos.compatibilityValue = declareMatch[1].toLowerCase() === "true";
      hpos.declarationFile = path.relative(repoRoot, phpFile);
    }

    // Check for OrderUtil usage (good - HPOS-aware)
    if (contents.includes("OrderUtil::") || contents.includes("\\Automattic\\WooCommerce\\Utilities\\OrderUtil")) {
      hpos.usesOrderUtil = true;
    }

    // Check for legacy patterns (potential issues)
    const legacyPatterns = [
      /get_post_meta\s*\(\s*\$order/i,
      /update_post_meta\s*\(\s*\$order/i,
      /\$wpdb->posts.*order/i,
      /wp_posts.*shop_order/i,
      /get_post\s*\(\s*\$order/i,
    ];

    for (const pattern of legacyPatterns) {
      if (pattern.test(contents) && !hpos.usesLegacyOrderQueries) {
        hpos.usesLegacyOrderQueries = true;
        hpos.issues.push({
          type: "legacy_order_query",
          file: path.relative(repoRoot, phpFile),
          message: "Found potential legacy order meta/post access",
        });
      }
    }
  }

  return hpos;
}

function analyzeBlockCheckoutSupport(repoRoot) {
  const blocks = {
    declaresCompatibility: false,
    implementsIntegration: false,
    extendsSchema: false,
    integrationFile: null,
    issues: [],
  };

  const { results: phpFiles } = findFilesRecursive(
    repoRoot,
    (p) => p.endsWith(".php"),
    { maxFiles: 2000, maxDepth: 6 }
  );

  for (const phpFile of phpFiles) {
    const contents = readFileSafe(phpFile, 128 * 1024);
    if (!contents) continue;

    // Check for Block Checkout compatibility declaration
    if (contents.includes("cart_checkout_blocks") && contents.includes("declare_compatibility")) {
      blocks.declaresCompatibility = true;
    }

    // Check for IntegrationInterface implementation
    if (contents.includes("IntegrationInterface") || contents.includes("implements IntegrationInterface")) {
      blocks.implementsIntegration = true;
      blocks.integrationFile = path.relative(repoRoot, phpFile);
    }

    // Check for ExtendSchema usage
    if (contents.includes("ExtendSchema") || contents.includes("extend_store_api_schema")) {
      blocks.extendsSchema = true;
    }
  }

  return blocks;
}

function analyzeLifecycleHooks(repoRoot) {
  const lifecycle = {
    hasActivation: false,
    hasDeactivation: false,
    hasUninstall: false,
    hasDependencyCheck: false,
    hookLocations: {},
  };

  const { results: phpFiles } = findFilesRecursive(
    repoRoot,
    (p) => p.endsWith(".php"),
    { maxFiles: 2000, maxDepth: 6 }
  );

  for (const phpFile of phpFiles) {
    const contents = readFileSafe(phpFile, 128 * 1024);
    if (!contents) continue;

    const relativePath = path.relative(repoRoot, phpFile);

    if (contents.includes("register_activation_hook")) {
      lifecycle.hasActivation = true;
      lifecycle.hookLocations.activation = relativePath;
    }

    if (contents.includes("register_deactivation_hook")) {
      lifecycle.hasDeactivation = true;
      lifecycle.hookLocations.deactivation = relativePath;
    }

    if (contents.includes("register_uninstall_hook") || path.basename(phpFile) === "uninstall.php") {
      lifecycle.hasUninstall = true;
      lifecycle.hookLocations.uninstall = relativePath;
    }

    // Check for WooCommerce dependency check pattern
    if (contents.includes("class_exists( 'WooCommerce'") ||
        contents.includes("class_exists('WooCommerce'") ||
        contents.includes("is_plugin_active") && contents.includes("woocommerce")) {
      lifecycle.hasDependencyCheck = true;
      lifecycle.hookLocations.dependencyCheck = relativePath;
    }
  }

  // Check for uninstall.php in root
  if (existsFile(path.join(repoRoot, "uninstall.php"))) {
    lifecycle.hasUninstall = true;
    lifecycle.hookLocations.uninstall = "uninstall.php";
  }

  return lifecycle;
}

function analyzeSettingsIntegration(repoRoot) {
  const settings = {
    usesWCSettings: false,
    hasSettingsTab: false,
    hasSettingsSection: false,
    usesSettingsAPI: false,
    settingsFiles: [],
  };

  const { results: phpFiles } = findFilesRecursive(
    repoRoot,
    (p) => p.endsWith(".php"),
    { maxFiles: 2000, maxDepth: 6 }
  );

  for (const phpFile of phpFiles) {
    const contents = readFileSafe(phpFile, 128 * 1024);
    if (!contents) continue;

    const relativePath = path.relative(repoRoot, phpFile);

    if (contents.includes("woocommerce_settings_tabs_array") ||
        contents.includes("WC_Settings_Page")) {
      settings.hasSettingsTab = true;
      settings.settingsFiles.push(relativePath);
    }

    if (contents.includes("woocommerce_get_sections_") ||
        contents.includes("woocommerce_get_settings_")) {
      settings.hasSettingsSection = true;
      if (!settings.settingsFiles.includes(relativePath)) {
        settings.settingsFiles.push(relativePath);
      }
    }

    if (contents.includes("WC_Admin_Settings") ||
        contents.includes("woocommerce_admin_fields") ||
        contents.includes("woocommerce_update_options")) {
      settings.usesWCSettings = true;
      settings.usesSettingsAPI = true;
    }
  }

  return settings;
}

function buildRecommendations(analysis) {
  const recommendations = [];

  // HPOS recommendations
  if (!analysis.hpos.declaresCompatibility) {
    recommendations.push({
      priority: "high",
      category: "hpos",
      message: "Add HPOS compatibility declaration using FeaturesUtil::declare_compatibility()",
    });
  }

  if (analysis.hpos.usesLegacyOrderQueries) {
    recommendations.push({
      priority: "high",
      category: "hpos",
      message: "Replace legacy order meta access with WC_Order methods or OrderUtil",
    });
  }

  // Block Checkout recommendations
  if (!analysis.blocks.declaresCompatibility && !analysis.blocks.implementsIntegration) {
    recommendations.push({
      priority: "medium",
      category: "blocks",
      message: "Consider adding Block Checkout support via IntegrationInterface",
    });
  }

  // Lifecycle recommendations
  if (!analysis.lifecycle.hasDependencyCheck) {
    recommendations.push({
      priority: "high",
      category: "lifecycle",
      message: "Add WooCommerce dependency check before initialization",
    });
  }

  if (!analysis.lifecycle.hasUninstall) {
    recommendations.push({
      priority: "low",
      category: "lifecycle",
      message: "Consider adding uninstall.php for cleanup",
    });
  }

  // Structure recommendations
  if (!analysis.structure.usesAutoloading && analysis.structure.hasSrcDir) {
    recommendations.push({
      priority: "medium",
      category: "structure",
      message: "Consider PSR-4 autoloading for src/ directory",
    });
  }

  return recommendations;
}

function main() {
  const repoRoot = process.cwd();

  const structure = analyzeExtensionStructure(repoRoot);
  const hpos = analyzeHPOSCompatibility(repoRoot);
  const blocks = analyzeBlockCheckoutSupport(repoRoot);
  const lifecycle = analyzeLifecycleHooks(repoRoot);
  const settings = analyzeSettingsIntegration(repoRoot);

  const analysis = { structure, hpos, blocks, lifecycle, settings };
  const recommendations = buildRecommendations(analysis);

  const report = {
    tool: { name: "detect_woo_extensions", version: TOOL_VERSION },
    extension: structure.mainFile?.header ?? null,
    structure: {
      mainFile: structure.mainFile?.path ?? null,
      directories: {
        includes: structure.hasIncludesDir,
        src: structure.hasSrcDir,
        assets: structure.hasAssetsDir,
        templates: structure.hasTemplatesDir,
        languages: structure.hasLanguagesDir,
        tests: structure.hasTestsDir,
      },
      usesNamespaces: structure.usesNamespaces,
      usesAutoloading: structure.usesAutoloading,
      hasReadme: structure.hasReadme,
    },
    compatibility: {
      hpos: {
        declared: hpos.declaresCompatibility,
        compatible: hpos.compatibilityValue,
        declarationFile: hpos.declarationFile,
        usesOrderUtil: hpos.usesOrderUtil,
        hasLegacyPatterns: hpos.usesLegacyOrderQueries,
        issues: hpos.issues,
      },
      blockCheckout: {
        declared: blocks.declaresCompatibility,
        implementsIntegration: blocks.implementsIntegration,
        extendsSchema: blocks.extendsSchema,
        integrationFile: blocks.integrationFile,
      },
    },
    lifecycle: {
      hasActivation: lifecycle.hasActivation,
      hasDeactivation: lifecycle.hasDeactivation,
      hasUninstall: lifecycle.hasUninstall,
      hasDependencyCheck: lifecycle.hasDependencyCheck,
      hookLocations: lifecycle.hookLocations,
    },
    settings: {
      usesWCSettings: settings.usesWCSettings,
      hasSettingsTab: settings.hasSettingsTab,
      hasSettingsSection: settings.hasSettingsSection,
      files: settings.settingsFiles,
    },
    recommendations,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
