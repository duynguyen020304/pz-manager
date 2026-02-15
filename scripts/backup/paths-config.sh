#!/bin/bash
# Centralized path configuration for backup scripts
# Source this file in other backup scripts

# Zomboid installation path (legacy reference, used only for old save paths during migration)
ZOMBOID_PATH="${ZOMBOID_PATH:-/root/Zomboid}"

# Backup system paths (independent location)
BACKUP_SYSTEM_ROOT="${BACKUP_SYSTEM_ROOT:-/opt/zomboid-backups}"
CONFIG_DIR="${BACKUP_SYSTEM_ROOT}/config"
LOG_FILE="${BACKUP_SYSTEM_ROOT}/logs/backup.log"
RESTORE_LOG_FILE="${BACKUP_SYSTEM_ROOT}/logs/restore.log"
SNAPSHOTS_DIR="${BACKUP_SYSTEM_ROOT}/snapshots"
META_DIR="${BACKUP_SYSTEM_ROOT}/meta"
LOCKS_DIR="${BACKUP_SYSTEM_ROOT}/locks"
TMP_DIR="${BACKUP_SYSTEM_ROOT}/tmp"

# Server paths
SERVER_SAVES_DIR="${ZOMBOID_PATH}/Saves/Multiplayer"
SERVER_INI_DIR="${ZOMBOID_PATH}/Server"
SERVER_DB_DIR="${ZOMBOID_PATH}/db"

# Server-specific cache directories (CACHEDIR support)
# Each server gets its own isolated cache for logs, mods, workshop items
# Matches TypeScript: lib/paths.ts SERVER_CACHE_BASE
SERVER_CACHE_BASE="${SERVER_CACHE_BASE:-${ZOMBOID_PATH}/server-cache}"

# Export variables for use in sourced scripts
export ZOMBOID_PATH BACKUP_SYSTEM_ROOT CONFIG_DIR LOG_FILE RESTORE_LOG_FILE
export SNAPSHOTS_DIR META_DIR LOCKS_DIR TMP_DIR
export SERVER_SAVES_DIR SERVER_INI_DIR SERVER_DB_DIR
export SERVER_CACHE_BASE
