-- Migration: Cleanup Duplicate Player Events
-- Date: 2025-02-17
-- Purpose: Remove duplicate rows from pz_player_events table
--
-- WARNING: ONE-TIME MIGRATION - DO NOT RE-RUN
-- This migration should be executed only once, before adding the unique constraint.
-- After running this, verify the duplicate count is 0, then proceed with:
--   20250217_add_player_events_unique_constraint.sql
--
-- PREREQUISITE: Run backup before executing this migration
--   pg_dump -h localhost -U zomboid_admin -d zomboid_manager > backup_before_cleanup.sql
--
-- Duplicates Identified By: (time, username, event_type, server)
--   - time: Event timestamp
--   - username: Player username
--   - event_type: Event type (login_success, logout, chat, death, etc.)
--   - server: Server name
--
-- Cleanup Strategy:
--   - Uses PostgreSQL ctid (physical row identifier) to identify duplicates
--   - Keeps the FIRST inserted row (lowest ctid) for each duplicate group
--   - Deletes all subsequent duplicate rows (higher ctid values)
--   - ctid is unique per row and represents physical insertion order
--
-- ==============================================================================
-- STEP 1: COUNT DUPLICATES BEFORE CLEANUP
-- ==============================================================================
-- Run this query first to see how many duplicates exist
-- Save the count for documentation purposes

SELECT
    COUNT(*) - COUNT(DISTINCT (time, username, event_type, server)) as duplicate_count
FROM pz_player_events;

-- Alternative: Show sample duplicates (limited to 20)
SELECT
    time,
    username,
    event_type,
    server,
    COUNT(*) as occurrence_count
FROM pz_player_events
GROUP BY time, username, event_type, server
HAVING COUNT(*) > 1
LIMIT 20;

-- ==============================================================================
-- STEP 2: DELETE DUPLICATES
-- ==============================================================================
-- This query deletes all but the first occurrence of each duplicate group
-- Uses MIN(ctid) to identify the first inserted row (keeps it)
-- Deletes all rows where ctid is NOT the minimum for their group

-- DELETE FROM pz_player_events
-- WHERE ctid NOT IN (
--     SELECT MIN(ctid)
--     FROM pz_player_events
--     GROUP BY time, username, event_type, server
-- );

-- IMPORTANT: Comment above DELETE out, run Step 1 first
-- After verifying duplicate count, uncomment and execute DELETE
-- Run Step 3 after DELETE completes

-- ==============================================================================
-- STEP 3: VERIFY CLEANUP
-- ==============================================================================
-- Run this after cleanup to verify no duplicates remain
-- Expected result: 0 (no duplicates)

SELECT
    COUNT(*) - COUNT(DISTINCT (time, username, event_type, server)) as remaining_duplicates
FROM pz_player_events;

-- Verification query: Show any remaining duplicates (should return 0 rows)
SELECT
    time,
    username,
    event_type,
    server,
    COUNT(*) as duplicate_count
FROM pz_player_events
GROUP BY time, username, event_type, server
HAVING COUNT(*) > 1;

-- ==============================================================================
-- STEP 4: CONFIRM DELETION COUNT
-- ==============================================================================
-- This shows how many rows were deleted
-- Run after DELETE completes, before Step 3

-- SELECT
--     (SELECT COUNT(*) FROM pz_player_events BEFORE DELETE) - COUNT(*) as rows_deleted
-- FROM pz_player_events;

-- ==============================================================================
-- PRODUCTION DEPLOYMENT NOTES
-- ==============================================================================
--
-- Before executing in production:
-- 1. Create a database backup
--    docker exec zomboid-timescaledb pg_dump -U zomboid_admin zomboid_manager > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- 2. Estimate cleanup time:
--    - For small datasets (< 10K rows): < 1 second
--    - For medium datasets (10K-100K rows): 1-10 seconds
--    - For large datasets (100K-1M rows): 10-60 seconds
--    - For very large datasets (> 1M rows): May need batched approach
--
-- 3. Execute during low-traffic period:
--    - DELETE will lock the table briefly during transaction
--    - Consider using transaction with ROLLBACK option for testing:
--      BEGIN;
--      -- Run DELETE query
--      -- Verify with SELECT COUNT(*)
--      -- If correct: COMMIT; else: ROLLBACK;
--
-- 4. Monitoring:
--    - Check database size before/after: pg_database_size('zomboid_manager')
--    - Monitor log file positions table: SELECT * FROM log_file_positions WHERE parser_type='user'
--
-- 5. After cleanup succeeds:
--    - Run unique constraint migration: 20250217_add_player_events_unique_constraint.sql
--    - Verify log ingestion continues to work correctly
--    - Monitor for any duplicate-related errors in logs
--
-- ==============================================================================
-- TROUBLESHOOTING
-- ==============================================================================
--
-- Issue: "ERROR: could not open relation with OID"
-- Cause: ctid reference issue in complex queries
-- Solution: Use CTE (Common Table Expression) wrapper:
--
-- WITH duplicates_to_delete AS (
--     SELECT ctid
--     FROM pz_player_events
--     WHERE ctid NOT IN (
--         SELECT MIN(ctid)
--         FROM pz_player_events
--         GROUP BY time, username, event_type, server
--     )
-- )
-- DELETE FROM pz_player_events
-- WHERE ctid IN (SELECT ctid FROM duplicates_to_delete);
--
-- Issue: "ERROR: tuple concurrently updated"
-- Cause: Concurrent writes during cleanup
-- Solution: Pause log ingestion during cleanup, or use explicit LOCK:
--   BEGIN;
--   LOCK TABLE pz_player_events IN ACCESS EXCLUSIVE MODE;
--   -- Run DELETE query
--   COMMIT;
--
-- ==============================================================================
