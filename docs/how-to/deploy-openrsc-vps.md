# How To: Deploy Open-RSC on a VPS

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 10 GB SSD | 20 GB SSD |
| Network | Public IPv4 | Static IPv4 |
| Budget | $5/mo (Hetzner CX22) | $12/mo (DO 2vCPU/2GB) |

## Step-by-Step Installation

### 1. Initial Server Setup

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Create a non-root user
adduser openrsc
usermod -aG sudo openrsc

# Switch to the new user
su - openrsc

# Update packages
sudo apt update && sudo apt upgrade -y
```

### 2. Install Java

Open-RSC requires Java 8+. Java 11 or 17 both work. OpenJDK recommended.

```bash
sudo apt install -y openjdk-11-jdk
java -version
# Expected: openjdk version "11.0.x" ...
```

### 3. Install MariaDB

Open-RSC uses MariaDB for player data. SQLite may work for testing.

```bash
sudo apt install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb

# Secure the installation
sudo mysql_secure_installation

# Create the game database
sudo mysql -u root << 'EOF'
CREATE DATABASE fuzzynuts_rsc;
CREATE USER 'openrsc'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON fuzzynuts_rsc.* TO 'openrsc'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 4. Clone Open-RSC

```bash
cd /opt
sudo git clone https://gitlab.com/openrsc/openrsc.git
sudo chown -R openrsc:openrsc /opt/openrsc
cd openrsc
```

**Important:** The default branch is `develop`, not `master`.

### 5. Configure Database Credentials

Edit the `.env` file at the repo root:

```bash
nano /opt/openrsc/.env
```

Set:
```
MARIADB_ROOT_USER=root
MARIADB_ROOT_PASSWORD=<your_root_password>
MARIADB_USER=openrsc
MARIADB_PASS=<CHANGE_ME_STRONG_PASSWORD>
MYSQL_DUMPS_DIR=./Backups
```

### 6. Apply Fuzzynuts Config

**After cloning, copy the config template to `server/local.conf`:**

```bash
# From your local machine (where the monorepo lives):
scp apps/games-build/openrsc/INTEGRATION_NOTES.md openrsc@VPS_IP:/tmp/

# On the VPS — copy the template from the integration notes:
# The local.conf template is in apps/games-build/openrsc/INTEGRATION_NOTES.md
# Copy the YAML block from that file into:
nano /opt/openrsc/server/local.conf
```

Paste the `local.conf` template from `apps/games-build/openrsc/INTEGRATION_NOTES.md`.
The config uses **tab-indented YAML format** (not Java properties with `=`).

**Key config path:** `/opt/openrsc/server/local.conf` (not `server/conf/local.conf`)

### 7. Build and Start the Server

```bash
cd /opt/openrsc
./Start-Linux.sh
```

Select option **1** — "Compile and start the game". This uses Gradle to
build the server, then starts it interactively.

**Note:** The build system is **Gradle**, not Ant. The `Start-Linux.sh`
script handles building and launching.

To run in the background, use `screen`:

```bash
screen -S openrsc
./Start-Linux.sh
# Select option 1
# Press Ctrl+A then D to detach
```

Verify it starts and listens:

```bash
ss -tlnp | grep 43594
# Expected: LISTEN 0  128  0.0.0.0:43594  0.0.0.0:*
```

### 8. Open Firewall Port

```bash
sudo ufw allow 43594/tcp comment "Open-RSC game server"
sudo ufw allow from YOUR_HOME_IP to any port 22 comment "SSH"
sudo ufw enable
sudo ufw status verbose
```

### 9. Systemd Service (Auto-Restart)

```bash
sudo tee /etc/systemd/system/openrsc.service << 'EOF'
[Unit]
Description=Open-RSC Game Server (FuzzyNuts)
After=network.target mariadb.service

[Service]
Type=simple
User=openrsc
Group=openrsc
WorkingDirectory=/opt/openrsc
ExecStart=/usr/bin/java -server -cp "server/build/libs/server-1.0-SNAPSHOT.jar:server/build/libs/*" com.openrsc.server.Server -Dconf=local
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/openrsc

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable openrsc
sudo systemctl start openrsc

# Check status
sudo systemctl status openrsc

# View logs
sudo journalctl -u openrsc -f
```

**[MANUAL CHECK NEEDED]** — The `ExecStart` JAR path depends on the
Gradle build output. After building once with `./Start-Linux.sh`,
check the actual path with: `ls -la /opt/openrsc/server/build/libs/`

### 10. DNS Configuration

Add an A record in your DNS provider:

```
Type:  A
Name:  game.fuzzynuts.xyz
Value: YOUR_VPS_IP
Proxy: DNS ONLY (grey cloud)
TTL:   Auto
```

**CRITICAL**: If using Cloudflare, you MUST disable the proxy (orange cloud)
for this record. Cloudflare only proxies HTTP/HTTPS — raw TCP on port 43594
will be blocked if the proxy is enabled.

The main site (`fuzzynuts.xyz`) can stay behind Cloudflare proxy.

### 11. Nginx Stream Proxy (Optional)

If you want to run the game server behind Nginx (e.g., for logging or
SSL termination of a future management API):

```bash
sudo apt install -y nginx libnginx-mod-stream

sudo tee /etc/nginx/stream.d/openrsc.conf << 'EOF'
upstream openrsc_backend {
    server 127.0.0.1:43594;
}

server {
    listen 43594;
    proxy_pass openrsc_backend;
    proxy_connect_timeout 5s;
    proxy_timeout 300s;
}
EOF

sudo nginx -t && sudo systemctl reload nginx
```

### 12. Verify End-to-End

From your local machine:

```bash
# DNS resolves
dig +short game.fuzzynuts.xyz

# Port is reachable
nc -zv game.fuzzynuts.xyz 43594
```

### 13. Enable the API Endpoint

After the VPS is confirmed working:

1. Set `GAME_SESSION_SECRET` in Railway dashboard
2. Set `OPENRSC_GAME_ENDPOINT=fuzzynuts.xyz:43594` in Railway
3. Remove the 501 guard in `apps/api/src/routes/game-session.ts`
4. Deploy to Railway
5. Test: `curl -X POST https://world.fuzzynuts.xyz/api/auth/game-session`

## Ongoing Maintenance

- **Backups**: `cd /opt/openrsc && make backup-mariadb db=fuzzynuts_rsc`
- **Updates**: `cd /opt/openrsc && git pull && ./Start-Linux.sh` (option 1)
- **Logs**: `/opt/openrsc/server/logs/` and `sudo journalctl -u openrsc`
- **Monitoring**: See `docs/runbooks/monitor-openrsc.md`
