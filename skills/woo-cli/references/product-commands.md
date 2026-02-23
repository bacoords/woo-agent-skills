# Product CLI Commands

## List Products

```bash
# List all products.
wp wc product list --user=admin

# With filters.
wp wc product list --status=publish --user=admin
wp wc product list --type=variable --user=admin
wp wc product list --category=clothing --user=admin
wp wc product list --sku=SKU123 --user=admin

# Output formats.
wp wc product list --format=json --user=admin
wp wc product list --format=csv --user=admin
wp wc product list --format=ids --user=admin

# Specific fields.
wp wc product list --fields=id,name,price,stock_quantity --user=admin
```

## Get Single Product

```bash
# Get product details.
wp wc product get 99 --user=admin

# As JSON.
wp wc product get 99 --format=json --user=admin
```

## Create Product

```bash
# Simple product.
wp wc product create \
  --name="My Product" \
  --type=simple \
  --regular_price=29.99 \
  --sku=PROD001 \
  --user=admin

# With description.
wp wc product create \
  --name="My Product" \
  --description="Full description here" \
  --short_description="Brief description" \
  --regular_price=29.99 \
  --user=admin

# With stock management.
wp wc product create \
  --name="Tracked Product" \
  --regular_price=19.99 \
  --manage_stock=true \
  --stock_quantity=100 \
  --user=admin

# With categories (by ID).
wp wc product create \
  --name="Categorized Product" \
  --categories='[{"id":15},{"id":16}]' \
  --user=admin
```

## Update Product

```bash
# Update price.
wp wc product update 99 --regular_price=24.99 --user=admin

# Update stock.
wp wc product update 99 --stock_quantity=50 --user=admin

# Set sale price.
wp wc product update 99 \
  --sale_price=19.99 \
  --date_on_sale_from=2024-01-01 \
  --date_on_sale_to=2024-01-31 \
  --user=admin

# Change status.
wp wc product update 99 --status=draft --user=admin
```

## Delete Product

```bash
# Move to trash.
wp wc product delete 99 --user=admin

# Permanently delete.
wp wc product delete 99 --force --user=admin
```

## Variable Products

```bash
# Create variable product.
wp wc product create \
  --name="Variable Product" \
  --type=variable \
  --attributes='[{"name":"Size","options":["Small","Medium","Large"],"visible":true,"variation":true}]' \
  --user=admin

# List variations.
wp wc product_variation list 99 --user=admin

# Create variation.
wp wc product_variation create 99 \
  --regular_price=29.99 \
  --attributes='[{"name":"Size","option":"Medium"}]' \
  --user=admin

# Update variation.
wp wc product_variation update 99 150 \
  --regular_price=34.99 \
  --stock_quantity=25 \
  --user=admin
```

## Product Categories

```bash
# List categories.
wp wc product_cat list --user=admin

# Create category.
wp wc product_cat create --name="New Category" --user=admin

# With parent.
wp wc product_cat create --name="Subcategory" --parent=15 --user=admin
```

## Product Attributes

```bash
# List attributes.
wp wc product_attribute list --user=admin

# Create attribute.
wp wc product_attribute create --name="Color" --slug=color --user=admin

# List attribute terms.
wp wc product_attribute_term list 1 --user=admin

# Create term.
wp wc product_attribute_term create 1 --name="Red" --user=admin
```

## Bulk Operations

```bash
# Update all prices by percentage.
for id in $(wp wc product list --format=ids --user=admin); do
  current=$(wp wc product get $id --field=regular_price --user=admin)
  new=$(echo "$current * 1.1" | bc)
  wp wc product update $id --regular_price=$new --user=admin
done

# Export products.
wp wc product list --format=csv --user=admin > products.csv

# Bulk stock update.
wp wc product update 99 --stock_quantity=100 --user=admin
wp wc product update 100 --stock_quantity=50 --user=admin
```

## Common Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `--status` | Product status | `--status=publish` |
| `--type` | Product type | `--type=variable` |
| `--category` | Category slug | `--category=clothing` |
| `--sku` | Product SKU | `--sku=ABC123` |
| `--featured` | Featured only | `--featured=true` |
| `--on_sale` | On sale only | `--on_sale=true` |

## Key Gotchas

1. **JSON for complex data** - Attributes, categories need JSON format
2. **Variation parent** - Variations need parent product ID
3. **Stock management** - Must set `manage_stock=true` first
4. **Categories by ID** - Use ID not slug in JSON
5. **Images via URL** - Image upload requires URL or existing media ID
