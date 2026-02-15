#!/bin/bash
#
# Project Zomboid Restore Script
# Restores a server save from a backup snapshot
#
# Usage: restore.sh <server> <snapshot_path> [--no-verify] [--dry-run]
#
# Example: restore.sh duypzserver /root/Zomboid/backup-system/snapshots/hourly/duypzserver/20260209_120000
#

set -euo pipefail

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/paths-config.sh"

LOG_FILE="${RESTORE_LOG_FILE}"
LOCK_FILE="${LOCKS_DIR}/restore.lock"

# Source utility functions
source "${SCRIPT_DIR}/backup-functions.sh"

# Redirect output to log file
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

# Parse command line arguments
SERVER_NAME="$1"
SNAPSHOT_PATH="$2"
VERIFY="${3:-true}"
DRY_RUN="${4:-false}"

log "INFO" "=========================================="
log "INFO" "Restore job started"
log "INFO" "Server: ${SERVER_NAME}"
log "INFO" "Snapshot: ${SNAPSHOT_PATH}"
log "INFO" "Verify: ${VERIFY}, Dry-run: ${DRY_RUN}"

# Validate inputs
if [[ -z "${SERVER_NAME}" || -z "${SNAPSHOT_PATH}" ]]; then
  log "ERROR" "Usage: restore.sh <server> <snapshot_path> [--no-verify] [--dry-run]"
  log "ERROR" "Example: restore.sh duypzserver /root/Zomboid/backup-system/snapshots/hourly/duypzserver/20260209_120000"
  exit 1
fi

# Acquire lock to prevent concurrent operations
acquire_lock "${LOCK_FILE}" || {
  log "ERROR" "Could not acquire restore lock, another operation may be running"
  exit 1
}

# Ensure lock is released on exit
trap 'release_lock "${LOCK_FILE}"' EXIT

# Define paths - all servers use CACHEDIR isolation
SAVES_DIR="${SERVER_CACHE_BASE}/${SERVER_NAME}/Saves/Multiplayer/${SERVER_NAME}"
log "INFO" "Target directory: ${SAVES_DIR}"

EMERGENCY_BACKUP_DIR="${TMP_DIR}/emergency_${SERVER_NAME}_$(date +%Y%m%d_%H%M%S)"

# Validate snapshot exists
if [[ ! -d "${SNAPSHOT_PATH}" ]]; then
  log "ERROR" "Snapshot not found: ${SNAPSHOT_PATH}"
  exit 1
fi

# Validate snapshot has required files
if [[ ! -f "${SNAPSHOT_PATH}/checksum.sha256" ]]; then
  log "ERROR" "Snapshot missing checksum.sha256: ${SNAPSHOT_PATH}"
  exit 1
fi

# Check if server save directory exists
if [[ ! -d "${SAVES_DIR}" ]]; then
  log "ERROR" "Server save directory not found: ${SAVES_DIR}"
  log "ERROR" "Cannot restore to non-existent directory"
  exit 1
fi

# Read snapshot manifest for info
MANIFEST_FILE="${SNAPSHOT_PATH}/manifest.json"
if [[ -f "${MANIFEST_FILE}" ]]; then
  log "INFO" "Snapshot manifest:"
  log "INFO" "  Timestamp: $(jq -r '.timestamp' "${MANIFEST_FILE}")"
  log "INFO" "  Files: $(jq -r '.files' "${MANIFEST_FILE}")"
  log "INFO" "  Size: $(format_size $(jq -r '.size_bytes' "${MANIFEST_FILE}"))"
fi

# Display warning
log "WARN" "=========================================="
log "WARN" "⚠️  RESTORE WARNING ⚠️"
log "WARN" "=========================================="
log "WARN" "This will REPLACE current server data with snapshot"
log "WARN" "All changes since snapshot will be LOST"
log "WARN" "Server should be STOPPED before restore"
log "WARN" "=========================================="

# Ask for confirmation (skip in dry-run mode)
if [[ "${DRY_RUN}" != "true" ]]; then
  echo -n "Continue with restore? (yes/no): "
  read -r CONFIRM

  if [[ "${CONFIRM}" != "yes" && "${CONFIRM}" != "y" ]]; then
    log "INFO" "Restore cancelled by user"
    exit 0
  fi
else
  log "INFO" "[DRY-RUN] Skipping confirmation"
fi

# Create emergency backup of current state
log "INFO" "Creating emergency backup of current state to ${EMERGENCY_BACKUP_DIR}"

