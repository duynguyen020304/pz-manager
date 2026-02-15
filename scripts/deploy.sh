#!/bin/bash
set -e

SOURCE_DIR="/root/zomboid-web-manager"
DEPLOY_DIR="/opt/zomboid-web-manager"
SERVICE_NAME="zomboid-web-manager"

echo "=== Deploying Zomboid Web Manager ==="
echo "Source: $SOURCE_DIR"
echo "Deploy: $DEPLOY_DIR"
echo

# 1. Create deploy directory if needed
echo "Step 1: Preparing deploy directory..."
mkdir -p "$DEPLOY_DIR"
echo "✓ Deploy directory ready"
echo

# 2. Copy files using rsync with exclusions (before build)
echo "Step 2: Copying source files to deploy directory..."
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '__tests__' \
    --exclude '*.test.ts' \
    --exclude '*.test.tsx' \
    --exclude '.git' \
    --exclude 'coverage' \
    --exclude '*.tsbuildinfo' \
    --exclude 'next-env.d.ts' \
    --exclude '.env.local' \
    --exclude '.env*.backup' \
    "$SOURCE_DIR/" "$DEPLOY_DIR/"
echo "✓ Source files copied"
echo

# 3. Save existing .env.local from deploy directory if it exists
DEPLOY_ENV_BACKUP=""
if [ -f "$DEPLOY_DIR/.env.local" ]; then
    echo "Step 3: Backing up existing environment configuration..."
    cp "$DEPLOY_DIR/.env.local" /tmp/zomboid-env-backup.local
    DEPLOY_ENV_BACKUP=/tmp/zomboid-env-backup.local
    echo "✓ Existing environment backup created"
    echo
fi

# 4. Restore or copy .env.local
echo "Step 4: Configuring environment..."
if [ -n "$DEPLOY_ENV_BACKUP" ]; then
    # Restore existing deploy environment (preserves production config)
    cp "$DEPLOY_ENV_BACKUP" "$DEPLOY_DIR/.env.local"
    rm "$DEPLOY_ENV_BACKUP"
    echo "✓ Restored existing environment configuration"
elif [ -f "$SOURCE_DIR/.env.local" ]; then
    # Copy from source if no existing deploy environment
    cp "$SOURCE_DIR/.env.local" "$DEPLOY_DIR/.env.local"
    echo "✓ Copied environment configuration from source"
else
    echo "⚠ No .env.local found - you may need to create one"
fi
echo

# 5. Install dependencies in deploy directory
echo "Step 5: Installing dependencies..."
cd "$DEPLOY_DIR"
npm install
echo "✓ Dependencies installed"
echo

# 6. Build in deploy directory (ensures .next matches node_modules)
echo "Step 6: Building application..."
cd "$DEPLOY_DIR"
npm run build
echo "✓ Build complete"
echo

# 7. Restart systemd service
echo "Step 7: Restarting service..."
systemctl restart "$SERVICE_NAME"
echo "✓ Service restarted"
echo

echo "=== Deployment Complete! ==="
echo "Check status with: systemctl status $SERVICE_NAME"
echo "View logs with: journalctl -u $SERVICE_NAME -f"
