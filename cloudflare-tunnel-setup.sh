#!/bin/bash

# Zomboid Web Manager - Cloudflare Tunnel Setup Script
# This creates a separate tunnel for the Zomboid Web Manager
# Supports Debian/Ubuntu and Red Hat-based distributions

set -e

echo "=== Zomboid Web Manager - Cloudflare Tunnel Setup ==="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Please run as root or with sudo${NC}"
   exit 1
fi

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
    echo
}

detect_os

# Check if cloudflared is installed
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
            $PKG_MANAGER update -y

            # Install cloudflared
            $PKG_INSTALL cloudflared
            ;;
    esac

    echo -e "${GREEN}✓ cloudflared installed${NC}"
else
    echo -e "${GREEN}✓ cloudflared already installed${NC}"
fi

echo
echo -e "${YELLOW}Step 1: Login to Cloudflare${NC}"
echo "This will open a browser window for authentication..."
cloudflared tunnel login

echo
echo -e "${YELLOW}Step 2: Create a new tunnel${NC}"
echo "Enter a name for the tunnel (e.g., zomboid-manager):"
read TUNNEL_NAME

cloudflared tunnel create "$TUNNEL_NAME"

# Get tunnel info
TUNNEL_INFO=$(cloudflared tunnel info "$TUNNEL_NAME")
TUNNEL_ID=$(echo "$TUNNEL_INFO" | grep -oP 'id: \K[^ ]+')

echo
echo -e "${GREEN}✓ Tunnel created with ID: $TUNNEL_ID${NC}"
echo

echo -e "${YELLOW}Step 3: Configure DNS routing${NC}"
echo "Enter the full domain name for this tunnel (e.g., zomboid.yourdomain.com):"
read DOMAIN_NAME

cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN_NAME"

echo
echo -e "${GREEN}✓ DNS route created${NC}"
echo

# Create config file
CONFIG_DIR="/etc/cloudflared"
CONFIG_FILE="$CONFIG_DIR/zomboid-manager.yml"

mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN_NAME
    service: http://localhost:3000
  - service: http_status:404
EOF

# Copy credentials
cp ~/.cloudflared/"$TUNNEL_ID".json "$CONFIG_DIR/"

echo -e "${GREEN}✓ Config created at: $CONFIG_FILE${NC}"
echo

# Create systemd service
echo -e "${YELLOW}Step 4: Creating systemd service...${NC}"

cat > /etc/systemd/system/zomboid-cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel for Zomboid Web Manager
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/cloudflared --config $CONFIG_FILE run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable zomboid-cloudflared.service

echo -e "${GREEN}✓ Service created${NC}"
echo

# Summary
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo
echo "Your tunnel configuration:"
echo "  Tunnel Name: $TUNNEL_NAME"
echo "  Tunnel ID: $TUNNEL_ID"
echo "  Domain: $DOMAIN_NAME"
echo "  Local URL: http://localhost:3000"
echo
echo "To start the tunnel:"
echo -e "  ${GREEN}sudo systemctl start zomboid-cloudflared${NC}"
echo
echo "To check status:"
echo -e "  ${GREEN}sudo systemctl status zomboid-cloudflared${NC}"
echo
echo "To view logs:"
echo -e "  ${GREEN}sudo journalctl -u zomboid-cloudflared -f${NC}"
echo
echo "The web manager will be accessible at:"
echo -e "  ${GREEN}https://$DOMAIN_NAME${NC}"
echo
