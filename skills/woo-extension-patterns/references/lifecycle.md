# WooCommerce Extension Lifecycle

## Activation Hook

Use for one-time setup tasks like creating database tables or setting default options.

```php
<?php
register_activation_hook( MY_EXTENSION_FILE, 'my_extension_activate' );

function my_extension_activate(): void {
    // Check WooCommerce is active.
    if ( ! class_exists( 'WooCommerce' ) ) {
        deactivate_plugins( plugin_basename( MY_EXTENSION_FILE ) );
        wp_die(
            esc_html__( 'This plugin requires WooCommerce.', 'my-extension' ),
            'Plugin Activation Error',
            [ 'back_link' => true ]
        );
    }

    // Create custom database tables.
    my_extension_create_tables();

    // Set default options.
    add_option( 'my_extension_version', MY_EXTENSION_VERSION );
    add_option( 'my_extension_settings', my_extension_default_settings() );

    // Clear WC transients.
    WC_Cache_Helper::invalidate_cache_group( 'my_extension' );

    // Flush rewrite rules if extension adds endpoints.
    flush_rewrite_rules();
}
```

## Deactivation Hook

Use for temporary cleanup. Don't delete user data here.

```php
<?php
register_deactivation_hook( MY_EXTENSION_FILE, 'my_extension_deactivate' );

function my_extension_deactivate(): void {
    // Clear scheduled events.
    wp_clear_scheduled_hook( 'my_extension_daily_event' );

    // Flush rewrite rules.
    flush_rewrite_rules();

    // Clear transients.
    delete_transient( 'my_extension_cache' );
}
```

## Uninstall Hook

Create `uninstall.php` in plugin root for complete cleanup.

```php
<?php
// uninstall.php

// Exit if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Remove options.
delete_option( 'my_extension_version' );
delete_option( 'my_extension_settings' );

// Remove user meta.
delete_metadata( 'user', 0, 'my_extension_user_data', '', true );

// Remove custom database tables.
global $wpdb;
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}my_extension_data" );

// Clear transients.
$wpdb->query(
    "DELETE FROM {$wpdb->options}
     WHERE option_name LIKE '_transient_my_extension_%'
     OR option_name LIKE '_transient_timeout_my_extension_%'"
);
```

## WooCommerce Dependency Check

Check before any WooCommerce code runs.

```php
<?php
/**
 * Check if WooCommerce is active and meets minimum version.
 */
function my_extension_check_requirements(): bool {
    // WooCommerce active check.
    if ( ! class_exists( 'WooCommerce' ) ) {
        return false;
    }

    // Minimum version check.
    if ( version_compare( WC_VERSION, '9.0', '<' ) ) {
        return false;
    }

    return true;
}

/**
 * Initialize only when requirements met.
 */
add_action( 'plugins_loaded', function() {
    if ( ! my_extension_check_requirements() ) {
        add_action( 'admin_notices', 'my_extension_requirements_notice' );
        return;
    }

    // Safe to initialize.
    my_extension_init();
}, 20 ); // Priority 20 ensures WC loads first.
```

## Version Upgrade Handling

Handle database/option migrations between versions.

```php
<?php
function my_extension_check_version(): void {
    $current_version = get_option( 'my_extension_version', '0.0.0' );

    if ( version_compare( $current_version, MY_EXTENSION_VERSION, '<' ) ) {
        my_extension_upgrade( $current_version );
        update_option( 'my_extension_version', MY_EXTENSION_VERSION );
    }
}
add_action( 'plugins_loaded', 'my_extension_check_version', 5 );

function my_extension_upgrade( string $from_version ): void {
    // Migrate from 1.0 to 1.1
    if ( version_compare( $from_version, '1.1.0', '<' ) ) {
        // Run migration.
        my_extension_migrate_1_1();
    }

    // Migrate from 1.1 to 1.2
    if ( version_compare( $from_version, '1.2.0', '<' ) ) {
        my_extension_migrate_1_2();
    }
}
```

## Scheduled Events

Register cron events properly.

```php
<?php
// Register on activation.
register_activation_hook( MY_EXTENSION_FILE, function() {
    if ( ! wp_next_scheduled( 'my_extension_daily_cleanup' ) ) {
        wp_schedule_event( time(), 'daily', 'my_extension_daily_cleanup' );
    }
});

// Handle the event.
add_action( 'my_extension_daily_cleanup', function() {
    // Cleanup old data.
    my_extension_cleanup_expired_data();
});

// Clear on deactivation.
register_deactivation_hook( MY_EXTENSION_FILE, function() {
    wp_clear_scheduled_hook( 'my_extension_daily_cleanup' );
});
```

## Key Gotchas

1. **Never delete user data on deactivation** - only on uninstall
2. **Check WC exists before ANY WC code** - including constants like `WC_VERSION`
3. **Use priority 20+ on `plugins_loaded`** - ensures WC loads first (default priority 10)
4. **Flush rewrite rules sparingly** - expensive operation, only on activation/deactivation
5. **Store version in options** - enables upgrade migrations
