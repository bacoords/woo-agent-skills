# Tool Commands

## System Status

```bash
# Get WooCommerce system status.
wp wc system_status get --user=admin

# Get specific info.
wp wc system_status_tool list --user=admin
```

## Regenerate Tools

```bash
# Regenerate product lookup tables.
wp wc tool run regenerate_product_lookup_tables --user=admin

# Regenerate order stats.
wp wc tool run regenerate_order_stats --user=admin

# Clear transients.
wp wc tool run clear_transients --user=admin

# Clear sessions.
wp wc tool run clear_sessions --user=admin

# Clear template cache.
wp wc tool run clear_template_cache --user=admin
```

## Database Tools

```bash
# Verify database tables.
wp wc tool run verify_base_tables --user=admin

# Update database.
wp wc tool run db_update_routine --user=admin

# Recount terms.
wp wc tool run recount_terms --user=admin
```

## Customer Tools

```bash
# List customers.
wp wc customer list --user=admin

# Get customer.
wp wc customer get 123 --user=admin

# Create customer.
wp wc customer create \
  --email=customer@example.com \
  --first_name=John \
  --last_name=Doe \
  --user=admin

# Update customer.
wp wc customer update 123 --first_name=Jane --user=admin

# Delete customer.
wp wc customer delete 123 --user=admin
```

## Coupon Management

```bash
# List coupons.
wp wc shop_coupon list --user=admin

# Create coupon.
wp wc shop_coupon create \
  --code=SAVE20 \
  --discount_type=percent \
  --amount=20 \
  --user=admin

# With restrictions.
wp wc shop_coupon create \
  --code=FREESHIP \
  --discount_type=percent \
  --amount=0 \
  --free_shipping=true \
  --minimum_amount=50 \
  --user=admin

# Update coupon.
wp wc shop_coupon update 45 --usage_limit=100 --user=admin
```

## Tax Settings

```bash
# List tax rates.
wp wc tax list --user=admin

# Create tax rate.
wp wc tax create \
  --country=US \
  --state=CA \
  --rate=7.25 \
  --name="CA Sales Tax" \
  --user=admin
```

## Shipping

```bash
# List shipping zones.
wp wc shipping_zone list --user=admin

# Get zone.
wp wc shipping_zone get 1 --user=admin

# List methods in zone.
wp wc shipping_zone_method list 1 --user=admin
```

## Settings

```bash
# List setting groups.
wp wc setting list --user=admin

# Get specific setting.
wp wc setting get general woocommerce_store_address --user=admin

# Update setting.
wp wc setting update general woocommerce_currency --value=EUR --user=admin
```

## Webhooks

```bash
# List webhooks.
wp wc webhook list --user=admin

# Create webhook.
wp wc webhook create \
  --name="Order Created" \
  --topic=order.created \
  --delivery_url=https://example.com/webhook \
  --user=admin

# Test webhook.
wp wc webhook update 1 --status=active --user=admin
```

## Data Export

```bash
# Export orders.
wp wc shop_order list --format=csv --user=admin > orders.csv

# Export products.
wp wc product list --format=csv --user=admin > products.csv

# Export customers.
wp wc customer list --format=csv --user=admin > customers.csv
```

## Scheduled Actions

```bash
# List pending actions.
wp action-scheduler list --status=pending --group=woocommerce --format=table

# Run pending actions.
wp action-scheduler run --hooks=woocommerce_cleanup_sessions

# Cancel action.
wp action-scheduler cancel 12345
```

## Key Gotchas

1. **User required** - Tool commands need `--user=admin`
2. **Regeneration time** - Large stores may need `--allow-root` and increased memory
3. **Settings hierarchy** - Settings organized in groups
4. **Webhook verification** - New webhooks start as disabled
5. **Action Scheduler** - Separate from WP cron, use `action-scheduler` commands
