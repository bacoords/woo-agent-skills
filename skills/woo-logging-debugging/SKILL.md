---
name: woo-logging-debugging
description: WooCommerce debugging tools including WC Logger usage, log reading, Query Monitor for WC-specific debugging, debug mode configuration, and status report interpretation.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-logging-debugging

## When to use

Use this skill when:
- Debugging WooCommerce issues in development or production
- Reading and analyzing WooCommerce log files
- Configuring WooCommerce debug mode
- Using Query Monitor for WC-specific performance analysis
- Interpreting WooCommerce status reports
- Adding logging to custom WooCommerce extensions
- Diagnosing payment, shipping, or order processing issues

## Inputs required

- Access to WordPress installation with WooCommerce
- Admin access for status report and debug settings
- Filesystem access for log file reading
- Query Monitor plugin (optional, for detailed debugging)

## Procedure

### Step 1: Enable WooCommerce Debug Mode

```php
<?php
// In wp-config.php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );

// WooCommerce-specific logging
define( 'WC_LOG_HANDLER', 'WC_Log_Handler_File' );
```

Via WP-CLI:

```bash
# Enable debug logging
wp config set WP_DEBUG true --raw
wp config set WP_DEBUG_LOG true --raw
```

### Step 2: Access WooCommerce Logs

**Log file location:**
```bash
# Default WooCommerce log directory
ls -la wp-content/uploads/wc-logs/

# View recent log files
ls -lt wp-content/uploads/wc-logs/ | head -20

# Read specific log file
cat wp-content/uploads/wc-logs/fatal-errors-*.log
```

**Log sources commonly found:**
- `fatal-errors-*.log` - PHP fatal errors
- `woocommerce-*.log` - General WooCommerce logs
- `payment-gateway-*.log` - Payment processing logs
- `shipping-*.log` - Shipping calculation logs

### Step 3: Use WC Logger in Code

```php
<?php
// Get the logger instance
$logger = wc_get_logger();

// Log with different levels
$logger->debug( 'Debug message', array( 'source' => 'my-extension' ) );
$logger->info( 'Info message', array( 'source' => 'my-extension' ) );
$logger->notice( 'Notice message', array( 'source' => 'my-extension' ) );
$logger->warning( 'Warning message', array( 'source' => 'my-extension' ) );
$logger->error( 'Error message', array( 'source' => 'my-extension' ) );
$logger->critical( 'Critical message', array( 'source' => 'my-extension' ) );

// Log with context data
$logger->info( 'Order processed', array(
    'source'   => 'my-extension',
    'order_id' => $order_id,
    'total'    => $order->get_total(),
) );
```

### Step 4: Read Status Report

**Via WP-CLI:**
```bash
# Get system status
wp wc tool run get_system_status_report --user=admin

# Check specific settings
wp option get woocommerce_version
wp option get woocommerce_db_version
```

**Key status report sections:**
- WordPress Environment
- Server Environment
- WooCommerce Database
- Active Plugins
- Theme Info
- Templates (overrides)
- Action Scheduler Status

### Step 5: Query Monitor for WooCommerce

Install and use Query Monitor for detailed debugging:

```bash
# Install Query Monitor
wp plugin install query-monitor --activate
```

**WooCommerce-specific Query Monitor panels:**
- Database queries from WC classes
- REST API requests
- Action Scheduler queries
- Template loading times
- Hook execution order

### Step 6: Debug Payment Issues

```php
<?php
// Enable gateway-specific logging
add_filter( 'wc_stripe_log_message', '__return_true' );

// Check payment gateway logs
$logger = wc_get_logger();
$context = array( 'source' => 'woocommerce-gateway-stripe' );
$logger->info( 'Payment attempt', $context );
```

**Common log locations for payments:**
```bash
# Stripe logs
cat wp-content/uploads/wc-logs/woocommerce-gateway-stripe-*.log

# PayPal logs
cat wp-content/uploads/wc-logs/wc_paypal-*.log
```

### Step 7: Debug Shipping Issues

```bash
# Check shipping zone configuration
wp wc shipping_zone list --user=admin

# Check shipping method settings
wp wc shipping_method list --user=admin
```

```php
<?php
// Log shipping calculations
add_action( 'woocommerce_after_shipping_rate', function( $method ) {
    $logger = wc_get_logger();
    $logger->debug( 'Shipping rate: ' . $method->get_label() . ' - ' . $method->get_cost(), array(
        'source' => 'shipping-debug',
    ) );
} );
```

### Step 8: Clear Logs and Caches

```bash
# Clear WooCommerce transients
wp wc tool run clear_transients --user=admin

# Delete old log files (older than 30 days)
find wp-content/uploads/wc-logs/ -name "*.log" -mtime +30 -delete

# Clear object cache
wp cache flush
```

## Verification

### Checklist

- [ ] Debug mode enabled in wp-config.php
- [ ] WooCommerce logs directory exists and is writable
- [ ] Log files being generated with expected content
- [ ] Status report accessible and showing correct info
- [ ] Query Monitor showing WC-specific data (if installed)
- [ ] Payment gateway logging enabled for debugging

### Test Commands

```bash
# Verify log directory exists and is writable
ls -la wp-content/uploads/wc-logs/

# Check recent log entries
tail -50 wp-content/uploads/wc-logs/fatal-errors-*.log

# Verify WooCommerce can write logs
wp eval 'wc_get_logger()->info("Test log entry", array("source" => "test"));'

# Check log was written
grep "Test log entry" wp-content/uploads/wc-logs/test-*.log
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No log files created | Directory not writable | `chmod 755 wp-content/uploads/wc-logs/` |
| Logs not appearing | WP_DEBUG disabled | Enable `WP_DEBUG` and `WP_DEBUG_LOG` |
| Status report empty | Insufficient permissions | Run with admin user |
| Query Monitor not showing WC | Plugin conflicts | Deactivate other debug plugins |
| Logs too large | No log rotation | Implement log cleanup cron |
| Missing payment logs | Gateway logging disabled | Enable gateway debug mode |

### Quick Checks

```bash
# Check if logs directory exists
test -d wp-content/uploads/wc-logs && echo "Exists" || echo "Missing"

# Check directory permissions
stat -f "%A %N" wp-content/uploads/wc-logs/

# Check WP_DEBUG status
wp config get WP_DEBUG

# List all WC log files
find wp-content/uploads/wc-logs/ -name "*.log" | wc -l
```

## Escalation

- Logging in WooCommerce: https://developer.woocommerce.com/docs/best-practices/data-management/logging.md
- Extension best practices: https://developer.woocommerce.com/docs/extensions/best-practices-extensions/extension-development-best-practices.md
- Query Monitor: https://querymonitor.com/
- WooCommerce status report: WooCommerce > Status > System Status
- Error handling updates: https://developer.woocommerce.com/2024/09/23/recent-updates-to-error-handling-and-optional-remote-error-logging/
