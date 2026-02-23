import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const TOOL_VERSION = "0.1.0";
const DEFAULT_IGNORES = new Set([".git", "node_modules", "vendor", "dist", "build"]);

function readFileSafe(p, maxBytes = 256 * 1024) {
  try {
    const buf = fs.readFileSync(p);
    if (buf.byteLength > maxBytes) return buf.subarray(0, maxBytes).toString("utf8");
    return buf.toString("utf8");
  } catch { return null; }
}

function findFilesRecursive(repoRoot, predicate, { maxFiles = 3000, maxDepth = 6 } = {}) {
  const results = [];
  const queue = [{ dir: repoRoot, depth: 0 }];
  let visited = 0;
  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
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

function analyzeCliUsage(repoRoot) {
  const patterns = {
    hasCustomCommands: false,
    extendsWPCLICommand: false,
    usesWcCliNamespace: false,
    usesHposCli: false,
    hasShellScripts: false,
    commandClasses: [],
    registeredCommands: [],
    shellScripts: [],
    files: {},
  };

  const { results: phpFiles, truncated } = findFilesRecursive(repoRoot, (p) => p.endsWith(".php"), { maxFiles: 2000, maxDepth: 6 });

  for (const phpFile of phpFiles) {
    const contents = readFileSafe(phpFile, 128 * 1024);
    if (!contents) continue;
    const relativePath = path.relative(repoRoot, phpFile);

    // WP-CLI command classes.
    if (contents.includes("WP_CLI_Command") || contents.includes("extends WP_CLI_Command")) {
      patterns.extendsWPCLICommand = true;
      patterns.hasCustomCommands = true;
      if (!patterns.files.commands) patterns.files.commands = [];
      patterns.files.commands.push(relativePath);

      const classMatch = contents.match(/class\s+(\w+)\s+extends\s+WP_CLI_Command/);
      if (classMatch) patterns.commandClasses.push({ name: classMatch[1], file: relativePath });
    }

    // WP_CLI::add_command registration.
    if (contents.includes("WP_CLI::add_command")) {
      patterns.hasCustomCommands = true;
      const cmdMatches = contents.matchAll(/WP_CLI::add_command\s*\(\s*['"]([^'"]+)['"]/g);
      for (const match of cmdMatches) {
        patterns.registeredCommands.push({ command: match[1], file: relativePath });
      }
    }

    // WooCommerce CLI namespace.
    if (contents.includes("wc ") || contents.includes("'wc'") || contents.includes('"wc"')) {
      if (contents.includes("WP_CLI::add_command") || contents.includes("WP_CLI_Command")) {
        patterns.usesWcCliNamespace = true;
      }
    }

    // HPOS CLI usage.
    if (contents.includes("hpos") || contents.includes("HPOS") || contents.includes("wc hpos") || contents.includes("cot") || contents.includes("custom-orders-table")) {
      if (contents.includes("WP_CLI") || contents.includes("cli")) {
        patterns.usesHposCli = true;
        if (!patterns.files.hpos) patterns.files.hpos = [];
        patterns.files.hpos.push(relativePath);
      }
    }
  }

  // Check for shell scripts.
  const { results: shellFiles } = findFilesRecursive(repoRoot, (p) => p.endsWith(".sh") || p.endsWith(".bash"), { maxFiles: 500, maxDepth: 4 });

  for (const shellFile of shellFiles) {
    const contents = readFileSafe(shellFile, 64 * 1024);
    if (!contents) continue;
    const relativePath = path.relative(repoRoot, shellFile);

    if (contents.includes("wp wc") || contents.includes("wp-cli") || contents.includes("woocommerce")) {
      patterns.hasShellScripts = true;
      patterns.shellScripts.push(relativePath);
    }
  }

  for (const key of Object.keys(patterns.files)) {
    patterns.files[key] = [...new Set(patterns.files[key])].slice(0, 10);
  }

  return { patterns, truncated };
}

function buildRecommendations(patterns) {
  const recommendations = [];

  if (patterns.hasCustomCommands && patterns.commandClasses.length === 0) {
    recommendations.push({ priority: "medium", category: "cli", message: "Custom CLI commands detected but no WP_CLI_Command classes found. Consider using class-based commands." });
  }

  if (patterns.extendsWPCLICommand && !patterns.usesWcCliNamespace) {
    recommendations.push({ priority: "info", category: "namespace", message: "Custom CLI command exists. Consider using 'wc' namespace for WooCommerce-related commands." });
  }

  if (!patterns.hasCustomCommands) {
    recommendations.push({ priority: "info", category: "cli", message: "No custom CLI commands detected. Built-in 'wp wc' commands are available." });
  }

  return recommendations;
}

function main() {
  const repoRoot = process.cwd();
  const { patterns, truncated } = analyzeCliUsage(repoRoot);
  const recommendations = buildRecommendations(patterns);

  const report = {
    tool: { name: "wc_cli_inspect", version: TOOL_VERSION },
    patterns: {
      hasCustomCommands: patterns.hasCustomCommands,
      extendsWPCLICommand: patterns.extendsWPCLICommand,
      usesWcCliNamespace: patterns.usesWcCliNamespace,
      usesHposCli: patterns.usesHposCli,
      hasShellScripts: patterns.hasShellScripts,
    },
    commandClasses: patterns.commandClasses,
    registeredCommands: patterns.registeredCommands,
    shellScripts: patterns.shellScripts,
    files: patterns.files,
    recommendations,
    scanTruncated: truncated,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
