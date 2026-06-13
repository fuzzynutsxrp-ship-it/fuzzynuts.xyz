# FuzzyNuts Discord Integration Plan

## Phase 1: Discord Server Architecture

### Server Structure (Web2 Gaming Portal Optimized)

```
📢 ANNOUNCEMENTS
├── #announcements        ← Read-only. Dev updates, new game launches, maintenance windows.
└── #patch-notes          ← Read-only. Version notes for game updates.

🏆 TOURNAMENTS
├── #weekly-winners       ← Automated feed. Bot posts Top 3 every Monday 00:00 UTC.
└── #leaderboard-discuss  ← Open discussion about rankings, strategies, scores.

🎮 GAMES
├── #game-chat            ← General discussion. The main hangout channel.
├── #fuzzynuts-world      ← Fuzzynuts World specific discussion (flagship game).
├── #super-fuzzynuts      ← Super Fuzzynuts / platformer discussion.
└── #rsc-classic          ← RuneScape Classic discussion (high-engagement community).

🐛 FEEDBACK
├── #bug-reports          ← Structured bug reporting. Bot auto-tags with game name.
└── #feature-requests     ← Upvote-style feature requests.

💰 WEB3 (Optional — 5% of users)
└── #web3-rewards         ← $NUT prize claims, wallet help, XRPL questions.

🔊 VOICE (Optional — future)
├── 🎙️ General Voice
└── 🎙️ Game Night Voice
```

### Channel Settings

| Channel              | Permissions                  | Slow Mode |
| -------------------- | ---------------------------- | --------- |
| #announcements       | Read-only (admin posts only) | None      |
| #patch-notes         | Read-only                    | None      |
| #weekly-winners      | Read-only (bot posts only)   | None      |
| #leaderboard-discuss | @everyone can post           | 5s        |
| #game-chat           | @everyone can post           | None      |
| #fuzzynuts-world     | @everyone can post           | None      |
| #super-fuzzynuts     | @everyone can post           | None      |
| #rsc-classic         | @everyone can post           | None      |
| #bug-reports         | @everyone can post           | 30s       |
| #feature-requests    | @everyone can post           | 30s       |
| #web3-rewards        | @everyone can post           | 10s       |

### Roles

| Role        | Color            | Purpose                                   |
| ----------- | ---------------- | ----------------------------------------- |
| @everyone   | Default          | Base access to all public channels        |
| 🏆 Champion | Gold (#FBBF24)   | Auto-assigned to weekly Top 3 winners     |
| 🎮 Gamer    | Green (#4ade80)  | Verified players (played at least 1 game) |
| 🐿️ OG       | Purple (#a855f7) | Early adopters / first 100 members        |
| 👑 Admin    | Red (#ef4444)    | Server administrators                     |
| 🤖 Bot      | Blue (#3b82f6)   | FuzzyNuts bot account                     |

### Invite Link

Generate a permanent invite link with:

- **Settings → Invites → Create Link**
- Set to **Never Expire**
- Set max uses to **No Limit**
- Grant: `View Channel`, `Send Messages`, `Read Message History`
- Save as `DISCORD_INVITE_URL` env var

---

## Phase 2: Bot & Webhook Integration

### Bot Recommendation

**Custom webhook** (not MEE6/Statbot) — because:

1. We already have MongoDB with score data
2. We already have `node-cron` in the API
3. We already have `DISCORD_WEBHOOK_URL` in server.ts
4. No third-party bot permissions to manage
5. Full control over message format and timing

### Webhook Setup Steps

1. Go to **#weekly-winners** channel → **Integrations** → **Webhooks**
2. Click **New Webhook**
3. Name it `FuzzyNuts Tournaments`
4. Copy the **Webhook URL**
5. Add to Railway as env var: `DISCORD_WEEKLY_WINNERS_WEBHOOK_URL`

### Cron Job: `apps/api/src/cron/weekly-discord-winners.ts`

Schedule: `0 0 * * 1` (Every Monday at 00:00 UTC)

- Matches the leaderboard reset timer exactly
- Queries `arcade_scores` for the just-completed week
- Fetches Top 3 by total score across all games
- Resolves player names from `wallet_mappings` collection
- Posts rich embed to #weekly-winners via webhook

### Environment Variables Needed

| Variable                             | Where          | Purpose                                 |
| ------------------------------------ | -------------- | --------------------------------------- |
| `DISCORD_WEEKLY_WINNERS_WEBHOOK_URL` | Railway        | Webhook URL for #weekly-winners channel |
| `DISCORD_INVITE_URL`                 | Railway / .env | Permanent invite link for the server    |

---

## Phase 3: Homepage Linkage

### Current State

- Footer has Discord link: `https://discord.gg/fuzzynuts` ✓
- Community section has Discord link ✓
- GameModal sidebar has NO Discord CTA ✗

### Changes Needed

1. Add Discord CTA banner to GameModal sidebar (between game cards and live chat)
2. CTA text: "Join 500+ players on Discord →"
3. Opens in new tab, tracks engagement

---

## Implementation Files

| File                                                | Purpose                                    |
| --------------------------------------------------- | ------------------------------------------ |
| `apps/api/src/cron/weekly-discord-winners.ts`       | Cron job — posts weekly winners to Discord |
| `apps/web-arcade/src/components/game/GameModal.tsx` | Add Discord CTA to sidebar                 |
| `apps/api/src/server.ts`                            | Wire up the new cron job                   |

## Rollout Checklist

- [ ] Create Discord server with channels above
- [ ] Generate webhook URL for #weekly-winners
- [ ] Add `DISCORD_WEEKLY_WINNERS_WEBHOOK_URL` to Railway
- [ ] Add `DISCORD_INVITE_URL` to Railway
- [ ] Deploy cron job
- [ ] Verify Monday 00:00 UTC post
- [ ] Add Discord CTA to GameModal
- [ ] Test invite link from Footer
