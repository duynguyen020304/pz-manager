#!/bin/bash

# Zomboid Server Manager - Setup Script
# This script sets up the web manager for production
# Supports Debian/Ubuntu and Red Hat-based distributions

set -e

echo "=== Zomboid Server Manager Setup ==="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Please run as root or with sudo${NC}"
   exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/opt/zomboid-web-manager"

# Detect OS type and package manager
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    else
        OS=$(uname -s)
    fi

    # Determine package manager
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
        PKG_UPDATE="apt-get update"
        PKG_INSTALL="apt-get install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="dnf update -y"
        PKG_INSTALL="dnf install -y"
    else
        echo -e "${RED}Unable to detect package manager. Supported: apt, yum, dnf${NC}"
        exit 1
    fi

    echo -e "${GREEN}Detected OS: $OS${NC}"
    echo -e "${GREEN}Package manager: $PKG_MANAGER${NC}"
}

detect_os
echo

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
$PKG_UPDATE
$PKG_INSTALL nodejs npm

# Install cloudflared if not present
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Installing cloudflared...${NC}"

    case "$PKG_MANAGER" in
        apt)
            # Debian/Ubuntu installation
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            dpkg -i cloudflared-linux-amd64.deb
            rm -f cloudflared-linux-amd64.deb
            ;;
        yum|dnf)
            # Red Hat-based installation (RHEL, CentOS, AlmaLinux, Rocky Linux, Fedora)
            # Add cloudflared repository
            curl -fsSL https://pkg.cloudflare.com/cloudflared.repo -o /etc/yum.repos.d/cloudflared.repo

            # Update repository metadata
            $PKG_UPDATE

            # Install cloudflared
            $PKG_INSTALL cloudflared
            ;;
    esac
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo

# Generate password hash
echo -e "${YELLOW}Step 2: Setting up authentication...${NC}"
read -s -p "Enter admin password for web manager: " ADMIN_PASSWORD
echo
read -s -p "Confirm password: " ADMIN_PASSWORD_CONFIRM
echo

if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}Passwords do not match!${NC}"
    exit 1
fi

# Generate bcrypt hash
PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10));")
SESSION_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}✓ Password configured${NC}"
echo

# Copy project files
echo -e "${YELLOW}Step 3: Installing application...${NC}"
mkdir -p $PROJECT_DIR
cp -r "$SCRIPT_DIR/"* $PROJECT_DIR/
cd $PROJECT_DIR

# Create .env.local
cat > .env.local << EOF
ADMIN_PASSWORD_HASH=$PASSWORD_HASH
SESSION_SECRET=$SESSION_SECRET
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
NODE_ENV=production
EOF

echo -e "${GREEN}✓ Application files installed${NC}"
echo

# Install dependencies and build
echo -e "${YELLOW}Step 4: Building application...${NC}"
npm install
npm run build

echo -e "${GREEN}✓ Application built${NC}"
echo

# Create systemd service
echo -e "${YELLOW}Step 5: Creating systemd service...${NC}"
cat > /etc/systemd/system/zomboid-web-manager.service << EOF
[Unit]
Description=Zomboid Server Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable zomboid-web-manager

echo -e "${GREEN}✓ Service created${NC}"
echo

# Cloudflare Tunnel setup
echo -e "${YELLOW}Step 6: Setting up Cloudflare Tunnel...${NC}"
echo "You need to authenticate with Cloudflare. Opening browser..."
echo "After authentication, run: cloudflared tunnel create zomboid-manager"
cloudflared tunnel login

echo -e "${YELLOW}Create a tunnel by running:${NC}"
echo -e "${GREEN}  cloudflared tunnel create zomboid-manager${NC}"
echo
echo -e "${YELLOW}Then get the tunnel ID and run:${NC}"
echo -e "${GREEN}  cloudflared tunnel route dns zomboid-manager your-domain.com${NC}"
echo

# Create tunnel config template
cat > $PROJECT_DIR/cloudflared-config.yml << EOF
# Replace TUNNEL_ID with your actual tunnel ID
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

echo -e "${YELLOW}Config template created at: $PROJECT_DIR/cloudflared-config.yml${NC}"
echo

# Summary
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo
echo "To start the web manager:"
echo -e "  ${GREEN}sudo systemctl start zomboid-web-manager${NC}"
echo
echo "To view logs:"
echo -e "  ${GREEN}sudo journalctl -u zomboid-web-manager -f${NC}"
echo
echo "To setup Cloudflare Tunnel:"
echo -e "  ${GREEN}cloudflared tunnel create zomboid-manager${NC}"
echo -e "  ${GREEN}cloudflared tunnel route dns zomboid-manager your-domain.com${NC}"
echo -e "  ${GREEN}cloudflared service install${NC}"
echo -e "  ${GREEN}systemctl start cloudflared${NC}"
echo
echo -e "${GREEN}The web manager will be available at http://localhost:3000${NC}"
echo -e "${GREEN}Or via your Cloudflare tunnel domain once configured${NC}"
