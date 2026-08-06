#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const INDEX_URL = "https://developer.woocommerce.com/llms.txt";
const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with", "woo", "woocommerce"]);

class CliError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    "Usage:",
    '  node scripts/woo-docs.mjs search "<query>" [--limit=<n>] [--index-file=<path>]',
    '  node scripts/woo-docs.mjs fetch "<docs-url>"',
  ].join("\n");
}

function tokenize(value) {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  )];
}

export function parseDocsIndex(markdown) {
  const seen = new Set();
  const entries = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s+)?\[([^\]]+)]\((https?:\/\/(?:developer\.woocommerce\.com\/docs\/|raw\.githubusercontent\.com\/woocommerce\/woocommerce\/trunk\/docs\/)[^)]+)\)\s*(.*)$/i);
    if (!match) continue;

    const sourceUrl = match[2];
    const url = publicDocsUrl(sourceUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    entries.push({
      title: match[1].trim(),
      url,
      sourceUrl,
      description: (match[3] || "").replace(/^(?::|[-–—])\s*/, "").trim(),
    });
  }

  return entries;
}

function publicDocsUrl(value) {
  const url = new URL(value);
  if (url.hostname === "developer.woocommerce.com") {
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\.(?:md|mdx)$/, "").replace(/\/+$/, "");
    return `${url.toString()}/`;
  }

  const prefix = "/woocommerce/woocommerce/trunk/docs/";
  if (url.hostname !== "raw.githubusercontent.com" || !url.pathname.startsWith(prefix)) {
    throw new CliError(`Unsupported docs index URL: ${value}`, 4);
  }
  let relativePath = url.pathname.slice(prefix.length);
  relativePath = relativePath.replace(/(?:^|\/)(?:README|index)\.(?:md|mdx)$/i, "");
  relativePath = relativePath.replace(/\.(?:md|mdx)$/i, "").replace(/^\/+|\/+$/g, "");
  return `https://developer.woocommerce.com/docs/${relativePath ? `${relativePath}/` : ""}`;
}

export function searchDocsIndex(entries, query, limit = 5) {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = tokenize(query);

  return entries
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const url = entry.url.toLowerCase();
      const description = entry.description.toLowerCase();
      let score = title.includes(normalizedQuery) ? 30 : 0;
      if (description.includes(normalizedQuery)) score += 12;

      for (const token of tokens) {
        if (title.includes(token)) score += 9;
        if (url.includes(token)) score += 5;
        if (description.includes(token)) score += 2;
      }

      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}

export function normalizeDocsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new CliError(`Invalid documentation URL: ${value}`, 2);
  }

  if (url.protocol !== "https:" || url.hostname !== "developer.woocommerce.com" || !url.pathname.startsWith("/docs")) {
    throw new CliError("fetch accepts only HTTPS URLs from developer.woocommerce.com/docs", 2);
  }

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith(".md")) url.pathname += ".md";
  return url.toString();
}

function parseOptions(argv) {
  const options = { positional: [], limit: 5, indexFile: null };
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg.startsWith("--index-file=")) {
      options.indexFile = arg.slice("--index-file=".length);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--")) {
      throw new CliError(`Unknown option: ${arg}`, 2);
    } else {
      options.positional.push(arg);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 20) {
    throw new CliError("--limit must be an integer from 1 to 20", 2);
  }
  return options;
}

async function fetchText(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { accept: "text/markdown,text/plain;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new CliError(`Documentation request failed: ${error.message}`, 4);
  }

  if (!response.ok) {
    throw new CliError(`Documentation request failed: HTTP ${response.status} for ${url}`, 4);
  }
  return response.text();
}

async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const options = parseOptions(rest);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (command === "search") {
    const query = options.positional.join(" ").trim();
    if (!query) throw new CliError("search requires a query", 2);

    let index;
    let source;
    if (options.indexFile) {
      source = path.resolve(options.indexFile);
      try {
        index = fs.readFileSync(source, "utf8");
      } catch (error) {
        throw new CliError(`Cannot read index file: ${error.message}`, 2);
      }
    } else {
      source = INDEX_URL;
      index = await fetchText(INDEX_URL);
    }

    const entries = parseDocsIndex(index);
    if (entries.length === 0) throw new CliError(`No documentation entries found in ${source}`, options.indexFile ? 2 : 4);
    const results = searchDocsIndex(entries, query, options.limit);
    process.stdout.write(`${JSON.stringify({ query, source, results }, null, 2)}\n`);
    return;
  }

  if (command === "fetch") {
    if (options.indexFile || options.limit !== 5 || options.positional.length !== 1) {
      throw new CliError("fetch requires exactly one docs URL and accepts no search options", 2);
    }
    const url = normalizeDocsUrl(options.positional[0]);
    const markdown = await fetchText(url);
    process.stdout.write(markdown.endsWith("\n") ? markdown : `${markdown}\n`);
    return;
  }

  throw new CliError(`Unknown command: ${command}`, 2);
}

const isEntryPoint = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isEntryPoint) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    if (error.exitCode === 2) process.stderr.write(`${usage()}\n`);
    process.exit(error.exitCode || 1);
  });
}
