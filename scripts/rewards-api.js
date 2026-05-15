#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * FUZZYNUTS ARCADE — Rewards API Routes
 *
 * Drop-in Express router for the Railway backend (Kaetram server).
 * Provides two endpoints for the frontend /profile Prize Claiming UI:
 *
 *   GET  /api/rewards/eligibility?wallet=<address>&week=<YYYY-WNN>
 *   POST /api/rewards/claim       { wallet, week }
 *
 * INSTALLATION:
 *   1. Copy this file into the Kaetram server's routes/ directory
 *   2. In the main Express app (or API entrypoint), add:
 *        const rewardsRouter = require('./routes/rewards-api');
 *        app.use('/api/rewards', rewardsRouter);
 *   3. Ensure these env vars are set on Railway:
 *        MONGO_URL                  - MongoDB connection string
 *        COMMUNITY_NUT_JAR_SEED     - XRPL secret for distribution wallet
 *   4. Ensure `xrpl` is in package.json:
 *        npm install xrpl
 *
 * ═══════════════════════════════════════════════════════════════
 */

const { Router } = require('express');
const { MongoClient } = require('mongodb');

const router = Router();

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const NUT_CURRENCY = 'NUT';
const NUT_ISSUER   = 'rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7';
const XRPL_SERVER  = 'wss://xrplcluster.com';

/** Prize tiers — matches distribute-prizes.js exactly */
const PRIZES = [
  { rank: 1, amount: '250000', label: '1st Place' },
  { rank: 2, amount: '150000', label: '2nd Place' },
  { rank: 3, amount: '100000', label: '3rd Place' },
];

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

/** ISO 8601 week key (e.g., "2026-W20") */
function getCurrentWeekKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Basic XRPL address validation */
function isValidXrplAddress(addr) {
  return typeof addr === 'string' && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr);
}

/** Basic week key validation */
function isValidWeekKey(key) {
  return typeof key === 'string' && /^\d{4}-W\d{2}$/.test(key);
}

/* ═══════════════════════════════════════════════════════════════
   MongoDB Singleton
   ═══════════════════════════════════════════════════════════════ */

let _mongoClient = null;

