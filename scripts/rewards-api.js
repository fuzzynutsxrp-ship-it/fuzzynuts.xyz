#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * FUZZYNUTS ARCADE — Rewards API Routes
 *
 * Drop-in Express router for the Railway backend (Fuzzynuts World server).
 * Provides two endpoints for the frontend /profile Prize Claiming UI:
 *
 *   GET  /api/rewards/eligibility?wallet=<address>&week=<YYYY-WNN>
 *   POST /api/rewards/claim       { wallet, week }
 *
 * INSTALLATION:
 *   1. Copy this file into the Fuzzynuts World server's routes/ directory
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
const NUT_ISSUER   = process.env.NUT_ISSUER || 'rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7';
const XRPL_SERVER  = process.env.XRPL_SERVER || 'wss://xrplcluster.com';

/** Announced weekly prize values in USD. NUT amounts are computed at snapshot. */
const PRIZE_USD_TIERS = [
  { rank: 1, usd: Number(process.env.PRIZE_USD_1 || 250), label: '1st Place' },
  { rank: 2, usd: Number(process.env.PRIZE_USD_2 || 150), label: '2nd Place' },
  { rank: 3, usd: Number(process.env.PRIZE_USD_3 || 100), label: '3rd Place' },
];

/** Soft cap on total NUT emitted per week (protects the Community Nut Jar).
 *  Default 2x the legacy 500k fixed pool. */
const MAX_WEEKLY_NUT_EMISSION = Number(process.env.MAX_WEEKLY_NUT_EMISSION || 1_000_000);

/** NUT AMM pool counter-asset. Default XRP. For a USD-stable pair, set
 *  NUT_AMM_COUNTER_CURRENCY/ISSUER and NUT_AMM_COUNTER_IS_XRP=false. */
const NUT_AMM_COUNTER_IS_XRP   = (process.env.NUT_AMM_COUNTER_IS_XRP ?? 'true') === 'true';
const NUT_AMM_COUNTER_CURRENCY = process.env.NUT_AMM_COUNTER_CURRENCY || null;
const NUT_AMM_COUNTER_ISSUER   = process.env.NUT_AMM_COUNTER_ISSUER || null;

/** On-chain XRP→USD reference AMM, used only when NUT is XRP-paired. Default RLUSD. */
const USD_REF_CURRENCY = process.env.USD_REF_CURRENCY || 'RLUSD';
const USD_REF_ISSUER   = process.env.USD_REF_ISSUER   || 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';

/** Off-chain fallback (USD per NUT). Used ONLY if the on-chain AMM query fails. */
const NUT_USD_PRICE_FALLBACK = process.env.NUT_USD_PRICE_FALLBACK
  ? Number(process.env.NUT_USD_PRICE_FALLBACK)
  : null;

/** Shared secret guarding the announcement-time snapshot endpoint. */
const REWARDS_ADMIN_SECRET = process.env.REWARDS_ADMIN_SECRET || null;

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
   Price snapshot (announcement-time only)
   ═══════════════════════════════════════════════════════════════ */

/** Price of `base` denominated in `counter` from an XRPL AMM pool.
 *  XRP assets are passed as { currency: 'XRP' } (no issuer). */
async function ammPrice(client, base, counter) {
  const info = await client.request({ command: 'amm_info', asset: base, asset2: counter });
  const amm = info.result && info.result.amm;
  if (!amm) throw new Error('amm_info returned no pool');

  const toNum = (x) => (typeof x === 'string' ? Number(x) / 1_000_000 : Number(x.value)); // drops→XRP
  const isXrp = (a) => a.currency === 'XRP' && !a.issuer;
  const matches = (amt, asset) =>
    typeof amt === 'string' ? isXrp(asset)
    : (amt.currency === asset.currency && amt.issuer === asset.issuer);

  const baseAmt    = matches(amm.amount, base) ? toNum(amm.amount)  : toNum(amm.amount2);
  const counterAmt = matches(amm.amount, base) ? toNum(amm.amount2) : toNum(amm.amount);
  if (!(baseAmt > 0) || !(counterAmt > 0)) throw new Error('Empty AMM reserves');
  return counterAmt / baseAmt; // counter units per 1 base
}

/** Primary on-chain NUT/USD price. NUT/XRP × XRP/USD when XRP-paired,
 *  else NUT/<stable> directly. Throws on failure (caller decides fallback). */
