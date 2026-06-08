# Open-RSC Admin Command Reference

FuzzyNuts RSC Server — Admin & Staff Command Reference

## Server Info

| Property | Value |
|---|---|
| VPS IP | 67.205.132.6 |
| Game Port (TCP) | 43594 |
| Game Port (WebSocket) | 43494 |
| Database Path | `/opt/openrsc/server/inc/sqlite/preservation.db` |
| Item Definitions | `/opt/openrsc/server/conf/server/defs/ItemDefs.json` |
| Server Config | `/opt/openrsc/server/local.conf` |
| Full Config | `/opt/openrsc/server/preservation.conf` |

---

## 1. Item & Economy Commands

### Spawn Item to Inventory

```
::item [id] [amount]
```

Give yourself an item by its ID. Amount defaults to 1 if omitted.

```
::item 10 1000000
```

Gives yourself 1,000,000 coins.

```
::item 10 1000000 PlayerName
```

Gives 1,000,000 coins to another player.

### Spawn Noted/Certed Item

```
::certeditem [id] [amount]
```

Same as `::item` but the item is noted (stackable certificate).

### Spawn Item to Bank

```
::bankitem [id] [amount]
```

Adds an item directly to your bank.

```
::bankitem 10 1000000
```

Adds 1,000,000 coins to your bank.

Aliases: `::bitem`, `::addbank`

### Fill Bank with All Items

```
::fillbank
```

Fills your bank with one of every item. Use with caution.

```
::unfillbank
```

Removes everything from your bank.

### Remove Items

```
::ritem [id] [amount]
```

Removes an item from your inventory.

```
::rbitem [id] [amount]
```

Removes an item from your bank.

```
::wipeinventory [player]
```

Wipes a player's entire inventory.

```
::wipebank [player]
```

Wipes a player's entire bank.

---

## 2. Teleport Commands

All teleport commands require Admin rank or above.

### Teleport to Town

```
::teleport [town]
```

Teleports you to a named town.

```
::tp varrock
::tele falador
::town lumbridge
```

Short aliases: `::tp`, `::tele`, `::town`, `::goto`

### Teleport to Coordinates

```
::teleport [x] [y]
```

Teleports you to exact map coordinates.

```
::tp 120 648
```

Teleports to Lumbridge (120, 648).

### Teleport to Player

```
::teleport [PlayerName]
```

Teleports you to another player's location.

```
::goto Fuzzynuts
```

### Available Town Names

| Town | Alias | Coords |
|---|---|---|
| varrock | — | 122, 509 |
| falador | — | 304, 542 |
| lumbridge | — | 120, 648 |
| draynor | — | 214, 632 |
| portsarim | — | 269, 643 |
| karamja | — | 370, 685 |
| alkharid | — | 89, 693 |
| edgeville | — | 217, 449 |
| castle | — | 270, 352 |
| taverly | — | 373, 498 |
| clubhouse | — | 653, 491 |
| seers | — | 501, 450 |
| barbarian | — | 233, 513 |
| rimmington | — | 325, 663 |
| catherby | — | 440, 501 |
| ardougne | — | 549, 589 |
| yanille | — | 583, 747 |
| lostcity | — | 127, 3518 |
| gnome | — | 703, 527 |
| shilovillage | — | 400, 850 |
| tutorial | — | 217, 740 |
| modroom | — | 75, 1641 |
| entrana | — | 425, 564 |
| waterfall | — | 659, 3302 |
| zanaris | — | 127, 3518 |
| gertrude | — | 160, 515 |
| fishingguild | — | 587, 503 |
| taibwowannai | — | 447, 749 |
| brimhaven | — | 446, 694 |
| shantay | — | 62, 729 |
| trawler | — | 549, 702 |
| observatory | — | 713, 697 |
| crandor | — | 419, 625 |
| icemountain | — | 288, 461 |
| champion | — | 151, 556 |
| hero | — | 372, 438 |
| digsite | — | 20, 527 |
| legend | — | 513, 543 |
| volcano | — | 413, 693 |

---

## 3. Combat & Stats Commands

### Set All Stats

```
::stat [level]
```

Sets all combat and skill stats to the specified level.

