# Order CLI Commands

## List Orders

```bash
# List all orders.
wp wc shop_order list --user=admin

# With filters.
wp wc shop_order list --status=processing --user=admin
wp wc shop_order list --customer=123 --user=admin
wp wc shop_order list --after=2024-01-01 --before=2024-12-31 --user=admin

# Output formats.
wp wc shop_order list --format=json --user=admin
wp wc shop_order list --format=csv --user=admin
wp wc shop_order list --format=table --user=admin
wp wc shop_order list --format=ids --user=admin
```

## Get Single Order

```bash
# Get order details.
wp wc shop_order get 123 --user=admin

# Specific fields.
wp wc shop_order get 123 --fields=id,status,total --user=admin
```

## Create Order

```bash
# Create order.
wp wc shop_order create --status=pending --customer_id=1 --user=admin

# With line items (JSON).
wp wc shop_order create \
  --status=pending \
  --customer_id=1 \
  --line_items='[{"product_id":99,"quantity":2}]' \
  --user=admin

# With billing address.
wp wc shop_order create \
  --billing='{"first_name":"John","last_name":"Doe","email":"john@example.com"}' \
  --user=admin
```

## Update Order

```bash
# Update status.
wp wc shop_order update 123 --status=completed --user=admin

# Update multiple fields.
wp wc shop_order update 123 \
  --status=processing \
  --customer_note="Updated note" \
  --user=admin
```

## Delete Order

```bash
# Move to trash.
wp wc shop_order delete 123 --user=admin

# Permanently delete.
wp wc shop_order delete 123 --force --user=admin

# Bulk delete.
wp wc shop_order delete $(wp wc shop_order list --status=trash --format=ids --user=admin) --force --user=admin
```

## Order Notes

```bash
# List notes.
wp wc shop_order_note list 123 --user=admin

# Add note.
wp wc shop_order_note create 123 --note="Order shipped" --user=admin

# Customer-facing note.
wp wc shop_order_note create 123 --note="Your order has shipped" --customer_note=true --user=admin
```

## Order Refunds

```bash
# List refunds.
wp wc shop_order_refund list 123 --user=admin

# Create refund.
wp wc shop_order_refund create 123 --amount=25.00 --reason="Damaged item" --user=admin

# Full refund.
wp wc shop_order_refund create 123 --amount=$(wp wc shop_order get 123 --field=total --user=admin) --user=admin
```

## Bulk Operations

```bash
# Mark multiple orders complete.
for id in $(wp wc shop_order list --status=processing --format=ids --user=admin); do
  wp wc shop_order update $id --status=completed --user=admin
done

# Export orders to CSV.
wp wc shop_order list --format=csv --user=admin > orders.csv

# Count by status.
wp wc shop_order list --status=pending --format=count --user=admin
```

## HPOS-Aware Commands

When HPOS is enabled, the same commands work but query the orders table:

```bash
# Check HPOS status first.
wp wc hpos status --user=admin

# Orders work the same regardless of storage.
wp wc shop_order list --user=admin
```

## Common Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `--status` | Order status | `--status=processing` |
| `--customer` | Customer ID | `--customer=123` |
| `--after` | Created after date | `--after=2024-01-01` |
| `--before` | Created before date | `--before=2024-12-31` |
| `--per_page` | Results per page | `--per_page=100` |
| `--page` | Page number | `--page=2` |

## Key Gotchas

1. **`--user` required** - Most commands require `--user=admin` or valid user
2. **JSON for complex data** - Line items, addresses use JSON format
3. **HPOS transparent** - Same commands work with HPOS enabled
4. **Rate limiting** - Bulk operations may need delays
5. **ID vs order number** - Commands use internal ID, not order number
