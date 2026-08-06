<?php
/**
 * Plugin Name: Fixture Woo Extension
 * Requires at least: 6.9
 * Requires PHP: 8.0
 * WC requires at least: 10.0
 * WC tested up to: 10.9
 */

add_action( 'before_woocommerce_init', static function () {
    Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
} );