async function getDb() {
  if (!_mongoClient) {
    const url = process.env.MONGO_URL;
    if (!url) throw new Error('MONGO_URL environment variable is not set');

    _mongoClient = new MongoClient(url, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    await _mongoClient.connect();
    console.log('[Rewards API] Connected to MongoDB');
  }
  return _mongoClient.db();
}

/* ═══════════════════════════════════════════════════════════════
   Shared: Get Top 3 for a week
   ═══════════════════════════════════════════════════════════════ */

/**
 * Query arcade_scores for the given week and return the top 3
 * wallets ranked by total combined score across all games.
 *
 * @param {string} weekKey - ISO 8601 week (e.g., "2026-W20")
 * @returns {Array<{ wallet: string, total: number, rank: number }>}
 */
async function getTopWinners(weekKey) {
  const db = await getDb();
  const scoresCol = db.collection('arcade_scores');

  const scores = await scoresCol.find({ weekKey }).toArray();

  if (scores.length === 0) return [];

  // Aggregate total score per wallet
  const playerMap = new Map();
  for (const entry of scores) {
    if (!entry.wallet) continue; // Skip guest entries
    const existing = playerMap.get(entry.wallet) || 0;
    playerMap.set(entry.wallet, existing + (entry.score || 0));
  }

  // Sort descending, take top 3
  return Array.from(playerMap.entries())
    .map(([wallet, total]) => ({ wallet, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/* ═══════════════════════════════════════════════════════════════
   GET /eligibility?wallet=<address>&week=<YYYY-WNN>
   ═══════════════════════════════════════════════════════════════ */

router.get('/eligibility', async (req, res) => {
  try {
    const { wallet, week } = req.query;

    // Validate wallet
    if (!wallet || !isValidXrplAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid or missing wallet address' });
    }

    // Use provided week or default to current
    const weekKey = (week && isValidWeekKey(week)) ? week : getCurrentWeekKey();

    // Get top 3
    const winners = await getTopWinners(weekKey);
    const match = winners.find(
      (w) => w.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (!match) {
      return res.json({
        eligible: false,
        rank: null,
        game: null,
        prize: null,
        claimed: false,
        txHash: null,
      });
    }

    // Check if already claimed
    const db = await getDb();
    const prizesCol = db.collection('prize_distributions');
    const existingClaim = await prizesCol.findOne({
      weekKey,
      'payouts.wallet': { $regex: new RegExp(`^${wallet}$`, 'i') },
      'payouts.status': 'success',
    });

    // Find the specific payout for this wallet (if bulk distribution exists)
    let claimedTxHash = null;
    if (existingClaim) {
      const payout = existingClaim.payouts.find(
        (p) => p.wallet.toLowerCase() === wallet.toLowerCase() && p.status === 'success'
      );
      claimedTxHash = payout?.txHash || null;
    }

    // Also check individual claims collection
    const individualClaim = await prizesCol.findOne({
      weekKey,
      wallet: { $regex: new RegExp(`^${wallet}$`, 'i') },
      type: 'individual_claim',
      status: 'success',
    });

    const isClaimed = !!existingClaim || !!individualClaim;
    const txHash = claimedTxHash || individualClaim?.txHash || null;
    const prize = PRIZES[match.rank - 1];

    return res.json({
      eligible: true,
      rank: match.rank,
      game: 'combined',
      prize: parseInt(prize.amount, 10),
      claimed: isClaimed,
      txHash,
    });

  } catch (err) {
    console.error('[Rewards API] Eligibility error:', err.message);
    return res.status(500).json({ error: 'Server error — please try again' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /claim
   Body: { wallet: string, week?: string }
   ═══════════════════════════════════════════════════════════════ */

router.post('/claim', async (req, res) => {
  try {
    const { wallet, week } = req.body || {};

    // ── Validate input ──

    if (!wallet || !isValidXrplAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid or missing wallet address' });
    }

    const weekKey = (week && isValidWeekKey(week)) ? week : getCurrentWeekKey();

    // ── Verify COMMUNITY_NUT_JAR_SEED is available ──

    const seed = process.env.COMMUNITY_NUT_JAR_SEED;
    if (!seed) {
      console.error('[Rewards API] COMMUNITY_NUT_JAR_SEED not set');
      return res.status(503).json({ error: 'Reward distribution is temporarily unavailable' });
    }

    // ── Re-verify eligibility (defense in depth) ──

    const winners = await getTopWinners(weekKey);
    const match = winners.find(
      (w) => w.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (!match) {
      return res.status(403).json({ error: 'Wallet is not in the Top 3 for this week' });
    }

    const prize = PRIZES[match.rank - 1];
    if (!prize) {
      return res.status(403).json({ error: 'No prize tier for this rank' });
    }

    // ── Check for double claim ──

    const db = await getDb();
    const prizesCol = db.collection('prize_distributions');

    const existingClaim = await prizesCol.findOne({
      weekKey,
      wallet: { $regex: new RegExp(`^${wallet}$`, 'i') },
      type: 'individual_claim',
      status: 'success',
    });

    if (existingClaim) {
      return res.status(409).json({
        error: 'Reward already claimed',
        txHash: existingClaim.txHash,
      });
    }

    // Also check bulk distribution records
    const bulkDist = await prizesCol.findOne({
      weekKey,
      'payouts.wallet': { $regex: new RegExp(`^${wallet}$`, 'i') },
      'payouts.status': 'success',
    });

    if (bulkDist) {
      const payout = bulkDist.payouts.find(
        (p) => p.wallet.toLowerCase() === wallet.toLowerCase() && p.status === 'success'
      );
      return res.status(409).json({
        error: 'Reward already distributed via weekly batch',
        txHash: payout?.txHash || null,
      });
    }

    // ── Insert pending claim record (atomic lock) ──

    const claimRecord = {
      type: 'individual_claim',
      weekKey,
      wallet,
      rank: match.rank,
      amount: prize.amount,
      score: match.total,
      status: 'pending',
      createdAt: new Date(),
      txHash: null,
    };

    // Use upsert to prevent race conditions
    const lockResult = await prizesCol.updateOne(
      {
        weekKey,
        wallet: { $regex: new RegExp(`^${wallet}$`, 'i') },
        type: 'individual_claim',
      },
      { $setOnInsert: claimRecord },
      { upsert: true }
    );

    // If doc already existed (wasn't inserted), another request beat us
    if (!lockResult.upsertedId) {
      const existing = await prizesCol.findOne({
        weekKey,
        wallet: { $regex: new RegExp(`^${wallet}$`, 'i') },
        type: 'individual_claim',
      });
      if (existing?.status === 'success') {
        return res.status(409).json({ error: 'Reward already claimed', txHash: existing.txHash });
      }
      // If it's still pending from another request, let this one proceed
    }

    // ── Execute XRPL Payment ──

    let xrpl;
    try {
      xrpl = require('xrpl');
    } catch {
      await prizesCol.updateOne(
        { weekKey, wallet: { $regex: new RegExp(`^${wallet}$`, 'i') }, type: 'individual_claim' },
        { $set: { status: 'error', error: 'xrpl module not installed' } }
      );
      return res.status(500).json({ error: 'XRPL module not available on server' });
    }

    const xrplClient = new xrpl.Client(XRPL_SERVER);

    try {
      await xrplClient.connect();
      console.log(`[Rewards API] Connected to XRPL for claim: ${wallet} W${weekKey} R${match.rank}`);

      const distributorWallet = xrpl.Wallet.fromSeed(seed);

      const payment = {
        TransactionType: 'Payment',
        Account: distributorWallet.address,
        Destination: wallet,
        Amount: {
          currency: NUT_CURRENCY,
          issuer: NUT_ISSUER,
          value: prize.amount,
        },
        Memos: [{
          Memo: {
            MemoType: Buffer.from('fuzzynuts-arcade-prize', 'utf8').toString('hex').toUpperCase(),
            MemoData: Buffer.from(
              `Fuzzynuts Reward W${weekKey} R${match.rank} Score:${match.total}`,
              'utf8'
            ).toString('hex').toUpperCase(),
          },
        }],
      };

      const prepared = await xrplClient.autofill(payment);
      const signed = distributorWallet.sign(prepared);
      const result = await xrplClient.submitAndWait(signed.tx_blob);

      const txResult = result.result.meta?.TransactionResult;
      const txHash = result.result.hash;

      if (txResult === 'tesSUCCESS') {
        // ── Update claim record ──
        await prizesCol.updateOne(
          { weekKey, wallet: { $regex: new RegExp(`^${wallet}$`, 'i') }, type: 'individual_claim' },
          {
            $set: {
              status: 'success',
              txHash,
              completedAt: new Date(),
              xrplResult: txResult,
            },
          }
        );

        console.log(`[Rewards API] ✅ Claim successful: ${txHash}`);
        return res.json({ success: true, txHash });

      } else {
        // XRPL rejected the transaction
        await prizesCol.updateOne(
          { weekKey, wallet: { $regex: new RegExp(`^${wallet}$`, 'i') }, type: 'individual_claim' },
          {
            $set: {
              status: 'failed',
              error: txResult,
              completedAt: new Date(),
            },
          }
        );

        console.error(`[Rewards API] ❌ XRPL rejected: ${txResult}`);
        return res.status(502).json({ error: `XRPL transaction failed: ${txResult}` });
      }

    } catch (xrplErr) {
      // Network / timeout / signing error
      await prizesCol.updateOne(
        { weekKey, wallet: { $regex: new RegExp(`^${wallet}$`, 'i') }, type: 'individual_claim' },
        {
          $set: {
            status: 'error',
            error: xrplErr.message,
            completedAt: new Date(),
          },
        }
      );

      console.error(`[Rewards API] ❌ XRPL error: ${xrplErr.message}`);
      return res.status(502).json({ error: 'XRPL network error — please try again later' });

    } finally {
      try { await xrplClient.disconnect(); } catch {}
    }

  } catch (err) {
    console.error('[Rewards API] Claim error:', err.message);
    return res.status(500).json({ error: 'Server error — please try again' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   Graceful shutdown
   ═══════════════════════════════════════════════════════════════ */

process.on('SIGTERM', async () => {
  if (_mongoClient) {
    await _mongoClient.close();
    console.log('[Rewards API] MongoDB connection closed');
  }
});

module.exports = router;
