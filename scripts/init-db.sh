#!/bin/bash
# Master database initialization script
# This script waits for the database to be ready and runs all SQL migrations in order

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Database Initialization"
echo "========================================="

# Step 1: Wait for database to be ready
echo "[1/5] Waiting for database to be ready..."
./scripts/wait-for-db.sh

# Step 2: Initialize core schema (roles, users, sessions, audit_logs)
echo "[2/5] Initializing core schema..."
cat "$SCRIPT_DIR/init-db.sql" | docker exec -i zomboid-timescaledb psql -U zomboid_admin -d zomboid_manager

# Step 3: Add log tables (backup_logs, pz_player_events, etc.)
echo "[3/5] Adding log system tables..."
cat "$SCRIPT_DIR/migrations/add_logs_tables.sql" | docker exec -i zomboid-timescaledb psql -U zomboid_admin -d zomboid_manager

# Step 4: Add monitoring tables (system_metrics, system_spikes, monitor_config)
echo "[4/5] Adding monitoring system tables..."
cat "$SCRIPT_DIR/migrations/add_system_monitoring.sql" | docker exec -i zomboid-timescaledb psql -U zomboid_admin -d zomboid_manager

# Step 5: Create admin user
echo "[5/5] Creating admin user..."
# Load environment variables from .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
    echo "Loading environment from .env.local..."
    set -a
    source "$PROJECT_DIR/.env.local"
    set +a
fi
cd "$PROJECT_DIR" && node scripts/migrate-admin.js

echo "========================================="
echo "Database initialization complete!"
echo "========================================="
