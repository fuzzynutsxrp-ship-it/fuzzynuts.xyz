/* ═══════════════════════════════════════════════════════════════
   FUZZYNUTS ARCADE — Multi-Wallet Integration
   Supports: Xaman (QR/mobile), GemWallet (extension), Crossmark (extension)
   ═══════════════════════════════════════════════════════════════ */

const FuzzyWallet = (() => {
  // ── State ──
  let walletState = {
    connected: false,
    address: null,
    walletType: null,     // 'xaman' | 'gemwallet' | 'crossmark'
    hasTrustline: false,
    nutBalance: '0',
    displayName: null
  };

  // ── NUT Token Config ──
  const NUT_ISSUER = 'rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7';
  const NUT_CURRENCY = 'NUT';
  const XRPL_WS = 'wss://xrplcluster.com';

  // ── Xaman Config (replace with your API key) ──
  const XAMAN_API_KEY = 'f4f734d6-c1d6-484a-84c1-70322602a7f5';
  let xamanInstance = null;

  // ── Listeners ──
  const listeners = [];

  function onChange(fn) {
    listeners.push(fn);
  }

  function notifyListeners() {
    listeners.forEach(fn => fn({ ...walletState }));
  }

  // ── Persistence ──
  function saveState() {
    try {
      localStorage.setItem('fuzzy_wallet', JSON.stringify({
        address: walletState.address,
        walletType: walletState.walletType,
        connected: walletState.connected
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem('fuzzy_wallet') || '{}');
      return saved;
    } catch (e) { return {}; }
  }

  // ── Address Formatting ──
  function truncateAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ── XRPL Trustline Check ──
  async function checkTrustline(address) {
    try {
      const response = await fetch('https://xrplcluster.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{
            account: address,
            peer: NUT_ISSUER
          }]
        })
      });
      const data = await response.json();
      if (data.result && data.result.lines) {
        const nutLine = data.result.lines.find(l => l.currency === NUT_CURRENCY);
        if (nutLine) {
          walletState.hasTrustline = true;
          walletState.nutBalance = nutLine.balance || '0';
          return true;
        }
      }
      walletState.hasTrustline = false;
      walletState.nutBalance = '0';
      return false;
    } catch (err) {
      console.warn('[FuzzyWallet] Trustline check failed:', err.message);
      walletState.hasTrustline = false;
      walletState.nutBalance = '0';
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // XAMAN (Mobile QR)
  // ═══════════════════════════════════════════
  async function connectXaman() {
    if (XAMAN_API_KEY === '__XAMAN_API_KEY__') {
      console.warn('[FuzzyWallet] Xaman API key not configured');
      alert('Xaman integration is being set up. Please try GemWallet or Crossmark for now.');
      return false;
    }

    try {
      if (!window.Xumm) {
        console.error('[FuzzyWallet] Xaman SDK not loaded');
        alert('Xaman SDK not loaded. Please refresh the page.');
        return false;
      }

      xamanInstance = new Xumm(XAMAN_API_KEY);

      // Authorize (triggers QR code or redirect)
      await xamanInstance.authorize();

      // Get account
      const account = await xamanInstance.user.account;
      if (account) {
        walletState.connected = true;
        walletState.address = account;
        walletState.walletType = 'xaman';
        walletState.displayName = truncateAddress(account);
        await checkTrustline(account);
        saveState();
        notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[FuzzyWallet] Xaman connection error:', err);
      alert('Failed to connect Xaman. Please try again.');
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // GEMWALLET (Browser Extension)
  // ═══════════════════════════════════════════
  async function connectGemWallet() {
    try {
      if (!window.GemWalletApi) {
        window.open('https://gemwallet.app', '_blank');
        alert('GemWallet extension not detected. Install it from gemwallet.app and refresh.');
        return false;
      }

      const isInstalled = await GemWalletApi.isInstalled();
      if (!isInstalled.result.isInstalled) {
        window.open('https://gemwallet.app', '_blank');
        alert('GemWallet extension not detected. Please install it and refresh.');
        return false;
      }

      const response = await GemWalletApi.getAddress();
      if (response.result && response.result.address) {
        walletState.connected = true;
        walletState.address = response.result.address;
        walletState.walletType = 'gemwallet';
        walletState.displayName = truncateAddress(response.result.address);
        await checkTrustline(response.result.address);
        saveState();
        notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[FuzzyWallet] GemWallet connection error:', err);
      alert('Failed to connect GemWallet. Please try again.');
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // CROSSMARK (Browser Extension)
  // ═══════════════════════════════════════════
  async function connectCrossmark() {
    try {
      // Crossmark injects window.xrpl when extension is installed
      if (!window.xrpl || !window.xrpl.crossmark) {
        window.open('https://crossmark.io', '_blank');
        alert('Crossmark extension not detected. Install it from crossmark.io and refresh.');
        return false;
      }

      const sdk = window.xrpl.crossmark;
      const { response } = await sdk.signInAndWait();

      if (response && response.data && response.data.address) {
        walletState.connected = true;
        walletState.address = response.data.address;
        walletState.walletType = 'crossmark';
        walletState.displayName = truncateAddress(response.data.address);
        await checkTrustline(response.data.address);
        saveState();
        notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[FuzzyWallet] Crossmark connection error:', err);
      alert('Failed to connect Crossmark. Please try again.');
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // DISCONNECT
  // ═══════════════════════════════════════════
  function disconnect() {
    // Logout from Xaman if active
    if (walletState.walletType === 'xaman' && xamanInstance) {
      try { xamanInstance.logout(); } catch (e) { /* ignore */ }
    }

    walletState = {
      connected: false,
      address: null,
      walletType: null,
      hasTrustline: false,
      nutBalance: '0',
      displayName: null
    };

    try { localStorage.removeItem('fuzzy_wallet'); } catch (e) { /* ignore */ }
    notifyListeners();
  }

  // ═══════════════════════════════════════════
  // AUTO-RECONNECT (from localStorage)
  // ═══════════════════════════════════════════
  async function tryReconnect() {
    const saved = loadState();
    if (!saved.connected || !saved.address) return false;

    // We can't fully reconnect extensions automatically,
    // but we can restore the address and check trustline
    walletState.connected = true;
    walletState.address = saved.address;
    walletState.walletType = saved.walletType;
    walletState.displayName = truncateAddress(saved.address);
    await checkTrustline(saved.address);
    notifyListeners();
    return true;
  }

  // ═══════════════════════════════════════════
  // SET TRUSTLINE (via Xaman sign request)
  // ═══════════════════════════════════════════
  async function requestTrustline() {
    if (!walletState.connected) {
      alert('Please connect your wallet first.');
      return false;
    }

    if (walletState.walletType === 'xaman' && xamanInstance) {
      try {
        const payload = await xamanInstance.payload.create({
          TransactionType: 'TrustSet',
          LimitAmount: {
            currency: NUT_CURRENCY,
            issuer: NUT_ISSUER,
            value: '321000000000'
          }
        });
        // The user will approve in Xaman app
        return true;
      } catch (err) {
        console.error('[FuzzyWallet] Trustline request failed:', err);
      }
    }

    if (walletState.walletType === 'gemwallet' && window.GemWalletApi) {
      try {
        await GemWalletApi.setTrustline({
          limitAmount: {
            currency: NUT_CURRENCY,
            issuer: NUT_ISSUER,
            value: '321000000000'
          }
        });
        // Re-check trustline after a delay
        setTimeout(async () => {
          await checkTrustline(walletState.address);
          notifyListeners();
        }, 5000);
        return true;
      } catch (err) {
        console.error('[FuzzyWallet] GemWallet trustline failed:', err);
      }
    }

    if (walletState.walletType === 'crossmark' && window.xrpl && window.xrpl.crossmark) {
      try {
        await window.xrpl.crossmark.signAndSubmitAndWait({
          TransactionType: 'TrustSet',
          Account: walletState.address,
          LimitAmount: {
            currency: NUT_CURRENCY,
            issuer: NUT_ISSUER,
            value: '321000000000'
          }
        });
        setTimeout(async () => {
          await checkTrustline(walletState.address);
          notifyListeners();
        }, 5000);
        return true;
      } catch (err) {
        console.error('[FuzzyWallet] Crossmark trustline failed:', err);
      }
    }

    // Fallback: open XPMarket trustline page
    window.open('https://xpmarket.com/token/NUT-rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7', '_blank');
    return false;
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════
  return {
    connect: {
      xaman: connectXaman,
      gemwallet: connectGemWallet,
      crossmark: connectCrossmark
    },
    disconnect,
    requestTrustline,
    tryReconnect,
    onChange,
    checkTrustline,
    get state() { return { ...walletState }; },
    get isConnected() { return walletState.connected; },
    get address() { return walletState.address; },
    get hasTrustline() { return walletState.hasTrustline; },
    truncateAddress
  };
})();