async function fetchNutUsdPrice() {
  let xrpl;
  try { xrpl = require('xrpl'); } catch { throw new Error('xrpl module not available'); }
  const client = new xrpl.Client(XRPL_SERVER);
  try {
    await client.connect();
    const NUT = { currency: NUT_CURRENCY, issuer: NUT_ISSUER };
    if (NUT_AMM_COUNTER_IS_XRP) {
      const nutInXrp = await ammPrice(client, NUT, { currency: 'XRP' });               // XRP per NUT
      const xrpInUsd = await ammPrice(client, { currency: 'XRP' },
        { currency: USD_REF_CURRENCY, issuer: USD_REF_ISSUER });                        // USD per XRP
      return { price: nutInXrp * xrpInUsd, source: `amm:NUT/XRP*XRP/${USD_REF_CURRENCY}` };
    }
    const nutInUsd = await ammPrice(client, NUT,
      { currency: NUT_AMM_COUNTER_CURRENCY, issuer: NUT_AMM_COUNTER_ISSUER });          // USD per NUT
    return { price: nutInUsd, source: `amm:NUT/${NUT_AMM_COUNTER_CURRENCY}` };
  } finally {
    try { await client.disconnect(); } catch {}
  }
}

/** USD tiers → integer NUT amounts (strings), applying the soft emission cap. */
function computeNutAmounts(priceUsd) {
  const raw = PRIZE_USD_TIERS.map((t) => Math.floor(t.usd / priceUsd));
  const total = raw.reduce((s, n) => s + n, 0);
  let amounts = raw;
  let capApplied = false;
  if (total > MAX_WEEKLY_NUT_EMISSION) {
    const factor = MAX_WEEKLY_NUT_EMISSION / total;
    amounts = raw.map((n) => Math.floor(n * factor));
    capApplied = true;
  }
  return { amounts: amounts.map(String), capApplied };
}

/** Create (lock in) the week's snapshot. Idempotent unless force=true. */
async function createWeeklySnapshot(weekKey, { force = false } = {}) {
  const db = await getDb();
  const col = db.collection('weekly_prize_tiers');

  if (!force) {
    const existing = await col.findOne({ weekKey });
    if (existing) return existing;
  }

  let price, source;
  try {
    ({ price, source } = await fetchNutUsdPrice());
  } catch (err) {
    if (NUT_USD_PRICE_FALLBACK) { price = NUT_USD_PRICE_FALLBACK; source = 'fallback:env'; }
    else throw new Error(`Price snapshot failed and no fallback configured: ${err.message}`);
  }
  if (!(price > 0) || !isFinite(price)) throw new Error('Invalid NUT/USD price');

  const { amounts, capApplied } = computeNutAmounts(price);
  const doc = {
    weekKey,
    weekly_prize_usd_tiers: PRIZE_USD_TIERS,
    nut_price_snapshot_usd: price,
    snapshot_timestamp: new Date(),
    calculated_nut_amounts: amounts,        // index = rank-1, integer strings
    cap_applied: capApplied,
    max_weekly_nut_emission: MAX_WEEKLY_NUT_EMISSION,
    price_source: source,
  };

  if (force) await col.replaceOne({ weekKey }, doc, { upsert: true });
  else       await col.updateOne({ weekKey }, { $setOnInsert: doc }, { upsert: true }); // first writer wins
  return col.findOne({ weekKey });
}

/** Read-only snapshot fetch (eligibility, claim, tiers). */
async function getWeeklySnapshot(weekKey) {
  const db = await getDb();
  return db.collection('weekly_prize_tiers').findOne({ weekKey });
}

