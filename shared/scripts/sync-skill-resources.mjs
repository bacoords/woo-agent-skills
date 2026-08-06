#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const resourceRoot = path.join(repoRoot, "shared", "skill-resources");
const manifestPath = path.join(resourceRoot, "manifest.json");

function usage() {
  return [
    "Usage:",
    "  node shared/scripts/sync-skill-resources.mjs --write",
    "  node shared/scripts/sync-skill-resources.mjs --check",
  ].join("\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const modes = argv.filter((arg) => arg === "--write" || arg === "--check");
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  assert(argv.length === 1 && modes.length === 1, usage());
  return { mode: modes[0].slice(2) };
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.version === 1, `Unsupported shared resource manifest version: ${manifest.version}`);
  assert(manifest.skills && typeof manifest.skills === "object", "Manifest must define skills");
  return manifest;
}

function expectedFiles(manifest) {
  const files = [];
  for (const [skillName, config] of Object.entries(manifest.skills)) {
    const skillRoot = path.join(repoRoot, "skills", skillName);
    assert(fs.existsSync(path.join(skillRoot, "SKILL.md")), `Manifest references missing skill: ${skillName}`);
    for (const kind of ["references", "scripts"]) {
      assert(Array.isArray(config[kind]), `Manifest ${skillName}.${kind} must be an array`);
      for (const filename of config[kind]) {
        assert(path.basename(filename) === filename, `Shared resource names must be flat: ${filename}`);
        const source = path.join(resourceRoot, kind, filename);
        const destination = path.join(skillRoot, kind, filename);
        assert(fs.existsSync(source), `Missing canonical resource: ${path.relative(repoRoot, source)}`);
        files.push({ source, destination });
      }
    }
  }
  return files;
}

function check(files) {
  const drift = [];
  for (const { source, destination } of files) {
    if (!fs.existsSync(destination)) {
      drift.push(`missing ${path.relative(repoRoot, destination)}`);
      continue;
    }
    const expected = fs.readFileSync(source);
    const actual = fs.readFileSync(destination);
    if (!expected.equals(actual)) drift.push(`changed ${path.relative(repoRoot, destination)}`);
  }
  assert(drift.length === 0, `Shared skill resources are out of sync:\n- ${drift.join("\n- ")}\nRun with --write.`);
}

function write(files) {
  for (const { source, destination } of files) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, fs.statSync(source).mode);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const files = expectedFiles(readManifest());
  if (args.mode === "write") write(files);
  else check(files);
  process.stdout.write(`OK: ${args.mode === "write" ? "materialized" : "verified"} ${files.length} shared skill resources.\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
