#!/bin/bash
#
# Backup Runner - Wrapper for executing scheduled backups
# Called by systemd timers with schedule name as argument
#
# Usage: backup-runner.sh <schedule_name>
# Example: backup-runner.sh hourly
#

SCHEDULE="$1"

# Validate schedule name
if [[ -z "${SCHEDULE}" ]]; then
  echo "Error: Schedule name required"
  echo "Usage: backup-runner.sh <schedule_name>"
  exit 1
fi

# Valid schedules
VALID_SCHEDULES=("5min" "10min" "30min" "hourly" "daily" "weekly")

# Check if schedule is valid
if [[ ! " ${VALID_SCHEDULES[@]} " =~ " ${SCHEDULE} " ]]; then
  echo "Error: Invalid schedule '${SCHEDULE}'"
  echo "Valid schedules: ${VALID_SCHEDULES[*]}"
  exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source centralized path configuration
source "${SCRIPT_DIR}/paths-config.sh"

# Load configuration
CONFIG_FILE="${CONFIG_DIR}/backup-config.json"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Error: Configuration file not found: ${CONFIG_FILE}"
  exit 1
fi

# Check if this schedule is enabled
SCHEDULE_ENABLED=$(jq -r ".schedules[] | select(.name == \"${SCHEDULE}\") | .enabled" "${CONFIG_FILE}")

if [[ "${SCHEDULE_ENABLED}" != "true" ]]; then
  echo "Schedule '${SCHEDULE}' is disabled, skipping backup"
  exit 0
fi

# Run the backup
exec "${SCRIPT_DIR}/backup.sh" all "${SCHEDULE}"