/** Public tier payload for the frontend (USD value + pre-calculated NUT). */
function tiersPayload(snapshot) {
  return snapshot.weekly_prize_usd_tiers.map((t, i) => ({
    rank: t.rank,
    label: t.label,
    usd_value: t.usd,
    nut_amount: snapshot.calculated_nut_amounts[i] ?? null,
  }));
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
async function getTopWinners(weekKey, snapshot = null) {
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
  const ranked = Array.from(playerMap.entries())
    .map(([wallet, total]) => ({ wallet, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  if (!snapshot) return ranked;
  return ranked.map((w) => ({
    ...w,
    usd_value: snapshot.weekly_prize_usd_tiers[w.rank - 1]?.usd ?? null,
    nut_amount: snapshot.calculated_nut_amounts[w.rank - 1] ?? null, // string
  }));
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

    // Get top 3 (with snapshot-locked prize amounts when announced)
    const snapshot = await getWeeklySnapshot(weekKey);
    const winners = await getTopWinners(weekKey, snapshot);
    const match = winners.find(
      (w) => w.wallet.toLowerCase() === wallet.toLowerCase()
    );

    const snapshotMeta = {
      announced: !!snapshot,
      snapshot_price: snapshot ? snapshot.nut_price_snapshot_usd : null,
      snapshot_timestamp: snapshot ? snapshot.snapshot_timestamp : null,
      cap_applied: snapshot ? snapshot.cap_applied : null,
      tiers: snapshot ? tiersPayload(snapshot) : null,
    };

    if (!match) {
      return res.json({
        eligible: false,
        rank: null,
        game: null,
        prize: null,
        usd_value: null,
        nut_amount: null,
        claimed: false,
        txHash: null,
        ...snapshotMeta,
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

    return res.json({
      eligible: true,
      rank: match.rank,
      game: 'combined',
      prize: match.nut_amount != null ? parseInt(match.nut_amount, 10) : null,
      usd_value: match.usd_value,
      nut_amount: match.nut_amount,
      claimed: isClaimed,
      txHash,
      ...snapshotMeta,
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

    // ── Snapshot is mandatory: NEVER price at claim time ──
    const snapshot = await getWeeklySnapshot(weekKey);
    if (!snapshot) {
      return res.status(409).json({ error: 'Prizes for this week have not been announced yet' });
    }

    // ── Re-verify eligibility against the locked snapshot (defense in depth) ──
    const winners = await getTopWinners(weekKey, snapshot);
    const match = winners.find(
      (w) => w.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (!match) {
      return res.status(403).json({ error: 'Wallet is not in the Top 3 for this week' });
    }

    const nutAmount     = match.nut_amount;            // pre-calculated string
    const usdValue      = match.usd_value;
    const snapshotPrice = snapshot.nut_price_snapshot_usd;
    if (!nutAmount) {
      return res.status(409).json({ error: 'Prize amount not available for this week' });
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
      amount: nutAmount,
      usd_value: usdValue,
      snapshot_price: snapshotPrice,
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
          value: nutAmount,
        },
        Memos: [{
          Memo: {
            MemoType: Buffer.from('fuzzynuts-arcade-prize', 'utf8').toString('hex').toUpperCase(),
            MemoData: Buffer.from(
              `Fuzzynuts Reward week=${weekKey} rank=${match.rank} usd_value=${usdValue} ` +
              `snapshot_price=${snapshotPrice} nut_amount_paid=${nutAmount} score=${match.total}`,
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
              usd_value: usdValue,
              snapshot_price: snapshotPrice,
              nut_amount_paid: nutAmount,
              completedAt: new Date(),
              xrplResult: txResult,
            },
          }
        );

        console.log(`[Rewards API] ✅ Claim successful: ${txHash}`);
        return res.json({
          success: true,
          txHash,
          nut_amount_paid: nutAmount,
          usd_value: usdValue,
          snapshot_price: snapshotPrice,
        });

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
   POST /snapshot — announcement-time price lock (Monday UTC)
   Header: x-admin-secret. Body: { week?: string, force?: boolean }
   ═══════════════════════════════════════════════════════════════ */

router.post('/snapshot', async (req, res) => {
  try {
    if (!REWARDS_ADMIN_SECRET || req.get('x-admin-secret') !== REWARDS_ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { week, force } = req.body || {};
    const weekKey = (week && isValidWeekKey(week)) ? week : getCurrentWeekKey();
    const snap = await createWeeklySnapshot(weekKey, { force: !!force });
    return res.json({
      ok: true,
      weekKey,
      nut_price_snapshot_usd: snap.nut_price_snapshot_usd,
      snapshot_timestamp: snap.snapshot_timestamp,
      calculated_nut_amounts: snap.calculated_nut_amounts,
      cap_applied: snap.cap_applied,
      price_source: snap.price_source,
    });
  } catch (err) {
    console.error('[Rewards API] Snapshot error:', err.message);
    return res.status(502).json({ error: `Snapshot failed: ${err.message}` });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /tiers?week=<YYYY-WNN> — wallet-independent prize tiers
   ═══════════════════════════════════════════════════════════════ */

router.get('/tiers', async (req, res) => {
  try {
    const { week } = req.query;
    const weekKey = (week && isValidWeekKey(week)) ? week : getCurrentWeekKey();
    const snapshot = await getWeeklySnapshot(weekKey);
    if (!snapshot) {
      return res.json({ announced: false, weekKey, tiers: null, snapshot_price: null, snapshot_timestamp: null });
    }
    return res.json({
      announced: true,
      weekKey,
      tiers: tiersPayload(snapshot),
      snapshot_price: snapshot.nut_price_snapshot_usd,
      snapshot_timestamp: snapshot.snapshot_timestamp,
      cap_applied: snapshot.cap_applied,
    });
  } catch (err) {
    console.error('[Rewards API] Tiers error:', err.message);
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
