#!/bin/bash

#
# Reset Superadmin Account Script
# Usage: ./scripts/reset-superadmin.sh
#
# This script will:
# 1. Generate a strong random password
# 2. Create or reset the admin user with superadmin role
# 3. Display the new credentials
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${RED}Error: .env.local not found at $ENV_FILE${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env.local${NC}"
    exit 1
fi

# Generate strong random password (24 chars: alphanumeric + special chars)
generate_password() {
    tr -dc 'A-Za-z0-9!@#$%^&*()-_=+' < /dev/urandom | head -c 24
}

# Generate bcrypt hash using Node.js
generate_hash() {
    local password="$1"
    cd "$PROJECT_DIR"
    node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$password', 10));"
}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Reset Superadmin Account${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Generate new password
NEW_PASSWORD=$(generate_password)
echo -e "${YELLOW}Generating strong password...${NC}"

# Generate bcrypt hash
PASSWORD_HASH=$(generate_hash "$NEW_PASSWORD")

if [ -z "$PASSWORD_HASH" ]; then
    echo -e "${RED}Error: Failed to generate password hash${NC}"
    exit 1
fi

echo -e "${YELLOW}Updating database...${NC}"

# Get superadmin role ID and upsert admin user
docker exec -i zomboid-timescaledb psql -U zomboid_admin -d zomboid_manager << EOF
-- Get or create superadmin role
DO \$\$
DECLARE
    superadmin_id INTEGER;
BEGIN
    SELECT id INTO superadmin_id FROM roles WHERE name = 'superadmin' LIMIT 1;

    IF superadmin_id IS NULL THEN
        -- Create superadmin role if not exists
        INSERT INTO roles (name, display_name, description, permissions, is_system)
        VALUES (
            'superadmin',
            'Super Admin',
            'Full system access with all permissions',
            '{"*": ["*"]}'::jsonb,
            true
        )
        RETURNING id INTO superadmin_id;
    END IF;

    -- Upsert admin user
    INSERT INTO users (username, email, password_hash, role_id, is_active, created_at, updated_at)
    VALUES (
        'admin',
        'admin@localhost',
        '$PASSWORD_HASH',
        superadmin_id,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (username)
    DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
END \$\$;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Superadmin Account Reset Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  ${CYAN}Username:${NC}  admin"
    echo -e "  ${CYAN}Password:${NC}  ${YELLOW}${NEW_PASSWORD}${NC}"
    echo ""
    echo -e "${RED}>>> Save this password securely! It won't be shown again. <<<${NC}"
    echo ""

    # Also update .env.local with new hash (for compatibility)
    if grep -q "^ADMIN_PASSWORD_HASH=" "$ENV_FILE"; then
        sed -i "s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=$PASSWORD_HASH|" "$ENV_FILE"
    else
        echo "ADMIN_PASSWORD_HASH=$PASSWORD_HASH" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}Updated ADMIN_PASSWORD_HASH in .env.local${NC}"
    echo ""
else
    echo -e "${RED}Error: Failed to update database${NC}"
    exit 1
fi
