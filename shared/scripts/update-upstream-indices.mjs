import fs from "node:fs";
import path from "node:path";

const SOURCES = {
  woocommerceReleases: "https://api.github.com/repos/woocommerce/woocommerce/releases?per_page=30",
  woocommercePluginInfo: "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=woocommerce",
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

function normalizeWooCommerceReleases(payload) {
  const releases = Array.isArray(payload) ? payload : [];

  // Filter to stable releases only (no RCs, betas, alphas)
  const stable = releases
    .filter((r) => {
      if (!r || r.draft || r.prerelease) return false;
      if (typeof r.tag_name !== "string") return false;
      // Skip release candidates, betas, alphas
      if (/-(rc|beta|alpha|dev)/i.test(r.tag_name)) return false;
      return true;
    })
    .map((r) => {
      // Extract version number from tag (e.g., "9.5.1" from "9.5.1")
      const version = r.tag_name.replace(/^v/, "");
      const [major, minor] = version.split(".").map(Number);

      return {
        version,
        major,
        minor,
        tag: r.tag_name,
        name: typeof r.name === "string" ? r.name : null,
        publishedAt: typeof r.published_at === "string" ? r.published_at : null,
        url: typeof r.html_url === "string" ? r.html_url : null,
      };
    })
    // Sort by version descending
    .sort((a, b) => {
      if (a.major !== b.major) return b.major - a.major;
      if (a.minor !== b.minor) return b.minor - a.minor;
      return 0;
    });

  // Group by major version for easy reference
  const byMajor = {};
  for (const release of stable) {
    if (!byMajor[release.major]) {
      byMajor[release.major] = [];
    }
    byMajor[release.major].push(release);
  }

  return {
    latest: stable[0] ?? null,
    recent: stable.slice(0, 20),
    byMajorVersion: byMajor,
  };
}

function normalizePluginInfo(payload) {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid plugin info response" };
  }

  return {
    version: payload.version ?? null,
    testedUpTo: payload.tested ?? null,
    requiresWP: payload.requires ?? null,
    requiresPHP: payload.requires_php ?? null,
    lastUpdated: payload.last_updated ?? null,
    activeInstalls: payload.active_installs ?? null,
  };
}

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "shared", "references");

  const [releasesPayload, pluginInfoPayload] = await Promise.all([
    fetchJson(SOURCES.woocommerceReleases),
    fetchJson(SOURCES.woocommercePluginInfo),
  ]);

  const releases = normalizeWooCommerceReleases(releasesPayload);
  const pluginInfo = normalizePluginInfo(pluginInfoPayload);

  writeJson(path.join(outDir, "woocommerce-releases.json"), {
    source: SOURCES.woocommerceReleases,
    fetchedAt: new Date().toISOString(),
    ...releases,
  });

  writeJson(path.join(outDir, "woocommerce-plugin-info.json"), {
    source: SOURCES.woocommercePluginInfo,
    fetchedAt: new Date().toISOString(),
    ...pluginInfo,
  });

  process.stdout.write("OK: updated shared/references/* upstream indices\n");
  process.stdout.write(`  Latest WooCommerce: ${releases.latest?.version ?? "unknown"}\n`);
  process.stdout.write(`  Requires PHP: ${pluginInfo.requiresPHP ?? "unknown"}\n`);
  process.stdout.write(`  Tested up to WP: ${pluginInfo.testedUpTo ?? "unknown"}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || String(err)}\n`);
  process.exit(1);
});
