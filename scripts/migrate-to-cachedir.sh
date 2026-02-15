#!/bin/bash
# Migrate existing servers to use CACHEDIR parameter
# This script creates server-specific cache directories and copies existing logs

set -euo pipefail

# Source paths configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup/paths-config.sh"

# Configuration
SERVERS_TO_MIGRATE=("servertest" "duypzserver")  # Add more servers as needed
SKIP_SERVERS=("duypzserver_duytung")  # Servers to skip

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is running
is_server_running() {
    local serverName="$1"
    pgrep -f "ProjectZomboid64.*-servername ${serverName}" > /dev/null 2>&1
}

# Migrate a single server
migrate_server() {
    local serverName="$1"
    local cacheDir="${SERVER_CACHE_BASE}/${serverName}"
    local logsSource="${ZOMBOID_PATH}/Logs"
    local logsDest="${cacheDir}/Logs"

    log_info "=========================================="
    log_info "Migrating server: ${serverName}"
    log_info "=========================================="

    # Check if server is running
    if is_server_running "${serverName}"; then
        log_error "Server ${serverName} is running! Please stop it first."
        log_info "Run: tmux kill-session -t pz-${serverName}"
        return 1
    fi

    # Create cache directory structure
    log_info "Creating cache directory: ${cacheDir}"
    mkdir -p "${cacheDir}/Logs"
    mkdir -p "${cacheDir}/Server"
    mkdir -p "${cacheDir}/Saves/Multiplayer/${serverName}"
    mkdir -p "${cacheDir}/db"
    mkdir -p "${cacheDir}/steamapps/workshop/content/108600"
    mkdir -p "${cacheDir}/Mods"

    # Migrate Server/ directory (contains server INI files with admin accounts)
    log_info "Migrating Server/ directory..."
    local serverSource="${ZOMBOID_PATH}/Server"
    local serverDest="${cacheDir}/Server"

    if [ -d "${serverSource}" ]; then
        # Copy this server's INI files
        if [ -f "${serverSource}/${serverName}.ini" ]; then
            cp "${serverSource}/${serverName}.ini" "${serverDest}/"
            log_info "  ✓ ${serverName}.ini (server config with admin settings)"

            # Verify admin config exists in copied file
            if grep -q "^AdminPassword=" "${serverDest}/${serverName}.ini"; then
                log_info "  ✓ AdminPassword setting found in config"
            fi
        fi

        # Copy SandboxVars, spawnpoints, spawnregions
        for configFile in "${serverName}_SandboxVars.lua" "${serverName}_spawnpoints.lua" "${serverName}_spawnregions.lua"; do
            if [ -f "${serverSource}/${configFile}" ]; then
                cp "${serverSource}/${configFile}" "${serverDest}/"
                log_info "  ✓ ${configFile}"
            fi
        done
    else
        log_warn "No Server directory found at ${serverSource}"
    fi

    # Migrate Saves/ directory (contains world saves)
    log_info "Migrating Saves/ directory..."
    local savesSource="${ZOMBOID_PATH}/Saves/Multiplayer/${serverName}"
    local savesDest="${cacheDir}/Saves/Multiplayer/${serverName}"

    if [ -d "${savesSource}" ]; then
        if [ "$(find "${savesSource}" -type f | wc -l)" -gt 0 ]; then
            cp -r "${savesSource}"/* "${savesDest}/"

            # Count world files
            local worldCount=$(find "${savesDest}" -type f | wc -l)
            log_info "  ✓ ${worldCount} world files copied"
        else
            log_warn "Source saves directory is empty: ${savesSource}"
        fi
    else
        log_warn "No existing saves found for ${serverName}"
    fi

    # Migrate db/ directory (contains player databases)
    log_info "Migrating db/ directory..."
    local dbSource="${ZOMBOID_PATH}/db"
    local dbDest="${cacheDir}/db"

    if [ -f "${dbSource}/${serverName}.db" ]; then
        cp "${dbSource}/${serverName}.db" "${dbDest}/"
        local dbSize=$(du -h "${dbDest}/${serverName}.db" | cut -f1)
        log_info "  ✓ ${serverName}.db (player accounts, whitelist, bans) - ${dbSize}"
    else
        log_warn "No ${serverName}.db found in ${dbSource}"
    fi

    # Copy existing logs to server-specific location
    if [ -d "${logsSource}" ]; then
        log_info "Copying logs from ${logsSource} to ${logsDest}"

        # Copy all log files and directories
        cp -r "${logsSource}"/* "${logsDest}/" 2>/dev/null || true

        # Count copied files
        local fileCount=$(find "${logsDest}" -type f | wc -l)
        log_info "Copied ${fileCount} log files"
    else
        log_warn "No existing logs found at ${logsSource}"
    fi

    # Display summary
    log_info "Migration complete for ${serverName}"
    log_info "Cache directory: ${cacheDir}"
    log_info "  - Server configs: ${serverDest}"
    log_info "  - World saves: ${savesDest}"
    log_info "  - Player database: ${dbDest}/${serverName}.db"
    log_info "  - Logs: ${logsDest}"

    # Show disk usage
    local cacheSize=$(du -sh "${cacheDir}" | cut -f1)
    log_info "Cache directory size: ${cacheSize}"

    echo ""
}

# Pre-migration checks
log_info "=========================================="
log_info "Pre-Migration Checks"
log_info "=========================================="

# Check if any servers are running
anyRunning=false
for server in "${SERVERS_TO_MIGRATE[@]}"; do
    if is_server_running "${server}"; then
        log_warn "Server ${server} is running!"
        anyRunning=true
    fi
done

if [ "${anyRunning}" = true ]; then
    log_error "Please stop all servers before running migration"
    exit 1
fi

# Show current disk usage
log_info "Current disk usage:"
du -sh "${ZOMBOID_PATH}/Logs" 2>/dev/null || log_warn "No logs directory found"

echo ""

# Migrate each server
for server in "${SERVERS_TO_MIGRATE[@]}"; do
    # Skip servers in SKIP_SERVERS list
    shouldSkip=false
    for skip in "${SKIP_SERVERS[@]}"; do
        if [ "${server}" = "${skip}" ]; then
            shouldSkip=true
            break
        fi
    done

    if [ "${shouldSkip}" = true ]; then
        log_info "Skipping ${server} (in skip list)"
        echo ""
        continue
    fi

    migrate_server "${server}"
done

# Post-migration summary
log_info "=========================================="
log_info "Migration Summary"
log_info "=========================================="

for server in "${SERVERS_TO_MIGRATE[@]}"; do
    cacheDir="${SERVER_CACHE_BASE}/${server}"
    if [ -d "${cacheDir}" ]; then
        cacheSize=$(du -sh "${cacheDir}" 2>/dev/null | cut -f1)
        log_info "${server}: ${cacheSize} ✓"
    fi
done

log_info "=========================================="
log_info "Next Steps:"
log_info "1. Start servers through the web UI or API"
log_info "2. Verify admin accounts work in-game"
log_info "3. Verify player data and world state are preserved"
log_info "4. Verify logs appear in server-specific directories"
log_info "5. Monitor servers for 24-48 hours"
log_info "6. If stable, you can archive original data:"
log_info "   mv ${ZOMBOID_PATH}/Server ${ZOMBOID_PATH}/Server.backup"
log_info "   mv ${ZOMBOID_PATH}/Saves ${ZOMBOID_PATH}/Saves.backup"
log_info "   mv ${ZOMBOID_PATH}/db ${ZOMBOID_PATH}/db.backup"
log_info "   mv ${ZOMBOID_PATH}/Logs ${ZOMBOID_PATH}/Logs.backup"
log_info "=========================================="
