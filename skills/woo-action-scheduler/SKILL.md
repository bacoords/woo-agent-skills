---
name: woo-action-scheduler
description: WooCommerce Action Scheduler management via CLI commands, viewing and managing queued actions, debugging failed jobs, and understanding scheduling patterns.
compatibility: WooCommerce 10.x+ (WP 6.7+, PHP 8.0+). Filesystem-based agent with bash + node.
---

# woo-action-scheduler

## When to use

Use this skill when:
- Managing background job queues in WooCommerce
- Debugging failed or stuck scheduled actions
- Viewing pending/running/completed actions
- Scheduling custom background tasks
- Troubleshooting WooCommerce subscriptions renewals
- Debugging webhook delivery issues
- Managing bulk import/export operations
- Optimizing Action Scheduler performance

## Inputs required

- Access to WordPress installation with WooCommerce
- WP-CLI access for command-line management
- Admin access for Action Scheduler UI
- Understanding of the action/job being debugged

## Procedure

### Step 1: Check Action Scheduler Status

**Via WP-CLI:**
```bash
# List pending actions
wp action-scheduler list --status=pending --per_page=20

# List failed actions
wp action-scheduler list --status=failed --per_page=20

# List running actions
wp action-scheduler list --status=in-progress

# Count actions by status
wp action-scheduler list --status=pending --format=count
wp action-scheduler list --status=failed --format=count
```

**Filter by hook:**
```bash
# List specific hook actions
wp action-scheduler list --hook=woocommerce_deliver_webhook_async

# List subscription-related actions
wp action-scheduler list --hook=woocommerce_scheduled_subscription_payment
```

### Step 2: Run Pending Actions

```bash
# Process pending actions (default batch)
wp action-scheduler run

# Process specific number of actions
wp action-scheduler run --batch-size=100

# Process actions for specific hook
wp action-scheduler run --hooks=woocommerce_deliver_webhook_async

# Force run with extended time limit
wp action-scheduler run --time-limit=300
```

### Step 3: Debug Failed Actions

```bash
# List failed actions with details
wp action-scheduler list --status=failed --fields=id,hook,args,last_attempt,claim_id --format=table

# Get specific action details
wp action-scheduler get <action_id>

# View action logs (if available)
wp action-scheduler list --status=failed --format=json | jq '.[0]'
```

**Common failure investigation:**
```bash
# Check PHP error logs during failure
tail -100 wp-content/debug.log | grep -i "action scheduler"

# Check WC logs for related errors
tail -100 wp-content/uploads/wc-logs/action-scheduler-*.log
```

### Step 4: Manage Action Queue

**Delete actions:**
```bash
# Delete specific failed action
wp action-scheduler delete <action_id>

# Delete all failed actions for a hook
wp action-scheduler list --status=failed --hook=my_custom_hook --format=ids | xargs -I {} wp action-scheduler delete {}

# Clean up old completed actions
wp action-scheduler clean --status=complete --older-than="1 week ago"
```

**Retry failed actions:**
```bash
# Retry a specific action
wp action-scheduler retry <action_id>

# Retry all failed actions for a hook
for id in $(wp action-scheduler list --status=failed --hook=my_hook --format=ids); do
    wp action-scheduler retry $id
done
```

### Step 5: Schedule Custom Actions

```php
<?php
// Schedule a one-time action
as_schedule_single_action(
    time() + 3600, // Run in 1 hour
    'my_custom_action',
    array( 'order_id' => 123 ),
    'my-extension'
);

// Schedule a recurring action
as_schedule_recurring_action(
    time(),
    DAY_IN_SECONDS, // Run daily
    'my_daily_action',
    array(),
    'my-extension'
);

// Schedule an async action (runs ASAP)
as_enqueue_async_action(
    'my_async_action',
    array( 'data' => 'value' ),
    'my-extension'
);

// Cancel scheduled action
as_unschedule_action( 'my_custom_action', array( 'order_id' => 123 ), 'my-extension' );

// Cancel all actions for a hook
as_unschedule_all_actions( 'my_custom_action' );
```

