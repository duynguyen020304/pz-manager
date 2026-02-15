#!/bin/bash
#
# Project Zomboid Backup Script
# Creates time-series snapshots of multiplayer server saves
#
# Usage: backup.sh [--server SERVER] [--schedule SCHEDULE] [--dry-run]
#

set -euo pipefail

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/paths-config.sh"

LOCK_FILE="${LOCKS_DIR}/backup.lock"

# Source utility functions
source "${SCRIPT_DIR}/backup-functions.sh"

# Redirect output to log file
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

# Parse command line arguments
SERVER="${1:-all}"
SCHEDULE="${2:-hourly}"
DRY_RUN="${3:-false}"

log "INFO" "=========================================="
log "INFO" "Backup job started"
log "INFO" "Server: ${SERVER}, Schedule: ${SCHEDULE}, Dry-run: ${DRY_RUN}"

# Acquire lock to prevent concurrent backups
acquire_lock "${LOCK_FILE}" || {
  log "ERROR" "Could not acquire lock, another backup may be running"
  exit 1
}

# Ensure lock is released on exit
trap 'release_lock "${LOCK_FILE}"' EXIT

# Check if jq is available
if ! command -v jq &> /dev/null; then
  log "ERROR" "jq is required but not installed. Install with: apt-get install jq"
  exit 1
fi

# Load configuration
CONFIG_FILE="${CONFIG_DIR}/backup-config.json"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  log "ERROR" "Configuration file not found: ${CONFIG_FILE}"
  exit 1
fi

# Read configuration values
SAVES_PATH=$(jq -r '.savesPath' "${CONFIG_FILE}")
SNAPSHOTS_PATH=$(jq -r '.snapshotsPath' "${CONFIG_FILE}")
COMPRESSION_ENABLED=$(jq -r '.compression.enabled' "${CONFIG_FILE}")
COMPRESSION_ALGORITHM=$(jq -r '.compression.algorithm' "${CONFIG_FILE}")
COMPRESSION_LEVEL=$(jq -r '.compression.level' "${CONFIG_FILE}")
VERIFY_AFTER_BACKUP=$(jq -r '.integrity.verifyAfterBackup' "${CONFIG_FILE}")

# Check if schedule is enabled
SCHEDULE_ENABLED=$(jq -r ".schedules[] | select(.name == \"${SCHEDULE}\") | .enabled" "${CONFIG_FILE}")

if [[ "${SCHEDULE_ENABLED}" != "true" ]]; then
  log "INFO" "Schedule '${SCHEDULE}' is disabled, skipping backup"
  exit 0
fi

# Determine servers to backup
if [[ "${SERVER}" == "all" ]]; then
  SERVERS=$(jq -r '.servers[]' "${CONFIG_FILE}")
else
  SERVERS="${SERVER}"
fi

# Track success/failure
declare -A BACKUP_STATUS
declare -A BACKUP_SIZE

