#!/bin/bash
# Utility functions for backup system
# Source this file in other scripts

# Source centralized path configuration (if not already sourced)
if [[ -z "${CONFIG_DIR:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${SCRIPT_DIR}/paths-config.sh"
fi

LOCK_FILE="${LOCKS_DIR}/backup.lock"

# Logging function with timestamp and level
log() {
  local level="$1"
  shift
  local message="$*"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}"
}

# Acquire a lock file to prevent concurrent operations
# Returns 0 on success, 1 if lock is held by another process
acquire_lock() {
  local lock_file="$1"
  local lock_timeout=3600  # 1 hour - remove stale locks

  if [[ -f "${lock_file}" ]]; then
    local lock_age=$(($(date +%s) - $(stat -c %Y "${lock_file}")))
    if [[ ${lock_age} -gt ${lock_timeout} ]]; then
      log "WARN" "Stale lock detected (age: ${lock_age}s), removing"
      rm -f "${lock_file}"
    else
      local lock_pid=$(cat "${lock_file}" 2>/dev/null | grep -oP 'PID:\K\d+' || echo "unknown")
      log "WARN" "Lock held by PID ${lock_pid} (age: ${lock_age}s)"
      return 1
    fi
  fi

  echo "PID:$$" > "${lock_file}"
  return 0
}

# Release a lock file
release_lock() {
  local lock_file="$1"
  rm -f "${lock_file}" 2>/dev/null || true
}

# Generate manifest.json for a backup snapshot
generate_manifest() {
  local source_dir="$1"
  local manifest_file="$2"

  # Count files and calculate size
  local file_count=$(find "${source_dir}" -type f 2>/dev/null | wc -l)
  local dir_count=$(find "${source_dir}" -type d 2>/dev/null | wc -l)
  local size_bytes=$(du -sb "${source_dir}" 2>/dev/null | cut -f1 || echo "0")

  # Check for databases
  local databases=()
  [[ -f "${source_dir}/players.db" ]] && databases+=('"players.db"')
  [[ -f "${source_dir}/vehicles.db" ]] && databases+=('"vehicles.db"')

  # Count map files
  local map_files=0
  if [[ -d "${source_dir}/map" ]]; then
    map_files=$(find "${source_dir}/map" -type f 2>/dev/null | wc -l)
  fi

  # Format databases array
  local db_json=$(
    if [[ ${#databases[@]} -gt 0 ]]; then
      local dbs=$(IFS=,; echo "${databases[*]}")
      echo "[${dbs}]"
    else
      echo "[]"
    fi
  )

  cat > "${manifest_file}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "server": "$(basename "${source_dir}")",
  "files": ${file_count},
  "size_bytes": ${size_bytes},
  "directories": ${dir_count},
  "databases": ${db_json},
  "map_files": ${map_files},
  "hostname": "$(hostname)",
  "uptime": "$(uptime -p 2>/dev/null || echo 'unknown')"
}
EOF
}

# Apply retention policy - delete old snapshots beyond retention count
apply_retention_policy() {
  local schedule="$1"
  local config_file="${CONFIG_DIR}/retention-policy.json"

  if [[ ! -f "${config_file}" ]]; then
    log "ERROR" "Retention policy config not found: ${config_file}"
    return 1
  fi

  local retention=$(jq -r ".policies.${schedule}.count" "${config_file}" 2>/dev/null)

  if [[ -z "${retention}" || "${retention}" == "null" ]]; then
    log "WARN" "No retention policy found for schedule: ${schedule}"
    return 0
  fi

  local snapshots_dir="${SNAPSHOTS_DIR}/${schedule}"

  if [[ ! -d "${snapshots_dir}" ]]; then
    return 0
  fi

  for server_dir in "${snapshots_dir}"/*; do
    if [[ ! -d "${server_dir}" ]]; then continue; fi

    # Get sorted list of snapshots (newest first)
    local snapshots=($(ls -1t "${server_dir}" 2>/dev/null))
    local count=${#snapshots[@]}

    if [[ ${count} -gt ${retention} ]]; then
      log "INFO" "Pruning old snapshots for $(basename "${server_dir}"): keeping ${retention}, removing $((count - retention))"

      for ((i=retention; i<count; i++)); do
        local old_snapshot="${snapshots[$i]}"
        log "INFO" "Removing old snapshot: ${old_snapshot}"
        rm -rf "${old_snapshot}"
      done
    fi
  done
}

# Update global manifest with all snapshots
update_global_manifest() {
  local manifest_file="${META_DIR}/manifest.json"
  local snapshots_dir="${SNAPSHOTS_DIR}"

  local temp_manifest=$(mktemp)
  local temp_file2=$(mktemp)

  echo '{"snapshots": [' > "${temp_manifest}"

  local first=true
  for schedule in 5min 10min 30min hourly daily weekly; do
    local schedule_dir="${snapshots_dir}/${schedule}"
    if [[ ! -d "${schedule_dir}" ]]; then continue; fi

    for server_dir in "${schedule_dir}"/*; do
      if [[ ! -d "${server_dir}" ]]; then continue; fi

      for snapshot_dir in "${server_dir}"/*; do
        if [[ ! -d "${snapshot_dir}" ]]; then continue; fi

        if [[ "${first}" == "true" ]]; then
          first=false
        else
          echo ',' >> "${temp_manifest}"
        fi

        local size_bytes=$(du -sb "${snapshot_dir}" 2>/dev/null | cut -f1 || echo "0")
        local timestamp=$(basename "${snapshot_dir}")

        # Escape path for JSON
        local escaped_path=$(echo "${snapshot_dir}" | sed 's/"/\\"/g')

        cat >> "${temp_manifest}" <<EOF
  {
    "schedule": "${schedule}",
    "server": "$(basename "${server_dir}")",
    "timestamp": "${timestamp}",
    "path": "${escaped_path}",
    "size_bytes": ${size_bytes}
  }
EOF
      done
    done
  done

  echo ']}' >> "${temp_manifest}"

  # Validate JSON before moving
  if jq empty "${temp_manifest}" 2>/dev/null; then
    mv "${temp_manifest}" "${manifest_file}"
  else
    log "ERROR" "Generated invalid JSON, keeping old manifest"
    rm -f "${temp_manifest}"
  fi
  rm -f "${temp_file2}"
}

# Check disk space and warn if threshold exceeded
check_disk_space() {
  local threshold=${1:-90}
  local mount_point="${2:-${ZOMBOID_PATH}}"

  local usage=$(df "${mount_point}" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')

  if [[ -z "${usage}" || ! "${usage}" =~ ^[0-9]+$ ]]; then
    log "WARN" "Could not determine disk usage for ${mount_point}"
    return 0
  fi

  if [[ ${usage} -gt ${threshold} ]]; then
    log "WARN" "Disk space usage is ${usage}% (threshold: ${threshold}%)"
    return 1
  fi

  return 0
}

# Verify SQLite database integrity
verify_database() {
  local db_file="$1"

  if [[ ! -f "${db_file}" ]]; then
    return 0
  fi

  local result=$(sqlite3 "${db_file}" "PRAGMA integrity_check;" 2>&1)

  if [[ "${result}" == "ok" ]]; then
    return 0
  else
    log "ERROR" "Database integrity check failed for ${db_file}: ${result}"
    return 1
  fi
}

# Calculate checksum for a file or directory
calculate_checksum() {
  local target="$1"

  if [[ -f "${target}" ]]; then
    sha256sum "${target}" | awk '{print $1}'
  elif [[ -d "${target}" ]]; then
    find "${target}" -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}'
  else
    echo "unknown"
  fi
}

# Format bytes to human-readable size
format_size() {
  local bytes=$1
  local units=('B' 'KB' 'MB' 'GB' 'TB')
  local unit_index=0

  while [[ ${bytes} -ge 1024 && ${unit_index} -lt $((${#units[@]} - 1)) ]]; do
    bytes=$((bytes / 1024))
    unit_index=$((unit_index + 1))
  done

  if [[ ${unit_index} -eq 0 ]]; then
    echo "${bytes} ${units[${unit_index}]}"
  else
    printf "%.2f %s" "${bytes}" "${units[${unit_index}]}"
  fi
}