### Step 6: Handle Action in Code

```php
<?php
// Register the action handler
add_action( 'my_custom_action', 'handle_my_custom_action', 10, 1 );

function handle_my_custom_action( $order_id ) {
    $logger = wc_get_logger();

    try {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            throw new Exception( 'Order not found: ' . $order_id );
        }

        // Process the order...
        $logger->info( 'Action completed for order: ' . $order_id, array( 'source' => 'my-extension' ) );

    } catch ( Exception $e ) {
        $logger->error( 'Action failed: ' . $e->getMessage(), array( 'source' => 'my-extension' ) );
        throw $e; // Re-throw to mark action as failed
    }
}
```

### Step 7: Monitor Performance

```bash
# Check how long actions are taking
wp action-scheduler list --status=complete --fields=id,hook,duration --per_page=50

# Check for long-running actions
wp action-scheduler list --status=in-progress

# Check queue depth over time
watch -n 60 'wp action-scheduler list --status=pending --format=count'
```

**Database queries:**
```bash
# Check Action Scheduler tables size
wp db query "SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_name LIKE '%actionscheduler%';"

# Check pending action count
wp db query "SELECT status, COUNT(*) FROM wp_actionscheduler_actions GROUP BY status;"
```

### Step 8: Optimize Action Scheduler

```php
<?php
// Increase batch size (default 25)
add_filter( 'action_scheduler_queue_runner_batch_size', function() {
    return 100;
} );

// Increase concurrent batches (default 1)
add_filter( 'action_scheduler_queue_runner_concurrent_batches', function() {
    return 2;
} );

// Increase time limit (default 30 seconds)
add_filter( 'action_scheduler_queue_runner_time_limit', function() {
    return 60;
} );
```

## Verification

### Checklist

- [ ] Action Scheduler tables exist in database
- [ ] Pending actions processing correctly
- [ ] Failed actions logged with error details
- [ ] Custom actions registered and callable
- [ ] Cleanup running to prevent table bloat
- [ ] Performance within acceptable limits

### Test Commands

```bash
# Verify Action Scheduler is working
wp action-scheduler run --dry-run

# Check table status
wp db query "SHOW TABLE STATUS LIKE '%actionscheduler%';"

# Schedule a test action
wp eval "as_enqueue_async_action('test_action', array('test' => true), 'test');"

# Verify it was scheduled
wp action-scheduler list --hook=test_action

# Process it
wp action-scheduler run --hooks=test_action
```

## Failure modes / debugging

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Actions stuck in "pending" | Cron not running | Check `wp cron event list`, run `wp cron event run --due-now` |
| Actions stuck in "in-progress" | Long-running/crashed job | Delete stuck actions, check for infinite loops |
| Table bloat | Old actions not cleaned | Run `wp action-scheduler clean` |
| Actions failing repeatedly | Handler throwing exceptions | Check error logs, fix handler code |
| High memory usage | Large action arguments | Reduce data stored in args, use IDs instead |
| Queue not processing | Another job running | Check for existing AS processes |

### Quick Checks

```bash
# Check if AS cron is scheduled
wp cron event list | grep action_scheduler

# Check for stuck "in-progress" actions
wp action-scheduler list --status=in-progress --format=count

# Check queue health
wp action-scheduler list --status=failed --format=count
wp action-scheduler list --status=pending --format=count

# Force run the processor
wp action-scheduler run --force
```

## Escalation

- Action Scheduler docs: https://actionscheduler.org/
- Action Scheduler CLI: https://actionscheduler.org/wp-cli/
- Performance tuning: https://actionscheduler.org/perf/
- Admin screen: https://actionscheduler.org/admin/
- Version 3.0 FAQ: https://actionscheduler.org/version3-0/
