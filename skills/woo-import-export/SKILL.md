---
name: woo-import-export
description: WooCommerce data import/export using built-in CSV importer/exporter, bulk operations via CLI, and data mapping and transformation patterns.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-import-export

## When to use

Use this skill when:
- Importing products from CSV files
- Exporting products, orders, or customers to CSV
- Bulk updating product data via import
- Migrating data between WooCommerce stores
- Synchronizing inventory with external systems
- Creating data transformation scripts
- Performing bulk price updates
- Managing large catalog operations

## Inputs required

- Access to WordPress installation with WooCommerce
- WP-CLI access for command-line operations
- CSV files for import (properly formatted)
- Admin access for UI-based import/export
- Understanding of data structure and field mappings

## Procedure

### Step 1: Export Products via CLI

```bash
# Export all products to CSV
wp wc product list --format=csv --user=admin > products.csv

# Export with specific fields
wp wc product list --fields=id,name,sku,regular_price,stock_quantity --format=csv --user=admin > products-basic.csv

# Export by category
wp wc product list --category=clothing --format=csv --user=admin > clothing-products.csv

# Export by product type
wp wc product list --type=variable --format=csv --user=admin > variable-products.csv

# Export with all meta
wp wc product list --format=json --user=admin | jq -r '.[] | [.id, .name, .sku, .regular_price, .stock_quantity] | @csv' > products-custom.csv
```

### Step 2: Export Orders via CLI

```bash
# Export all orders
wp wc shop_order list --format=csv --user=admin > orders.csv

# Export orders by status
wp wc shop_order list --status=completed --format=csv --user=admin > completed-orders.csv

# Export orders by date range
wp wc shop_order list --after=2024-01-01 --before=2024-12-31 --format=csv --user=admin > orders-2024.csv

# Export with specific fields
wp wc shop_order list --fields=id,number,status,total,customer_id,date_created --format=csv --user=admin > orders-summary.csv
```

### Step 3: Export Customers via CLI

```bash
# Export all customers
wp wc customer list --format=csv --user=admin > customers.csv

# Export with specific fields
wp wc customer list --fields=id,email,first_name,last_name,username --format=csv --user=admin > customers-basic.csv

# Export customers by role
wp wc customer list --role=customer --format=csv --user=admin > customers-only.csv
```

### Step 4: Import Products via CLI

```bash
# Import from CSV using built-in importer
wp wc product_import /path/to/products.csv --user=admin

# Import with update mode (match by SKU)
wp wc product_import /path/to/products.csv --update-existing --user=admin

# Import with specific mapping
wp wc product_import /path/to/products.csv --mapping='{"sku":"SKU","name":"Product Name","regular_price":"Price"}' --user=admin

# Dry run to validate
wp wc product_import /path/to/products.csv --dry-run --user=admin
```

### Step 5: CSV Format for Product Import

**Basic product CSV structure:**
```csv
type,sku,name,regular_price,stock_quantity,categories,images
simple,PROD001,Product Name,29.99,100,"Category1, Category2",https://example.com/image.jpg
simple,PROD002,Another Product,19.99,50,Category1,https://example.com/image2.jpg
```

**Variable product CSV structure:**
```csv
type,sku,name,regular_price,attribute:color,attribute:size
variable,VAR001,T-Shirt,,"red|blue|green","S|M|L|XL"
variation,VAR001-RED-S,T-Shirt - Red S,24.99,red,S
variation,VAR001-RED-M,T-Shirt - Red M,24.99,red,M
```

**Required columns:**
- `type` - simple, variable, variation, grouped, external
- `sku` - Unique identifier
- `name` - Product name

**Common optional columns:**
- `regular_price`, `sale_price`
- `stock_quantity`, `stock_status`
- `categories` (comma-separated)
- `images` (comma-separated URLs)
- `short_description`, `description`
- `weight`, `length`, `width`, `height`

### Step 6: Bulk Update Products

```bash
# Update prices via import
cat > price-updates.csv << 'EOF'
sku,regular_price
PROD001,34.99
PROD002,24.99
EOF

wp wc product_import price-updates.csv --update-existing --user=admin

# Bulk update stock
cat > stock-updates.csv << 'EOF'
sku,stock_quantity,manage_stock
PROD001,150,yes
PROD002,0,yes
EOF

wp wc product_import stock-updates.csv --update-existing --user=admin
```

