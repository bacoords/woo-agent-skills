import fs from "node:fs";
import path from "node:path";

function usage() {
  process.stderr.write(
    [
      "Usage:",
      '  node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"',
      "",
      "Creates a standard skill, OpenAI interface metadata, and a JSON eval scenario.",
    ].join("\n")
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateSkillName(name) {
  if (!name || typeof name !== "string") return "Missing skill name";
  if (name.length > 64) return `Skill name exceeds 64 chars (${name.length})`;
  if (name !== name.toLowerCase()) return "Skill name must be lowercase";
  if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) return "Invalid hyphen placement";
  return /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u.test(name) ? null : "Skill name contains invalid characters";
}

function titleFromName(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function yamlQuote(value) {
  return JSON.stringify(value);
}

function main() {
  const [, , skillName, description] = process.argv;
  if (!skillName || !description) {
    usage();
    process.exit(2);
  }

  const nameError = validateSkillName(skillName);
  assert(!nameError, nameError);
  assert(description.length <= 1024, "Description must not exceed 1024 characters");

  const repoRoot = process.cwd();
  const skillDir = path.join(repoRoot, "skills", skillName);
  const scenarioPath = path.join(repoRoot, "eval", "scenarios", `${skillName}.json`);
  assert(!fs.existsSync(skillDir), `Skill directory already exists: ${path.relative(repoRoot, skillDir)}`);
  assert(!fs.existsSync(scenarioPath), `Scenario already exists: ${path.relative(repoRoot, scenarioPath)}`);

  fs.mkdirSync(path.join(skillDir, "agents"), { recursive: true });
  const skillBody = `---\nname: ${skillName}\ndescription: ${yamlQuote(description)}\n---\n\n# ${titleFromName(skillName)}\n\n## Procedure\n\n1. Gather the task inputs.\n2. Follow the relevant project conventions.\n3. Verify the result.\n\n## Verification\n\n- Run the relevant checks.\n- Report limitations.\n`;
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillBody, "utf8");

  const shortDescriptionSource = description.trim().length >= 25
    ? description.trim()
    : `${titleFromName(skillName)} workflow guidance`;
  const shortDescription = shortDescriptionSource.length <= 64
    ? shortDescriptionSource
    : `${shortDescriptionSource.slice(0, 61).trimEnd()}...`;
  const openaiYaml = [
    "interface:",
    `  display_name: ${yamlQuote(titleFromName(skillName))}`,
    `  short_description: ${yamlQuote(shortDescription)}`,
    `  default_prompt: ${yamlQuote(`Use $${skillName} to complete this task.`)}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(skillDir, "agents", "openai.yaml"), openaiYaml, "utf8");

  fs.mkdirSync(path.dirname(scenarioPath), { recursive: true });
  fs.writeFileSync(
    scenarioPath,
    `${JSON.stringify({
      name: `${titleFromName(skillName)} basic workflow`,
      skills: [skillName],
      query: `Use ${skillName} for a representative task.`,
      expected_behavior: ["Inspect the task context", "Follow the skill procedure", "Verify the result"],
      success_criteria: ["The skill is selected", "The result is verified"],
    }, null, 2)}\n`,
    "utf8"
  );

  process.stdout.write(`OK: created ${path.relative(repoRoot, skillDir)} and ${path.relative(repoRoot, scenarioPath)}\n`);
}

main();
