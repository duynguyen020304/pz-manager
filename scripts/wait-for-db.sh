#!/bin/bash

#
# Wait for Database to be Ready
# This script waits for the TimescaleDB container to be fully ready
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo -e "${YELLOW}Waiting for database to be ready...${NC}"

# Wait for container to be healthy (max 30 seconds)
for i in {1..30}; do
    if docker exec zomboid-timescaledb pg_isready -U zomboid_admin -d zomboid_manager >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready!${NC}"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${YELLOW}Database took longer than expected, but continuing...${NC}"
exit 0
