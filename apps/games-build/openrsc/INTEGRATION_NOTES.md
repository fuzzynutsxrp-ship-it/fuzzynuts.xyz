# Open-RSC Integration Notes for Fuzzynuts.xyz

## Where Open-RSC Files Will Live

After running `git clone https://gitlab.com/openrsc/openrsc.git` on the VPS,
the server tree will be at whatever path you choose, typically:

```
/opt/openrsc/               # recommended VPS path
├── server/
│   ├── default.conf        # base config (DO NOT EDIT)
│   ├── preservation.conf   # preset: authentic RSC
│   ├── rsccabbage.conf     # preset: custom RSC
│   ├── local.conf          # YOUR overrides go here (copy from a preset)
│   ├── conf/server/        # additional config (data, defs, fonts, languages)
│   └── logs/
├── Client_Base/            # client source
├── PC_Client/              # desktop client
├── Makefile                # build + backup commands
├── Start-Linux.sh          # interactive launcher
└── .env                    # MariaDB credentials
```

**This directory (apps/games-build/openrsc/) holds config templates only.**
The actual Open-RSC source tree lives on the VPS, not in the monorepo.

## Build System

Open-RSC uses **Gradle** (not Ant). The `Start-Linux.sh` script handles
building and launching interactively. Options:

1. "Compile and start the game" — builds with Gradle then starts
2. "Start the game" — starts without rebuilding (faster)
3. "Backup database" — creates a MariaDB dump
4. "Perform a fresh install" — sets up database + initial data

Java 8+ is required (OpenJDK recommended). Java 11 works, Java 17+ also works.

## Config Format

Open-RSC config uses a **tab-indented YAML-like format**, NOT Java properties.
Keys are under section headers (e.g., `world:`, `database:`). Indentation
MUST use tabs, not spaces.

## Local Config Template

Copy this to `server/local.conf` on the VPS to override `server/default.conf`.
This is a working config for FuzzyNuts.xyz.

**Source:** Verified against `server/default.conf` on the `develop` branch
(commit fc74d38e, April 2026).

```yaml
# ═══════════════════════════════════════════════════════════
#  FuzzyNuts RSC — local.conf overrides
#  Copy this file to: /opt/openrsc/server/local.conf
#  Then restart the server for changes to take effect.
# ═══════════════════════════════════════════════════════════

database:
	db_name: fuzzynuts_rsc

world:
	# Server identity
	server_name: FuzzyNuts                    # Login prompt + friends list
	server_name_welcome: FuzzyNuts RSC        # Client welcome screen
	welcome_text: Connect your XRP wallet for rewards!
	display_logo_sprite: true

	# Network
	server_port: 43594                         # TCP game port
	ws_server_port: 43494                      # WebSocket port
	want_feature_websockets: true
	max_connections_per_ip: 20
	max_connections_per_second: 20
	max_packets_per_second: 100
	max_logins_per_second: 2
	max_password_guesses_per_five_minutes: 10
	network_flood_ip_ban_minutes: 5

	# Players
	max_players: 200
	max_players_per_ip: 5
	member_world: true
	world_number: 1
	player_level_limit: 99

	# Game tick (640ms is authentic RSC speed)
	game_tick: 640
	walking_tick: 640
	want_custom_walking_speed: false

	# Experience rates (1.0 = authentic)
	combat_exp_rate: 1
	skilling_exp_rate: 1
	wilderness_boost: 0
	skull_boost: 0
	double_exp: false

	# Gameplay
	want_fatigue: true
	features_sleep: true
	npc_respawn_multiplier: 1.0
	want_registration_limit: true
	registration_limit_count: 3

	# Anti-abuse
	idle_timer: 300000                         # 5 min idle alert
	connection_timeout: 15
	packet_limit: 100
	connection_limit: 10

	# Autosave
	auto_save: 30000                           # 30 seconds

	# Tutorial
	show_tutorial_skip_option: true
	skip_tutorial_gives_items: false

	# Client
	client_version: 10009
	enforce_custom_client_version: false

	# Location
	server_location: USA
	location_data: 0                           # Preservation spawn data
	based_map_data: 64
	based_config_data: 85

	# Respawn
	respawn_location_x: 120
	respawn_location_y: 648

	# Logging
	want_pcap_logging: true

	# [VERIFY IN REPO] — these keys may not exist in all versions:
	# want_auto_server_shutdown: false
	# restart_hour: 7
	# avatar_generator: false
	# check_admin_ip: false
	# admin_ip: 127.0.0.0,10.0.0.0,172.16.0.0,192.168.0.0
	# is_localhost_restricted: false
	# restrict_item_id: 1289
	# restrict_scenery_id: 1188
```

## Database

Open-RSC uses **MariaDB** (MySQL-compatible). Credentials are in the `.env` file
at the repo root:

```bash
# .env (at /opt/openrsc/.env)
MARIADB_ROOT_USER=root
MARIADB_ROOT_PASSWORD=<generate-a-strong-password>
MARIADB_USER=user
MARIADB_PASS=pass
MYSQL_DUMPS_DIR=./Backups
```

For a small server (< 100 players), the default SQLite option may also work.
[VERIFY IN REPO] — check if `db_name` supports SQLite in your version.

## Port Requirements

| Port  | Protocol | Purpose              | Firewall            |
| ----- | -------- | -------------------- | ------------------- |
| 43594 | TCP      | Game client connect  | MUST be open        |
| 43494 | TCP      | WebSocket (optional) | Open if using WS    |
| 22    | TCP      | SSH admin            | Restrict to your IP |

## Firewall Notes

```bash
# UFW example (Ubuntu)
sudo ufw allow 43594/tcp comment "Open-RSC game server"
sudo ufw allow from YOUR_IP to any port 22 comment "SSH admin"

# Verify
sudo ufw status verbose
```

## Cloudflare Warning

If your domain uses Cloudflare, you MUST create a **DNS-only** A record
for `game.fuzzynuts.xyz`. Cloudflare's proxy (orange cloud) does NOT
support raw TCP connections on port 43594 — it only proxies HTTP/HTTPS.

```
game.fuzzynuts.xyz  →  YOUR_VPS_IP  (DNS only, grey cloud)
```

The web frontend at `fuzzynuts.xyz` can stay behind Cloudflare proxy.
Only the game subdomain needs DNS-only.

## Backup

Open-RSC uses the Makefile for backups:

```bash
cd /opt/openrsc
make backup-mariadb db=fuzzynuts_rsc
```

Backups are stored in the `Backups/` directory (configurable via `.env`).

## Source Reference

- Repo: https://gitlab.com/openrsc/openrsc (branch: `develop`)
- Default config: `server/default.conf`
- Preset configs: `server/preservation.conf`, `server/rsccabbage.conf`
- Build: Gradle via `Start-Linux.sh` (option 1: compile + start)
- License: GNU AGPLv3
