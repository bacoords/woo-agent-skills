---
name: woo-cli
description: WooCommerce CLI commands (wp wc) that extend WP-CLI: product/order/customer management via CLI, bulk operations, data import/export, and custom WC-CLI command development.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-cli

## When to use

Use this skill when:
- Managing WooCommerce data via command line
- Bulk operations on products, orders, or customers
- Data import/export using CLI commands
- HPOS migration and verification
- Creating custom WP-CLI commands for WooCommerce
- Automating WooCommerce tasks in scripts
- Debugging WooCommerce issues via CLI tools

## Inputs required

- Access to WordPress installation with WP-CLI
- Understanding of required operation (CRUD, bulk, migration)
- Admin user credentials for authenticated commands
- For custom commands: command name, arguments, and functionality

## Procedure

### Step 0: Project Triage

Run the detection script to analyze existing CLI usage:

```bash
node skills/woo-cli/scripts/wc_cli_inspect.mjs
```

This identifies:
- Custom WP-CLI command classes
- Registered WC commands
- HPOS CLI usage
- Shell scripts using WooCommerce CLI

### Step 1: Understand WooCommerce CLI Structure

WooCommerce extends WP-CLI with the `wp wc` namespace:

```bash
# List available WC commands.
wp wc --help

# Main command groups.
wp wc product --help       # Product operations
wp wc shop_order --help    # Order operations
wp wc customer --help      # Customer operations
wp wc shop_coupon --help   # Coupon operations
wp wc tool --help          # System tools
wp wc hpos --help          # HPOS migration
```

**Authentication**: Most commands require `--user=admin` or a valid user ID.

### Step 2: Product Operations

```bash
# List products.
wp wc product list --user=admin
wp wc product list --status=publish --type=simple --format=json --user=admin

# Get product.
wp wc product get 99 --user=admin

# Create product.
wp wc product create \
  --name="New Product" \
  --type=simple \
  --regular_price=29.99 \
  --sku=PROD001 \
  --user=admin

# Update product.
wp wc product update 99 --regular_price=24.99 --user=admin

# Delete product.
wp wc product delete 99 --force --user=admin
```

Reference: `skills/woo-cli/references/product-commands.md`

### Step 3: Order Operations

```bash
# List orders.
wp wc shop_order list --user=admin
wp wc shop_order list --status=processing --format=csv --user=admin

# Get order.
wp wc shop_order get 123 --user=admin

# Create order.
wp wc shop_order create \
  --status=pending \
  --customer_id=1 \
  --line_items='[{"product_id":99,"quantity":2}]' \
  --user=admin

# Update order status.
wp wc shop_order update 123 --status=completed --user=admin

# Add order note.
wp wc shop_order_note create 123 --note="Order shipped" --user=admin
```

Reference: `skills/woo-cli/references/order-commands.md`

### Step 4: System Tools

```bash
# Run tool.
wp wc tool run regenerate_product_lookup_tables --user=admin
wp wc tool run clear_transients --user=admin

# List customers.
wp wc customer list --user=admin

# Manage coupons.
wp wc shop_coupon create --code=SAVE20 --discount_type=percent --amount=20 --user=admin

# Update settings.
wp wc setting update general woocommerce_currency --value=EUR --user=admin
```

Reference: `skills/woo-cli/references/tool-commands.md`

### Step 5: HPOS Migration

```bash
# Check HPOS status.
wp wc hpos status --user=admin

# Check plugin compatibility.
wp wc hpos compatibility --user=admin

# Enable HPOS with sync.
wp wc hpos enable --with-sync --user=admin

# Start migration.
wp wc hpos sync start --batch=500 --user=admin

# Verify migration.
wp wc hpos verify --user=admin

# Disable HPOS (rollback).
wp wc hpos disable --user=admin
```

Reference: `skills/woo-cli/references/hpos-cli.md`

### Step 6: Bulk Operations

```bash
# Export all orders.
wp wc shop_order list --format=csv --user=admin > orders.csv

# Bulk update order status.
for id in $(wp wc shop_order list --status=processing --format=ids --user=admin); do
  wp wc shop_order update $id --status=completed --user=admin
done

# Bulk delete trashed orders.
wp wc shop_order delete $(wp wc shop_order list --status=trash --format=ids --user=admin) --force --user=admin

# Update all product prices.
for id in $(wp wc product list --format=ids --user=admin); do
  current=$(wp wc product get $id --field=regular_price --user=admin)
  new=$(echo "$current * 1.1" | bc)
  wp wc product update $id --regular_price=$new --user=admin
done
```

