# Orders and HPOS

Treat Woo CRUD as the persistence contract regardless of the active order datastore.

## Rules

- Load orders with `wc_get_order()` and query them with `wc_get_orders()` / `WC_Order_Query`.
- Read and write order properties through getters and setters.
- Read and write extension metadata through the order object, then call `save()` at the owning transaction boundary.
- Avoid queries or writes that assume orders live in `wp_posts` or `wp_postmeta`.
- Use `OrderUtil::is_order()` or documented Woo helpers where code must identify order screens/objects across storage modes.
- Declare HPOS compatibility only after auditing data access, synchronization, admin screens, reports, and background jobs.

## Lifecycle

Choose an event based on the business transition, not its convenient name. Order creation, payment completion, and status changes are distinct events and may be retried. Make external side effects idempotent and store a durable idempotency marker when needed.

Use Action Scheduler for durable asynchronous work already owned by WooCommerce. Log identifiers needed for support without logging payment data, addresses, or unnecessary personal data.

## Verification

- Run the behavior with HPOS enabled.
- If the extension claims compatibility with synchronization/legacy modes, test those modes explicitly.
- Confirm admin order screens, refunds, status transitions, and background retries relevant to the change.
- Search changed code for direct order-table/post-table access before declaring compatibility.

## Current sources

- `https://developer.woocommerce.com/docs/features/high-performance-order-storage.md`
- `https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book.md`
