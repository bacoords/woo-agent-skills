const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--path="));
const command = args.join(" ");

if (command === "--info") {
  process.stdout.write("WP-CLI 2.fixture\n");
} else if (command === "core is-installed --quiet") {
  if (process.env.FAKE_WP_BOOTSTRAP_FAIL) {
    process.stderr.write("WordPress bootstrap failed\n");
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
} else if (command === "core version") {
  process.stdout.write(`${process.env.FAKE_WP_WORDPRESS_VERSION || "6.9.2"}\n`);
} else if (command === "plugin is-active woocommerce") {
  process.exitCode = 0;
} else if (command === "plugin is-active mcp-adapter") {
  process.exitCode = process.env.FAKE_WP_ADAPTER_PROVIDER === "standalone" ? 0 : 1;
} else if (command === "plugin get woocommerce --field=version") {
  process.stdout.write("10.9.1\n");
} else if (command === "option get siteurl") {
  process.stdout.write(`${process.env.FAKE_WP_SITE_URL || "https://example.test"}\n`);
} else if (command.startsWith("cli has-command ")) {
  const name = args.at(-1);
  const commands = [
    ...(!process.env.FAKE_WP_NO_WC ? ["wc"] : []),
    ...(!process.env.FAKE_WP_NO_ABILITY ? ["ability"] : []),
    ...(!process.env.FAKE_WP_NO_MCP ? ["mcp-adapter"] : []),
  ];
  process.exitCode = commands.includes(name) ? 0 : 1;
} else if (command === "mcp-adapter list") {
  if (process.env.FAKE_WP_NO_MCP) {
    process.stderr.write("MCP Adapter command unavailable\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("mcp-adapter-default-server\n");
  }
} else if (args[0] === "eval") {
  const abilitiesApi = !process.env.FAKE_WP_NO_ABILITIES && !String(process.env.FAKE_WP_WORDPRESS_VERSION || "6.9.2").startsWith("6.8");
  process.stdout.write(JSON.stringify({
    theme_slug: "fixture-block-theme",
    theme_type: process.env.FAKE_WP_THEME || "block",
    cart: process.env.FAKE_WP_CART || "classic",
    checkout: process.env.FAKE_WP_CHECKOUT || "block",
    hpos: true,
    abilities_api: abilitiesApi,
    woo_abilities: !abilitiesApi || process.env.FAKE_WP_NO_WOO_ABILITIES ? [] : [
      "woocommerce/products-query",
      "woocommerce/product-create",
      "woocommerce/orders-query",
      "woocommerce/order-add-note"
    ],
    mcp_adapter_class: !process.env.FAKE_WP_NO_MCP,
    woo_mcp_feature: process.env.FAKE_WP_ADAPTER_PROVIDER === "standalone" || process.env.FAKE_WP_NO_MCP ? "no" : "yes"
  }));
} else {
  process.stderr.write(`Unhandled fake WP-CLI command: ${command}\n`);
  process.exitCode = 1;
}
