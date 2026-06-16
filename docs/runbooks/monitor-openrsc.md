# Runbook: Monitor Open-RSC Game Server

## Quick Reference

| What           | Where | Check                                             |
| -------------- | ----- | ------------------------------------------------- |
| Server process | VPS   | `sudo systemctl status openrsc`                   |
| Game logs      | VPS   | `/opt/openrsc/server/logs/`                       |
| System logs    | VPS   | `sudo journalctl -u openrsc --since "1 hour ago"` |
| Port listener  | VPS   | `ss -tlnp \| grep 43594`                          |
| DNS resolution | Any   | `dig +short game.fuzzynuts.xyz`                   |
| Port reachable | Any   | `nc -zv game.fuzzynuts.xyz 43594`                 |

## Alert Thresholds

### Critical (respond immediately)

- **Server crash**: `systemctl status openrsc` shows "failed"
  - Action: `sudo systemctl restart openrsc`, check logs for root cause
- **Port unreachable**: `nc -zv game.fuzzynuts.xyz 43594` fails
  - Action: check firewall (`sudo ufw status`), check process, check DNS
- **Disk full**: `df -h` shows >95% on any partition
  - Action: clean logs, check for log rotation

### Warning (respond within 1 hour)

- **Auth failures > 10/min**: High rate of failed connections may indicate
  brute-force or session token abuse
  - Action: check logs for patterns, consider IP blocking
- **Memory usage > 80%**: `free -h` shows low available memory
  - Action: check for memory leaks, consider upgrading VPS
- **High CPU > 80% sustained**: `top` or `htop` shows sustained load
  - Action: check player count, consider horizontal scaling

### Info (review daily)

- **Player count trends**: note peak hours, growth patterns
- **Log rotation**: verify logs aren't growing unbounded
- **Backup success**: verify `make backup db=local` runs without errors

## Log Locations

```
/opt/openrsc/server/logs/
├── server.log          # Main game server log
├── connections.log     # Player connection/disconnection events
├── chat.log            # In-game chat (if enabled)
└── error.log           # Error stacktraces
```

[MANUAL VERIFICATION REQUIRED] — The exact log file names depend on your
Open-RSC version. Run `ls -la /opt/openrsc/server/logs/` after first start.

## Useful Commands

```bash
# Tail game server logs in real-time
sudo journalctl -u openrsc -f

# Count connections in last hour
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" /opt/openrsc/server/logs/connections.log | wc -l

# Check for errors
tail -100 /opt/openrsc/server/logs/error.log | grep -i error

# Memory usage
free -h

# Disk usage
df -h

# Network connections on game port
ss -tnp | grep 43594 | wc -l
```

## Backup

Open-RSC has a built-in backup command:

```bash
cd /opt/openrsc
make backup db=local
```

[MANUAL VERIFICATION REQUIRED] — verify this command exists in your version.
Backups are stored in `/opt/openrsc/backups/` by default.

Schedule daily backups with cron:

```bash
crontab -e
# Add:
0 3 * * * cd /opt/openrsc && make backup db=local >> /var/log/openrsc-backup.log 2>&1
```

## Emergency Procedures

### Server Won't Start

1. Check logs: `sudo journalctl -u openrsc --since "5 min ago" -n 50`
2. Check Java: `java -version` (must be 11)
3. Check config: `cat /opt/openrsc/server/conf/local.conf`
4. Check disk: `df -h`
5. Try manual start: `cd /opt/openrsc && ./Start-Linux.sh`

### Suspicious Activity

1. Check connections: `ss -tnp | grep 43594`
2. Block suspicious IP: `sudo ufw deny from SUSPICIOUS_IP`
3. Review auth logs: `grep "auth" /opt/openrsc/server/logs/*.log`
4. If compromise suspected: stop server, snapshot VPS, investigate

### DNS Issues

1. Verify A record: `dig +short game.fuzzynuts.xyz`
2. Check Cloudflare: ensure proxy is OFF (grey cloud) for game subdomain
3. Test direct IP: `nc -zv VPS_IP 43594`
4. Flush DNS: `sudo systemd-resolve --flush-caches` (local machine)
