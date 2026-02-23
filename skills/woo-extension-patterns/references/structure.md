# WooCommerce Extension Structure

## Standard Directory Layout

```
my-extension/
├── my-extension.php          # Main plugin file with headers
├── includes/                 # Core PHP classes
│   ├── class-my-extension.php
│   └── ...
├── src/                      # PSR-4 namespaced classes (optional)
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── templates/                # Template overrides
├── languages/                # Translation files
├── tests/                    # PHPUnit tests
├── uninstall.php            # Cleanup on uninstall
├── readme.txt               # WordPress.org readme
└── composer.json            # Dependencies + autoloading
```

## Main Plugin File Headers

```php
<?php
/**
 * Plugin Name: My WooCommerce Extension
 * Plugin URI: https://example.com/my-extension
 * Description: Short description of the extension.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://example.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: my-extension
 * Domain Path: /languages
 * Requires at least: 6.7
 * Requires PHP: 8.0
 * WC requires at least: 9.0
 * WC tested up to: 10.4
 *
 * @package MyExtension
 */
```

## Bootstrap Pattern

```php
<?php
defined( 'ABSPATH' ) || exit;

// Define constants.
define( 'MY_EXTENSION_VERSION', '1.0.0' );
define( 'MY_EXTENSION_FILE', __FILE__ );
define( 'MY_EXTENSION_PATH', plugin_dir_path( __FILE__ ) );
define( 'MY_EXTENSION_URL', plugin_dir_url( __FILE__ ) );

// Autoloader (if using Composer).
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

/**
 * Initialize the extension after WooCommerce loads.
 */
function my_extension_init() {
    // Verify WooCommerce is active.
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', 'my_extension_wc_missing_notice' );
        return;
    }

    // Verify minimum WC version.
    if ( version_compare( WC_VERSION, '9.0', '<' ) ) {
        add_action( 'admin_notices', 'my_extension_wc_version_notice' );
        return;
    }

    // Load the main class.
    require_once MY_EXTENSION_PATH . 'includes/class-my-extension.php';
    My_Extension::instance();
}
add_action( 'plugins_loaded', 'my_extension_init' );

/**
 * WooCommerce missing notice.
 */
function my_extension_wc_missing_notice() {
    ?>
    <div class="error">
        <p><?php esc_html_e( 'My Extension requires WooCommerce to be installed and active.', 'my-extension' ); ?></p>
    </div>
    <?php
}
```

## Singleton Pattern for Main Class

```php
<?php
namespace MyExtension;

defined( 'ABSPATH' ) || exit;

final class My_Extension {
    private static ?self $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
    }

    private function init_hooks(): void {
        add_action( 'init', [ $this, 'load_textdomain' ] );
        add_action( 'woocommerce_init', [ $this, 'init' ] );

        if ( is_admin() ) {
            add_action( 'admin_init', [ $this, 'admin_init' ] );
        }
    }

    public function load_textdomain(): void {
        load_plugin_textdomain(
            'my-extension',
            false,
            dirname( plugin_basename( MY_EXTENSION_FILE ) ) . '/languages'
        );
    }

    public function init(): void {
        // Initialize extension functionality.
    }

    public function admin_init(): void {
        // Initialize admin-specific functionality.
    }
}
```

## PSR-4 Autoloading with Composer

```json
{
    "name": "vendor/my-extension",
    "autoload": {
        "psr-4": {
            "MyExtension\\": "src/"
        }
    },
    "require": {
        "php": ">=8.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^10.0",
        "yoast/phpunit-polyfills": "^2.0"
    }
}
```

## Key Gotchas

1. **Always check WooCommerce exists** before initializing
2. **Use `plugins_loaded` hook** - WooCommerce loads on this hook
3. **Define `ABSPATH` check** at top of every PHP file
4. **Use constants for paths** - avoids repeated function calls
5. **Prefix everything** - functions, classes, hooks to avoid conflicts