### Step 7: Create Custom CLI Command

```php
<?php
namespace MyExtension\CLI;

defined( 'ABSPATH' ) || exit;

class My_Command extends \WP_CLI_Command {
    /**
     * Sync inventory from external system.
     *
     * ## OPTIONS
     *
     * [--dry-run]
     * : Preview changes without applying.
     *
     * [--batch=<number>]
     * : Process in batches. Default 100.
     *
     * ## EXAMPLES
     *
     *     wp my-extension sync-inventory
     *     wp my-extension sync-inventory --dry-run
     *     wp my-extension sync-inventory --batch=50
     *
     * @when after_wp_load
     */
    public function sync_inventory( $args, $assoc_args ): void {
        $dry_run = \WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
        $batch = (int) ( $assoc_args['batch'] ?? 100 );

        \WP_CLI::log( sprintf( 'Starting inventory sync (batch: %d)...', $batch ) );

        $products = wc_get_products( [
            'limit' => $batch,
            'status' => 'publish',
        ] );

        $progress = \WP_CLI\Utils\make_progress_bar( 'Syncing', count( $products ) );

        foreach ( $products as $product ) {
            $external_stock = $this->fetch_external_stock( $product->get_sku() );

            if ( $dry_run ) {
                \WP_CLI::log( sprintf(
                    'Would update %s: %d -> %d',
                    $product->get_sku(),
                    $product->get_stock_quantity(),
                    $external_stock
                ) );
            } else {
                $product->set_stock_quantity( $external_stock );
                $product->save();
            }

            $progress->tick();
        }

        $progress->finish();
        \WP_CLI::success( 'Inventory sync complete.' );
    }

    private function fetch_external_stock( string $sku ): int {
        // Fetch from external API.
        return 100;
    }
}

// Register command.
if ( defined( 'WP_CLI' ) && WP_CLI ) {
    \WP_CLI::add_command( 'my-extension', My_Command::class );
}
```

### Step 8: Register Command in Plugin

```php
<?php
// In main plugin file or bootstrap.
add_action( 'cli_init', function() {
    require_once __DIR__ . '/includes/cli/class-my-command.php';
} );
```

## Verification

### Checklist

- [ ] Commands execute without errors
- [ ] `--user=admin` provided for authenticated commands
- [ ] Output format matches expected (json, csv, table)
- [ ] Bulk operations complete successfully
- [ ] Custom commands registered and callable
- [ ] HPOS commands work (if applicable)
- [ ] Scripts are idempotent where needed

### Test Commands

```bash
# Verify WC CLI available.
wp wc --help

# Test authentication.
wp wc shop_order list --user=admin --per_page=1

# Test custom command.
wp my-extension sync-inventory --dry-run
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Error: No user specified" | Missing `--user` flag | Add `--user=admin` |
| "Command not found" | WC CLI not loaded | Check WooCommerce is active |
| JSON parse error | Invalid JSON in args | Escape quotes, validate JSON |
| Memory exhausted | Large dataset | Use `--batch` or increase memory |
| Command not registered | Wrong hook timing | Use `cli_init` hook |
| HPOS command not found | Old WC version | Requires WooCommerce 8.0+ |

### Debugging

```bash
# Verbose output.
wp wc shop_order list --user=admin --debug

# Check WC version.
wp plugin get woocommerce --field=version

# Test WP-CLI.
wp --info

# List registered commands.
wp help wc
```

## Escalation

Escalate to human review when:
- Complex data transformations requiring custom validation
- Production data migration needing rollback plans
- Integration with external APIs requiring authentication
- Performance optimization for very large datasets (100k+ records)
- Custom command design decisions affecting multiple workflows
- HPOS migration on stores with complex order customizations

**Documentation:**
- WC CLI overview: https://developer.woocommerce.com/docs/wc-cli/cli-overview.md
- WC CLI commands reference: https://developer.woocommerce.com/docs/wc-cli/wc-cli-commands.md
- WC CLI examples: https://developer.woocommerce.com/docs/wc-cli/wc-cli-examples.md
- How to use WC CLI: https://developer.woocommerce.com/docs/wc-cli/using-wc-cli.md
- HPOS CLI tools: https://developer.woocommerce.com/docs/features/high-performance-order-storage/cli-tools.md
- WC CLI FAQ: https://developer.woocommerce.com/docs/wc-cli/cli-faq.md
