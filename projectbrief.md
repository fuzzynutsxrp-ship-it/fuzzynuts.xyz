# Project Brief: FuzzyNuts & Hermes DevOps

## The "Why" (Mission)
FuzzyNuts is a free-to-play browser arcade built on the XRP Ledger, utilizing the $NUT token. The goal is to deliver a seamless, secure, and highly engaging Web3 gaming experience without the usual crypto friction. 
Internally, this project is managed and built via **Hermes Agent Desktop (Mimo Pro API)**, utilizing a 6-agent DevOps pipeline that audits every commit and routes approvals via Telegram to ensure absolute quality and security control.

## The "What" (Core Product)
- **The Arcade:** Browser-based games where players interact with the $NUT ecosystem.
- **The Token:** $NUT on the XRP Ledger (XRPL), managed via custom `xrpl-token-utils`.
- **The Backend:** Secure session management, reward distribution, anti-cheat mechanics, and game state tracking.

## Target Audience
- Web3 gamers looking for low-friction, casual, or skill-based arcade games.
- The XRP community looking for active, utility-driven ledger projects.

## Core Philosophy & Non-Negotiables
1. **Honesty over agreement:** We do not guess. If an agent or human doesn't know, they state it plainly and verify.
2. **Battle-tested over hype:** We only use established libraries and patterns. No "AI slop," no invented best practices, no unverified hype.
3. **Security first:** This runs on a heavily hardened Linux environment. Code must respect strict boundaries, especially around money, auth, and XRPL payouts.
4. **Human-in-the-loop:** AI agents (Qwen, Mimo) build, write, and audit, but the human (Fuzzynuts) approves via Telegram before anything merges to `main`.

## How Agents Should Use This File
- Read this *first* before starting any task to ensure the work aligns with the arcade's strategic goals.
- If a requested feature doesn't fit the "free-to-play browser arcade" vision, or if it compromises security/performance, push back and ask for clarification.
- Once the business goal is understood, immediately read `ARCHITECT_IMPLEMENTATION.md` to understand how to build it technically.
