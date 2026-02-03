import fs from "node:fs";
import path from "node:path";

// WordPress.org Plugin API - includes version history when fields[] requested
const SOURCES = {
  woocommercePluginInfo:
    "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=woocommerce&fields[]=versions&fields[]=requires&fields[]=tested&fields[]=requires_php&fields[]=last_updated&fields[]=active_installs",
};

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "woo-agent-skills-upstream-sync/0.1",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got non-JSON response`);
  }
}

/**
 * Parse version string into components
 */
function parseVersion(versionStr) {
  const parts = versionStr.split(".").map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compare two version strings (descending order for sort)
 */
function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa.major !== pb.major) return pb.major - pa.major;
  if (pa.minor !== pb.minor) return pb.minor - pa.minor;
  return pb.patch - pa.patch;
}

/**
 * Normalize plugin info and extract release history
 */
function normalizePluginData(payload) {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid plugin info response" };
  }

  // Extract versions object - keys are version strings, values are download URLs
  const versionsObj = payload.versions || {};
  const versionKeys = Object.keys(versionsObj);

  // Filter to stable releases only (no RCs, betas, alphas, trunk)
  const stableVersions = versionKeys
    .filter((v) => {
      if (v === "trunk") return false;
      if (/-(rc|beta|alpha|dev)/i.test(v)) return false;
      // Must start with a number
      if (!/^\d+\.\d+/.test(v)) return false;
      return true;
    })
    .sort(compareVersions);

  // Build release objects
  const releases = stableVersions.map((version) => {
    const parsed = parseVersion(version);
    return {
      version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      downloadUrl: versionsObj[version],
    };
  });

  // Group by major version
  const byMajor = {};
  for (const release of releases) {
    if (!byMajor[release.major]) {
      byMajor[release.major] = [];
    }
    byMajor[release.major].push(release);
  }

  return {
    // Current plugin info
    current: {
      version: payload.version ?? null,
      testedUpTo: payload.tested ?? null,
      requiresWP: payload.requires ?? null,
      requiresPHP: payload.requires_php ?? null,
      lastUpdated: payload.last_updated ?? null,
      activeInstalls: payload.active_installs ?? null,
    },
    // Release history
    releases: {
      latest: releases[0] ?? null,
      recent: releases.slice(0, 20),
      byMajorVersion: byMajor,
      totalCount: releases.length,
    },
  };
}

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "shared", "references");

  const pluginPayload = await fetchJson(SOURCES.woocommercePluginInfo);
  const data = normalizePluginData(pluginPayload);

  if (data.error) {
    throw new Error(data.error);
  }

  writeJson(path.join(outDir, "woocommerce-releases.json"), {
    source: SOURCES.woocommercePluginInfo,
    fetchedAt: new Date().toISOString(),
    ...data.releases,
  });

  writeJson(path.join(outDir, "woocommerce-plugin-info.json"), {
    source: SOURCES.woocommercePluginInfo,
    fetchedAt: new Date().toISOString(),
    ...data.current,
  });

  process.stdout.write("OK: updated shared/references/* from WordPress.org\n");
  process.stdout.write(`  Latest WooCommerce: ${data.releases.latest?.version ?? "unknown"}\n`);
  process.stdout.write(`  Total releases: ${data.releases.totalCount}\n`);
  process.stdout.write(`  Requires PHP: ${data.current.requiresPHP ?? "unknown"}\n`);
  process.stdout.write(`  Tested up to WP: ${data.current.testedUpTo ?? "unknown"}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || String(err)}\n`);
  process.exit(1);
});
