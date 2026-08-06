import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listSkillDirs(repoRoot) {
  const skillsRoot = path.join(repoRoot, "skills");
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => path.join(skillsRoot, entry.name));
}

function parseFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  assert(lines[0] === "---", "SKILL.md must start with YAML frontmatter");
  const end = lines.indexOf("---", 1);
  assert(end > 1, "SKILL.md frontmatter is not closed");
  const metadata = {};
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    assert(match, `Unsupported frontmatter line: ${line}`);
    metadata[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return metadata;
}

function validateSkillName(name) {
  return name.length <= 64
    && name === name.toLowerCase()
    && !name.startsWith("-")
    && !name.endsWith("-")
    && !name.includes("--")
    && /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(name);
}

function validateSkill(repoRoot, skillDir) {
  const skillPath = path.join(skillDir, "SKILL.md");
  const markdown = fs.readFileSync(skillPath, "utf8");
  const metadata = parseFrontmatter(markdown);
  const expectedName = path.basename(skillDir);
  assert(metadata.name === expectedName, `Frontmatter name mismatch in ${path.relative(repoRoot, skillPath)}`);
  assert(validateSkillName(metadata.name), `Invalid skill name: ${metadata.name}`);
  assert(metadata.description && metadata.description.length <= 1024, `Invalid description in ${metadata.name}`);
  assert(
    Object.keys(metadata).sort().join(",") === "description,name",
    `${metadata.name} frontmatter may contain only name and description`
  );
  assert(markdown.split(/\r?\n/).length < 500, `${metadata.name}/SKILL.md must stay under 500 lines`);

  const agentMetadata = path.join(skillDir, "agents", "openai.yaml");
  assert(fs.existsSync(agentMetadata), `Missing agents/openai.yaml in ${metadata.name}`);
  const yaml = fs.readFileSync(agentMetadata, "utf8");
  assert(yaml.includes("display_name:"), `Missing display_name in ${metadata.name}/agents/openai.yaml`);
  assert(yaml.includes("short_description:"), `Missing short_description in ${metadata.name}/agents/openai.yaml`);
  assert(yaml.includes(`$${metadata.name}`), `default_prompt must mention $${metadata.name}`);

  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    assert(/^(?:references|scripts)\//.test(target), `${metadata.name} uses a non-resource local link: ${target}`);
    assert(fs.existsSync(path.join(skillDir, target)), `${metadata.name} links to missing resource: ${target}`);
  }
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function validateLegacyGuidance(repoRoot, skillDirs) {
  const tokens = [
    "/wp-json/woocommerce/mcp",
    "X-MCP-API-Key",
    "woocommerce_mcp_allow_insecure_transport",
    "expose_in_deprecated_woocommerce_mcp",
  ];
  for (const filePath of skillDirs.flatMap(walkFiles)) {
    if (
      filePath.endsWith(`${path.sep}references${path.sep}abilities-mcp.md`)
      || filePath.endsWith(`${path.sep}scripts${path.sep}inspect-woo-context.mjs`)
    ) continue;
    const contents = fs.readFileSync(filePath, "utf8");
    for (const token of tokens) {
      assert(!contents.includes(token), `Deprecated MCP token '${token}' outside migration reference: ${path.relative(repoRoot, filePath)}`);
    }
  }
}

function validateScenarios(repoRoot, skillNames) {
  const root = path.join(repoRoot, "eval", "scenarios");
  const files = fs.readdirSync(root, { withFileTypes: true });
  const strayMarkdown = files.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md");
  assert(strayMarkdown.length === 0, `Eval scenarios must be JSON: ${strayMarkdown.map((entry) => entry.name).join(", ")}`);
  const scenarioFiles = files.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  assert(scenarioFiles.length > 0, "No JSON eval scenarios found");

  const coveredSkills = new Set();
  for (const entry of scenarioFiles) {
    const filePath = path.join(root, entry.name);
    const scenario = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert(typeof scenario.name === "string" && scenario.name, `${entry.name} needs a name`);
    assert(typeof scenario.query === "string" && scenario.query, `${entry.name} needs a query`);
    assert(Array.isArray(scenario.skills), `${entry.name} skills must be an array`);
    assert(Array.isArray(scenario.expected_behavior) && scenario.expected_behavior.length > 0, `${entry.name} needs expected_behavior`);
    assert(Array.isArray(scenario.success_criteria) && scenario.success_criteria.length > 0, `${entry.name} needs success_criteria`);
    for (const skill of scenario.skills) {
      assert(skillNames.has(skill), `${entry.name} references unknown skill: ${skill}`);
      coveredSkills.add(skill);
    }
  }
  for (const skill of skillNames) assert(coveredSkills.has(skill), `No eval scenario covers ${skill}`);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd, encoding: "utf8", env: process.env });
  assert(result.status === 0, result.stderr.trim() || result.stdout.trim() || `${command} failed`);
  return result;
}

function main() {
  const repoRoot = process.cwd();
  const skillDirs = listSkillDirs(repoRoot);
  const skillNames = new Set(skillDirs.map((directory) => path.basename(directory)));
  assert(skillNames.size === 3, `Expected exactly three skills, found: ${[...skillNames].join(", ")}`);
  for (const expected of ["woo-extension-dev", "woo-block-theme-dev", "woo-mcp-connect"]) {
    assert(skillNames.has(expected), `Missing expected skill: ${expected}`);
  }
  assert(!skillNames.has("woo-cart-checkout"), "woo-cart-checkout must be removed after consolidation");

  runCommand(process.execPath, [path.join(repoRoot, "shared", "scripts", "sync-skill-resources.mjs"), "--check"], { cwd: repoRoot });
  for (const skillDir of skillDirs) validateSkill(repoRoot, skillDir);
  validateLegacyGuidance(repoRoot, skillDirs);
  validateScenarios(repoRoot, skillNames);

  const testRoot = path.join(repoRoot, "eval", "tests");
  const tests = fs.existsSync(testRoot)
    ? fs.readdirSync(testRoot).filter((name) => name.endsWith(".test.mjs")).map((name) => path.join(testRoot, name))
    : [];
  assert(tests.length > 0, "No fixture-driven tests found");
  const testResult = runCommand(process.execPath, ["--test", ...tests], { cwd: repoRoot });
  process.stdout.write(testResult.stdout);
  process.stdout.write("OK: skills, resources, scenarios, and fixture-driven tests passed.\n");
}

main();
