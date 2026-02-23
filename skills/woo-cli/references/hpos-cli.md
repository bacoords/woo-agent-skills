# HPOS CLI Commands

## Check HPOS Status

```bash
# Get current HPOS status.
wp wc hpos status --user=admin

# Output shows:
# - Authoritative table (posts or orders)
# - Sync status
# - Compatibility mode
```

## Enable HPOS

```bash
# Enable HPOS (orders table becomes authoritative).
wp wc hpos enable --user=admin

# With sync enabled.
wp wc hpos enable --with-sync --user=admin
```

## Disable HPOS

```bash
# Disable HPOS (revert to posts table).
wp wc hpos disable --user=admin
```

## Sync Commands

```bash
# Check sync status.
wp wc hpos sync status --user=admin

# Start sync (migrate orders to HPOS table).
wp wc hpos sync start --user=admin

# Sync with batch size.
wp wc hpos sync start --batch=100 --user=admin

# Resume interrupted sync.
wp wc hpos sync resume --user=admin

# Verify sync integrity.
wp wc hpos verify --user=admin
```

## Migration Commands

```bash
# Migrate orders from posts to HPOS.
wp wc hpos migrate --user=admin

# Migrate specific batch.
wp wc hpos migrate --batch=500 --user=admin

# Dry run (check without migrating).
wp wc hpos migrate --dry-run --user=admin

# Verbose output.
wp wc hpos migrate --verbose --user=admin
```

## Compatibility Check

```bash
# Check plugin compatibility.
wp wc hpos compatibility --user=admin

# Output shows plugins declaring:
# - compatible
# - incompatible
# - uncertain (no declaration)
```

## Cleanup Commands

```bash
# Clean up orphaned data.
wp wc hpos cleanup --user=admin

# Remove legacy data after migration.
wp wc hpos cleanup-legacy --user=admin

# Verify before cleanup.
wp wc hpos verify --user=admin
```

## Database Verification

```bash
# Verify order data integrity.
wp wc hpos verify --user=admin

# Check specific order.
wp wc hpos verify --order=123 --user=admin

# Verify all orders (slow).
wp wc hpos verify --all --user=admin

# Fix inconsistencies.
wp wc hpos verify --fix --user=admin
```

## Common Workflows

### Initial HPOS Migration

```bash
# 1. Check current status.
wp wc hpos status --user=admin

# 2. Check plugin compatibility.
wp wc hpos compatibility --user=admin

# 3. Enable sync mode first.
wp wc hpos enable --with-sync --user=admin

# 4. Migrate existing orders.
wp wc hpos sync start --batch=500 --user=admin

# 5. Verify migration.
wp wc hpos verify --user=admin

# 6. Disable sync once stable.
wp option update woocommerce_custom_orders_table_data_sync_enabled no
```

### Rollback to Posts

```bash
# 1. Verify data in both tables.
wp wc hpos verify --user=admin

# 2. Disable HPOS.
wp wc hpos disable --user=admin

# 3. Verify orders accessible.
wp wc shop_order list --per_page=10 --user=admin
```

### Large Store Migration

```bash
# Use batches with pauses for large stores.
#!/bin/bash
BATCH_SIZE=500
SLEEP_TIME=5

while wp wc hpos sync status --user=admin | grep -q "pending"; do
  wp wc hpos sync start --batch=$BATCH_SIZE --user=admin
  sleep $SLEEP_TIME
done

echo "Sync complete"
wp wc hpos verify --user=admin
```

## Programmatic Access

```php
<?php
// Check HPOS status in code.
use Automattic\WooCommerce\Utilities\OrderUtil;

if ( OrderUtil::custom_orders_table_usage_is_enabled() ) {
    // HPOS is active.
}

// Check authoritative source.
$source = OrderUtil::get_table_for_orders();
```

## Troubleshooting

| Issue | Command | Resolution |
|-------|---------|------------|
| Sync stuck | `wp wc hpos sync status` | Run `wp wc hpos sync resume` |
| Data mismatch | `wp wc hpos verify` | Run with `--fix` flag |
| Plugin incompatible | `wp wc hpos compatibility` | Update plugin or contact author |
| Slow migration | Adjust batch size | Use `--batch=100` for slower systems |

## Key Gotchas

1. **Backup first** - Always backup before HPOS changes
2. **Plugin compatibility** - Check all extensions before enabling
3. **Sync overhead** - Keeping sync enabled doubles write operations
4. **Memory limits** - Large migrations need increased PHP memory
5. **Verify after migration** - Always run verify command after sync
6. **Action Scheduler** - HPOS uses Action Scheduler for background processing