```
::stat 99
```

Maxes all stats to 99.

### Set Specific Stat

```
::stat [level] [stat_name]
```

Sets a single stat to a level.

```
::stat 99 attack
```

### Set Stats for Another Player

```
::stat [player] [level]
```

### Heal

```
::heal
```

Restores your hitpoints to full.

```
::heal PlayerName
```

Heals another player.

### Beast Mode

```
::beastmode
```

Spawns best-in-slot gear into your inventory.

### Set HP

```
::hp [amount]
```

Sets your current hitpoints to a specific value.

Aliases: `::sethp`, `::hits`, `::sethits`

### Prayer

```
::recharge
```

Restores prayer points.

Aliases: `::healprayer`, `::healp`

---

## 4. Utility Commands

### Show Coordinates

```
::coords
```

Displays your current X, Y map coordinates. Works for ALL players (no admin required).

### Quick Bank

```
::quickbank
```

Opens your bank from anywhere. No need to find a bank booth.

### Save All

```
::saveall
```

Force-saves all online players to the database.

---

## 5. Database Management (SSH Commands)

These commands are run via SSH to the VPS, not in-game.

### Backup Database

```bash
ssh root@67.205.132.6 "cp /opt/openrsc/server/inc/sqlite/preservation.db /root/preservation_backup_\$(date +%Y%m%d_%H%M%S).db"
```

### List All Players

```bash
ssh root@67.205.132.6 "sqlite3 /opt/openrsc/server/inc/sqlite/preservation.db 'SELECT id, username, group_id FROM players;'"
```

### Promote Player to Admin

```bash
ssh root@67.205.132.6 "sqlite3 /opt/openrsc/server/inc/sqlite/preservation.db \"UPDATE players SET group_id = 1 WHERE username = 'PlayerName';\""
```

Player must log out and back in for the change to take effect.

### Demote Player to User

```bash
ssh root@67.205.132.6 "sqlite3 /opt/openrsc/server/inc/sqlite/preservation.db \"UPDATE players SET group_id = 10 WHERE username = 'PlayerName';\""
```

### Restart Game Server

```bash
ssh root@67.205.132.6 "kill \$(pgrep -f 'com.openrsc.server.Server') && sleep 2 && cd /opt/openrsc/server && nohup java -Xmx512M -cp core.jar:plugins.jar:lib/* com.openrsc.server.Server local.conf > /dev/null 2>&1 &"
```

Note: There is no systemd service. The server runs as a plain Java process.

### Check Server Status

```bash
ssh root@67.205.132.6 "ps aux | grep 'java.*core.jar' | grep -v grep"
```

### Tail Server Logs

```bash
ssh root@67.205.132.6 "tail -f /opt/openrsc/server/logs/fuzzynuts_1.log"
```

---

## 6. Rank System Reference

| Group ID | Name | In-Game Prefix | Key Permissions |
|---|---|---|---|
| 0 | Owner | @dcy@ (gold) | Full control, all commands |
| 1 | Admin | @gre@ (green) | Items, stats, teleport, bank, spawn |
| 2 | Super Moderator | @blu@ (blue) | Mod tools + some admin |
| 3 | Moderator | @bl1@ (light blue) | Mute, ban, kick, ip lookup |
| 5 | Developer | @red@ (red) | Dev tools, NPC/object spawning |
| 7 | Event | @eve@ (event color) | Teleport, invisibility, invulnerability |
| 8 | Player Moderator | — | Limited mod tools |
| 9 | Tester | — | Testing access |
| 10 | User | — | Normal player (default) |

### Permission Hierarchy

```
Owner > Admin > Super Mod > Mod > Dev > Event > Player Mod > Tester > User
```

Each higher rank inherits all permissions of the ranks below it.

---

## 7. Item ID Quick Reference

| ID | Name |
|---|---|
| 10 | Coins |
| 0 | Iron Mace |
| 1 | Iron Short Sword |
| 2 | Iron Kite Shield |
| 9 | Iron Plate Mail Legs |
| 11 | Bronze Arrows |
| 12 | Iron Axe |

Full item list: `docs/reference/openrsc-items.md` (1,290 items)

---

*Last updated: 2026-06-07*
