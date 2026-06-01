# VPS Deployment Checklist — Open-RSC Game Server

## Prerequisites

- [ ] VPS with Ubuntu 22.04+ (Hetzner, DigitalOcean, AWS Lightsail)
- [ ] Public IPv4 address
- [ ] Budget: $5-20/month (2 vCPU / 2GB RAM minimum)
- [ ] SSH access configured

## Step 1: System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 8+ (OpenJDK recommended)
sudo apt install -y openjdk-11-jdk
java -version  # verify

# Install MariaDB
sudo apt install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb

# Install git
sudo apt install -y git
```

## Step 2: Clone Open-RSC

```bash
cd /opt
sudo git clone https://gitlab.com/openrsc/openrsc.git
sudo chown -R $USER:$USER /opt/openrsc
cd openrsc
```

[MANUAL VERIFICATION REQUIRED] — Check the Open-RSC repo for the exact
clone URL and branch to use. The default branch may be `master` or `main`.

## Step 3: Apply Fuzzynuts Config

The config template is in `apps/games-build/openrsc/INTEGRATION_NOTES.md`.
Copy the YAML block into the local config file:

```bash
# Edit server config (the correct path is server/local.conf, NOT server/conf/local.conf)
nano /opt/openrsc/server/local.conf
```

Apply the overrides from `apps/games-build/openrsc/INTEGRATION_NOTES.md`.
Config uses **tab-indented YAML format** (not Java properties with `=`).

## Step 4: Build the Server

```bash
cd /opt/openrsc
./Start-Linux.sh
```

Select option **1** — "Compile and start the game". This uses Gradle to
build the server JAR, then starts it.

**Note:** The build system is **Gradle**, not Ant.

## Step 5: Open Firewall Port

```bash
# UFW
sudo ufw allow 43594/tcp comment "Open-RSC game server"
sudo ufw enable
sudo ufw status
```

## Step 6: Start the Server (manual test)

```bash
cd /opt/openrsc
./Start-Linux.sh
```

Verify it starts without errors and listens on port 43594:

```bash
ss -tlnp | grep 43594
```

## Step 7: Create Systemd Service (auto-restart)

```bash
sudo tee /etc/systemd/system/openrsc.service << 'EOF'
[Unit]
Description=Open-RSC Game Server (FuzzyNuts)
After=network.target

[Service]
Type=simple
User=openrsc
Group=openrsc
WorkingDirectory=/opt/openrsc
ExecStart=/opt/openrsc/Start-Linux.sh
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/openrsc

[Install]
WantedBy=multi-user.target
EOF

# Create service user
sudo useradd -r -s /bin/false openrsc
sudo chown -R openrsc:openrsc /opt/openrsc

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable openrsc
sudo systemctl start openrsc
sudo systemctl status openrsc
```

## Step 8: DNS Configuration

Add an A record for the game server:

```
Type: A
Name: game.fuzzynuts.xyz
Value: YOUR_VPS_IP
Proxy: DNS ONLY (grey cloud if using Cloudflare)
TTL: Auto
```

**IMPORTANT**: Do NOT enable Cloudflare proxy for this record. TCP port
43594 cannot be proxied through Cloudflare's HTTP/HTTPS-only proxy.

## Step 9: Nginx Stream Proxy (optional)

If you want to serve both web traffic and game traffic on the same domain
with Nginx:

```nginx
# /etc/nginx/stream.d/openrsc.conf
# Requires: sudo apt install nginx libnginx-mod-stream

upstream openrsc_backend {
    server 127.0.0.1:43594;
}

server {
    listen 43594;
    proxy_pass openrsc_backend;
    proxy_connect_timeout 5s;
    proxy_timeout 300s;
}
```

## Step 10: Test End-to-End

1. [ ] VPS running, `ss -tlnp | grep 43594` shows listener
2. [ ] DNS resolves: `dig game.fuzzynuts.xyz` → VPS IP
3. [ ] Port reachable: `nc -zv game.fuzzynuts.xyz 43594`
4. [ ] Download Open_RSC_Client.jar from `/play/rsc`
5. [ ] Client connects to `game.fuzzynuts.xyz:43594`
6. [ ] Player can log in and play

## Step 11: Enable API Endpoint

Once the VPS is live, enable the game-session endpoint on Railway:

1. Set `GAME_SESSION_SECRET` env var in Railway dashboard
2. Set `OPENRSC_GAME_ENDPOINT=fuzzynuts.xyz:43594` in Railway
3. Remove the 501 guard in `apps/api/src/routes/auth.ts`
4. Deploy to Railway
5. Test: `POST /api/auth/game-session` with a valid wallet signature