# Backup each server
for SERVER_NAME in ${SERVERS}; do
  log "INFO" "------------------------------------------"
  log "INFO" "Processing server: ${SERVER_NAME}"

  # All servers use CACHEDIR isolation
  SOURCE_DIR="${SERVER_CACHE_BASE}/${SERVER_NAME}/Saves/Multiplayer/${SERVER_NAME}"
  log "INFO" "Source directory: ${SOURCE_DIR}"

  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  DEST_DIR="${SNAPSHOTS_PATH}/${SCHEDULE}/${SERVER_NAME}/${TIMESTAMP}"

  # Verify source directory exists
  if [[ ! -d "${SOURCE_DIR}" ]]; then
    log "WARN" "Server directory not found: ${SOURCE_DIR}"
    BACKUP_STATUS["${SERVER_NAME}"]="skipped"
    continue
  fi

  # Create destination directory
  if [[ "${DRY_RUN}" != "true" ]]; then
    mkdir -p "${DEST_DIR}"
  fi

  # Get pre-backup size
  SOURCE_SIZE=$(du -sb "${SOURCE_DIR}" 2>/dev/null | cut -f1 || echo "0")
  log "INFO" "Source size: $(format_size ${SOURCE_SIZE})"

  # Perform backup based on compression setting
  if [[ "${COMPRESSION_ENABLED}" == "true" ]]; then
    log "INFO" "Creating compressed backup with ${COMPRESSION_ALGORITHM} level ${COMPRESSION_LEVEL}"

    if [[ "${DRY_RUN}" == "true" ]]; then
      log "INFO" "[DRY-RUN] Would create: ${DEST_DIR}/backup.tar.zst"
      BACKUP_STATUS["${SERVER_NAME}"]="dry-run"
      continue
    fi

    # Create tar archive and compress
    if tar --create \
          --file - \
          --directory "${SOURCE_DIR}" \
          . 2>/dev/null | \
      "${COMPRESSION_ALGORITHM}" -${COMPRESSION_LEVEL} > "${DEST_DIR}/backup.tar.zst"; then
      BACKUP_STATUS["${SERVER_NAME}"]="success"

      # Get backup size
      BACKUP_SIZE_BYTES=$(du -sb "${DEST_DIR}/backup.tar.zst" 2>/dev/null | cut -f1 || echo "0")
      BACKUP_SIZE["${SERVER_NAME}"]="${BACKUP_SIZE_BYTES}"

      # Calculate compression ratio
      if [[ ${SOURCE_SIZE} -gt 0 ]]; then
        RATIO=$(echo "scale=2; ${SOURCE_SIZE} / ${BACKUP_SIZE_BYTES}" | bc 2>/dev/null || echo "1")
        log "INFO" "Backup created: ${DEST_DIR}/backup.tar.zst ($(format_size ${BACKUP_SIZE_BYTES}), ratio: ${RATIO}x)"
      else
        log "INFO" "Backup created: ${DEST_DIR}/backup.tar.zst ($(format_size ${BACKUP_SIZE_BYTES}))"
      fi
    else
      log "ERROR" "Backup creation failed for ${SERVER_NAME}"
      BACKUP_STATUS["${SERVER_NAME}"]="failed"
      rm -rf "${DEST_DIR}"
      continue
    fi
  else
    log "INFO" "Creating uncompressed backup (rsync)"

    if [[ "${DRY_RUN}" == "true" ]]; then
      log "INFO" "[DRY-RUN] Would rsync to: ${DEST_DIR}"
      BACKUP_STATUS["${SERVER_NAME}"]="dry-run"
      continue
    fi

    # Use rsync for uncompressed backup
    if rsync -a --delete "${SOURCE_DIR}/" "${DEST_DIR}/"; then
      BACKUP_STATUS["${SERVER_NAME}"]="success"
      BACKUP_SIZE_BYTES=$(du -sb "${DEST_DIR}" 2>/dev/null | cut -f1 || echo "0")
      BACKUP_SIZE["${SERVER_NAME}"]="${BACKUP_SIZE_BYTES}"
      log "INFO" "Backup created: ${DEST_DIR} ($(format_size ${BACKUP_SIZE_BYTES}))"
    else
      log "ERROR" "Backup creation failed for ${SERVER_NAME}"
      BACKUP_STATUS["${SERVER_NAME}"]="failed"
      rm -rf "${DEST_DIR}"
      continue
    fi
  fi

  # Generate manifest
  log "INFO" "Generating backup manifest"
  generate_manifest "${SOURCE_DIR}" "${DEST_DIR}/manifest.json"

  # Calculate checksum
  log "INFO" "Calculating checksum"

  if [[ "${COMPRESSION_ENABLED}" == "true" && -f "${DEST_DIR}/backup.tar.zst" ]]; then
    CHECKSUM=$(sha256sum "${DEST_DIR}/backup.tar.zst" | awk '{print $1}')
  else
    CHECKSUM=$(find "${DEST_DIR}" -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')
  fi

  echo "${CHECKSUM}" > "${DEST_DIR}/checksum.sha256"
  log "INFO" "Checksum: ${CHECKSUM}"

  # Verify database integrity if enabled
  if [[ "${VERIFY_AFTER_BACKUP}" == "true" ]]; then
    log "INFO" "Verifying database integrity"

    for DB_FILE in players.db vehicles.db; do
      if [[ -f "${SOURCE_DIR}/${DB_FILE}" ]]; then
        if verify_database "${SOURCE_DIR}/${DB_FILE}"; then
          log "INFO" "Database ${DB_FILE} is valid"
        else
          log "WARN" "Database ${DB_FILE} integrity check failed (non-fatal)"
        fi
      fi
    done
  fi

  log "INFO" "Backup completed for ${SERVER_NAME}"
done

# Apply retention policy
log "INFO" "------------------------------------------"
log "INFO" "Applying retention policy for schedule: ${SCHEDULE}"

if [[ "${DRY_RUN}" != "true" ]]; then
  apply_retention_policy "${SCHEDULE}"
else
  log "INFO" "[DRY-RUN] Would apply retention policy"
fi

# Update global manifest
log "INFO" "Updating global manifest"

if [[ "${DRY_RUN}" != "true" ]]; then
  update_global_manifest
else
  log "INFO" "[DRY-RUN] Would update global manifest"
fi

# Check disk space
log "INFO" "Checking disk space"
DISK_THRESHOLD=$(jq -r '.notifications.diskThreshold' "${CONFIG_FILE}")
check_disk_space "${DISK_THRESHOLD}" || true

# Print summary
log "INFO" "=========================================="
log "INFO" "Backup job completed - Summary:"

for SERVER_NAME in ${SERVERS}; do
  STATUS="${BACKUP_STATUS[${SERVER_NAME}]:-unknown}"
  SIZE="${BACKUP_SIZE[${SERVER_NAME}]:-0}"
  log "INFO" "  ${SERVER_NAME}: ${STATUS} $(format_size ${SIZE})"
done

log "INFO" "=========================================="

exit 0