### Step 7: Data Transformation Scripts

```bash
#!/bin/bash
# transform-products.sh - Transform external data to WC format

# Convert external CSV to WC format
cat external-products.csv | while IFS=',' read -r ext_sku ext_name ext_price ext_qty; do
    echo "simple,$ext_sku,\"$ext_name\",$ext_price,$ext_qty"
done > wc-products.csv

# Add header
sed -i '1i type,sku,name,regular_price,stock_quantity' wc-products.csv
```

```php
<?php
// PHP transformation script
$input = array_map('str_getcsv', file('external-products.csv'));
$header = array_shift($input);

$output = fopen('wc-products.csv', 'w');
fputcsv($output, ['type', 'sku', 'name', 'regular_price', 'stock_quantity']);

foreach ($input as $row) {
    $data = array_combine($header, $row);
    fputcsv($output, [
        'simple',
        $data['product_code'],
        $data['product_name'],
        $data['price'] * 1.2, // Apply markup
        $data['inventory'],
    ]);
}

fclose($output);
```

### Step 8: Handle Large Imports

```bash
# Split large CSV into chunks
split -l 1000 products.csv products_chunk_

# Import each chunk
for chunk in products_chunk_*; do
    echo "Importing $chunk..."
    wp wc product_import "$chunk" --update-existing --user=admin
    sleep 5 # Allow server recovery
done

# Alternative: Use background processing
wp wc product_import large-products.csv --update-existing --user=admin &
```

```php
<?php
// Use Action Scheduler for large imports
add_action( 'my_import_chunk', function( $chunk_file ) {
    // Process chunk
    $importer = new WC_Product_CSV_Importer( $chunk_file, array(
        'update_existing' => true,
    ) );
    $importer->import();
} );

// Schedule chunks
foreach ( glob( 'chunks/products_*.csv' ) as $chunk ) {
    as_enqueue_async_action( 'my_import_chunk', array( $chunk ), 'my-import' );
}
```

## Verification

### Checklist

- [ ] Export files contain expected data
- [ ] CSV format matches WC requirements
- [ ] Import completes without errors
- [ ] Product data displays correctly in admin
- [ ] Stock levels updated correctly
- [ ] Images imported/linked properly
- [ ] Categories assigned correctly
- [ ] Variable products have proper variations

### Test Commands

```bash
# Verify export file
head -5 products.csv
wc -l products.csv

# Count products before/after import
wp wc product list --format=count --user=admin

# Verify specific product after import
wp wc product get <product_id> --user=admin

# Check for import errors in logs
grep -i "import" wp-content/uploads/wc-logs/*.log | tail -20
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Import hangs | Memory limit | Increase `memory_limit`, use chunked imports |
| "Invalid column" error | Mismatched headers | Check CSV column names match WC format |
| Products not updating | SKU mismatch | Verify `--update-existing` flag and SKU values |
| Images not importing | Invalid URLs | Ensure images are accessible, use HTTPS |
| Categories not created | Missing category | Pre-create categories or use category IDs |
| Encoding issues | Wrong file encoding | Convert to UTF-8: `iconv -f ISO-8859-1 -t UTF-8` |

### Quick Checks

```bash
# Validate CSV structure
head -1 products.csv | tr ',' '\n' | nl

# Check for encoding issues
file products.csv

# Test single row import
head -2 products.csv > test-import.csv
wp wc product_import test-import.csv --dry-run --user=admin

# Check PHP memory limit
wp eval "echo ini_get('memory_limit');"
```

## Escalation

- WooCommerce import docs: https://woocommerce.com/document/product-csv-importer-exporter/
- Sample data location: `/plugins/woocommerce/sample-data/`
- WC CLI commands: https://developer.woocommerce.com/docs/wc-cli/wc-cli-commands/
- WC CLI examples: https://developer.woocommerce.com/docs/wc-cli/wc-cli-examples/
- Adding analytics columns: https://developer.woocommerce.com/docs/features/analytics/adding-columns-to-analytics-reports-and-csv-downloads/
