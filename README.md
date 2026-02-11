# Project Zomboid Server Manager

A modern web application for managing Project Zomboid server backups, rollbacks, and configuration through an intuitive web interface.

## Features

- **Dashboard**: Overview of servers, schedules, and quick actions
- **Server Management**: Add/remove servers with auto-detection
- **Backup Browser**: Browse and filter snapshots by schedule type
- **Rollback Wizard**: 5-step wizard for safe server restoration
- **Configuration Editor**: Manage schedules, servers, and settings
- **Real-time Progress**: Monitor restore operations with polling
- **Secure**: Password protection with session-based auth

## Architecture

- **Frontend**: Next.js 14+ with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Custom components with Tailwind
- **Authentication**: bcryptjs with session cookies

## Prerequisites

- Node.js 18+
- npm
- Project Zomboid backup system configured
- (Optional) Cloudflare account for tunnel

## Quick Start

### 1. Clone and Install

```bash
cd /root/Zomboid/zomboid-web-manager
npm install
```

### 2. Generate Password Hash

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

### 3. Configure Environment

Create `.env.local`:

```bash
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here
SESSION_SECRET=$(openssl rand -base64 32)
ZOMBOID_PATH=/root/Zomboid
BACKUP_CONFIG_PATH=/root/Zomboid/backup-system/config/backup-config.json
SNAPSHOTS_PATH=/root/Zomboid/backup-system/snapshots
```

### 4. Build and Run

```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Production Deployment

### Automated Setup

Run the setup script as root:

```bash
sudo bash setup.sh
```

This will:
- Install dependencies
- Configure authentication
- Build the application
- Create systemd service
- Guide through Cloudflare tunnel setup

### Manual Production Setup

#### 1. Build Application

```bash
cd /opt/zomboid-web-manager
npm install
npm run build
```

#### 2. Create Systemd Service

Create `/etc/systemd/system/zomboid-web-manager.service`:

```ini
[Unit]
Description=Zomboid Server Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/zomboid-web-manager
Environment=NODE_ENV=production
EnvironmentFile=/opt/zomboid-web-manager/.env.local
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zomboid-web-manager
sudo systemctl start zomboid-web-manager
```

View logs:

```bash
sudo journalctl -u zomboid-web-manager -f
```

#### 3. Setup Cloudflare Tunnel

Install cloudflared:

```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

Authenticate and create tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create zomboid-manager
# Note the tunnel ID
```

Configure tunnel:

```bash
# Create config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: zomboid.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns zomboid-manager zomboid.yourdomain.com

# Install as service
cloudflared service install
systemctl start cloudflared
```

## API Endpoints

### Authentication
- `POST /api/auth` - Login
- `DELETE /api/auth` - Logout

### Servers
- `GET /api/servers` - List servers
- `POST /api/servers` - Add server
- `DELETE /api/servers?name=` - Remove server
- `GET /api/servers/detect` - Auto-detect available servers

### Snapshots
- `GET /api/servers/[name]/snapshots?schedule=` - List snapshots
- `DELETE /api/servers/[name]/snapshots?path=` - Delete snapshot

### Restore
- `POST /api/servers/[name]/restore` - Start restore
- `GET /api/jobs/[id]` - Get restore job status

### Statistics
- `GET /api/servers/[name]/stats` - Server backup statistics

### Configuration
- `GET /api/config` - Get configuration
- `POST /api/config` - Save full configuration
- `PATCH /api/config` - Update partial configuration

## Development

```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## Security Notes

- Always use HTTPS in production (provided by Cloudflare Tunnel)
- Keep your admin password secure
- Change the default SESSION_SECRET
- Consider adding Cloudflare Access for additional authentication layer
- The application runs as root to access Zomboid files - ensure the server is properly secured

## Troubleshooting

### "Failed to load configuration"
- Check that `BACKUP_CONFIG_PATH` points to the correct file
- Ensure the config file is valid JSON

### "Permission denied"
- The application needs read/write access to:
  - Backup config file
  - Snapshots directory
  - Zomboid saves directory

### "Restore failed"
- Check that the restore script exists at `/root/Zomboid/backup-system/bin/restore.sh`
- Ensure the script is executable: `chmod +x restore.sh`
- Check server logs: `journalctl -u zomboid-web-manager -f`

## File Structure

```
zomboid-web-manager/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard page
│   ├── servers/          # Server management
│   ├── backups/          # Backup browser
│   ├── rollback/         # Rollback wizard
│   ├── config/           # Configuration editor
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Login page
│   └── globals.css       # Global styles
├── components/
│   ├── providers/        # React Query provider
│   └── sidebar.tsx       # Navigation sidebar
├── hooks/
│   └── use-api.ts        # React Query hooks
├── lib/
│   ├── api.ts            # API client
│   ├── auth.ts           # Authentication utilities
│   ├── config-manager.ts # Config file operations
│   ├── file-utils.ts     # File system utilities
│   └── snapshot-manager.ts # Backup operations
├── types/
│   └── index.ts          # TypeScript types
├── middleware.ts         # Auth middleware
├── next.config.ts        # Next.js config
└── package.json
```

## License

MIT

## Support

For issues or questions, please check:
- Application logs: `journalctl -u zomboid-web-manager -f`
- Browser console for frontend errors
- API responses in Network tab