if [[ "${DRY_RUN}" != "true" ]]; then
  mkdir -p "${EMERGENCY_BACKUP_DIR}"

  if rsync -a "${SAVES_DIR}/" "${EMERGENCY_BACKUP_DIR}/"; then
    EMERGENCY_SIZE=$(du -sb "${EMERGENCY_BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "0")
    log "INFO" "Emergency backup created: $(format_size ${EMERGENCY_SIZE})"
  else
    log "ERROR" "Failed to create emergency backup, aborting restore"
    exit 1
  fi
else
  log "INFO" "[DRY-RUN] Would create emergency backup"
fi

# Perform restore
log "INFO" "Starting restore from ${SNAPSHOT_PATH} to ${SAVES_DIR}"

RESTORE_SUCCESS=false

if [[ -f "${SNAPSHOT_PATH}/backup.tar.zst" ]]; then
  # Compressed backup
  log "INFO" "Decompressing and extracting backup"

  if [[ "${DRY_RUN}" != "true" ]]; then
    # Clear existing save directory first
    rm -rf "${SAVES_DIR:?}"/*
    rm -rf "${SAVES_DIR:?}"/.[!.]* 2>/dev/null || true

    # Extract archive
    if zstd -d "${SNAPSHOT_PATH}/backup.tar.zst" --stdout | \
       tar --extract --directory "${SAVES_DIR}" --strip-components=0 2>/dev/null; then
      RESTORE_SUCCESS=true
      log "INFO" "Backup extracted successfully"
    else
      log "ERROR" "Failed to extract backup archive"
    fi
  else
    log "INFO" "[DRY-RUN] Would extract backup.tar.zst to ${SAVES_DIR}"
    RESTORE_SUCCESS=true
  fi

elif [[ -d "${SNAPSHOT_PATH}" && -n "$(ls -A "${SNAPSHOT_PATH}" 2>/dev/null)" ]]; then
  # Uncompressed backup
  log "INFO" "Copying files from uncompressed backup"

  if [[ "${DRY_RUN}" != "true" ]]; then
    # Clear existing save directory first
    rm -rf "${SAVES_DIR:?}"/*
    rm -rf "${SAVES_DIR:?}"/.[!.]* 2>/dev/null || true

    if rsync -a --delete "${SNAPSHOT_PATH}/" "${SAVES_DIR}/"; then
      RESTORE_SUCCESS=true
      log "INFO" "Files copied successfully"
    else
      log "ERROR" "Failed to copy backup files"
    fi
  else
    log "INFO" "[DRY-RUN] Would rsync files to ${SAVES_DIR}"
    RESTORE_SUCCESS=true
  fi

else
  log "ERROR" "Snapshot appears to be empty or invalid"
  exit 1
fi

if [[ "${RESTORE_SUCCESS}" != "true" ]]; then
  log "ERROR" "Restore failed, rolling back to emergency backup"
  if [[ "${DRY_RUN}" != "true" ]]; then
    rsync -a --delete "${EMERGENCY_BACKUP_DIR}/" "${SAVES_DIR}/"
    log "INFO" "Rolled back to emergency backup"
  fi
  exit 1
fi

# Verify checksums
if [[ "${VERIFY}" == "true" && "${DRY_RUN}" != "true" ]]; then
  log "INFO" "Verifying checksums"

  EXPECTED=$(cat "${SNAPSHOT_PATH}/checksum.sha256" | awk '{print $1}')

  if [[ -f "${SNAPSHOT_PATH}/backup.tar.zst" ]]; then
    # Verify compressed archive checksum
    ACTUAL=$(sha256sum "${SNAPSHOT_PATH}/backup.tar.zst" | awk '{print $1}')
  else
    # Verify directory checksum
    ACTUAL=$(find "${SNAPSHOT_PATH}" -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')
  fi

  if [[ "${EXPECTED}" != "${ACTUAL}" ]]; then
    log "ERROR" "Checksum mismatch!"
    log "ERROR" "Expected: ${EXPECTED}"
    log "ERROR" "Actual:   ${ACTUAL}"
    log "ERROR" "Rolling back to emergency backup"

    rsync -a --delete "${EMERGENCY_BACKUP_DIR}/" "${SAVES_DIR}/"
    log "INFO" "Rolled back to emergency backup"
    exit 1
  fi

  log "INFO" "Checksum verified: ${ACTUAL}"

elif [[ "${VERIFY}" == "true" ]]; then
  log "INFO" "[DRY-RUN] Would verify checksums"
fi

# Verify database integrity
if [[ "${VERIFY}" == "true" && "${DRY_RUN}" != "true" ]]; then
  log "INFO" "Verifying database integrity"

  for DB_FILE in players.db vehicles.db; do
    if [[ -f "${SAVES_DIR}/${DB_FILE}" ]]; then
      if verify_database "${SAVES_DIR}/${DB_FILE}"; then
        log "INFO" "Database ${DB_FILE} is valid"
      else
        log "ERROR" "Database integrity check failed for ${DB_FILE}"
        log "ERROR" "Rolling back to emergency backup"

        rsync -a --delete "${EMERGENCY_BACKUP_DIR}/" "${SAVES_DIR}/"
        log "INFO" "Rolled back to emergency backup"
        exit 1
      fi
    fi
  done

elif [[ "${VERIFY}" == "true" ]]; then
  log "INFO" "[DRY-RUN] Would verify database integrity"
fi

# Restore completed successfully
log "INFO" "=========================================="
log "INFO" "Restore completed successfully!"
log "INFO" "Emergency backup saved at: ${EMERGENCY_BACKUP_DIR}"
log "INFO" "=========================================="

# Print post-restore instructions
log "INFO" "Post-restore steps:"
log "INFO" "1. Start the server:"
log "INFO" "   cd ${ZOMBOID_PATH} && ./start-server.sh -servername ${SERVER_NAME}"
log "INFO" ""
log "INFO" "2. Verify players can connect"
log "INFO" "3. Check server logs for errors"
log "INFO" ""
log "INFO" "If issues occur, restore from emergency backup:"
log "INFO" "   rsync -a --delete ${EMERGENCY_BACKUP_DIR}/ ${SAVES_DIR}/"

exit 0
