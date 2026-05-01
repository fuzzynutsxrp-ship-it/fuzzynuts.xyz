/**
	Just create the global mario object.
	Code by Rob Kleffner, 2011
*/

var Mario = {};

// ═══ FUZZYNUTS SCORING SYSTEM ═══
Mario.Score = 0;
Mario.HighScore = parseInt(localStorage.getItem('fuzzynuts_mario_hi') || '0');

Mario.AddScore = function(points) {
    Mario.Score += points;
};

Mario.ResetScore = function() {
    Mario.Score = 0;
};

Mario.SaveHighScore = function() {
    if (Mario.Score > Mario.HighScore) {
        Mario.HighScore = Mario.Score;
        localStorage.setItem('fuzzynuts_mario_hi', Mario.HighScore.toString());
    }
};

Mario.PostScoreToParent = function(event) {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'fuzzynuts_score',
                event: event,
                score: Mario.Score,
                coins: Mario.MarioCharacter ? Mario.MarioCharacter.Coins : 0,
                lives: Mario.MarioCharacter ? Mario.MarioCharacter.Lives : 0,
                world: Mario.GlobalMapState ? (Mario.GlobalMapState.WorldNumber + 1) : 1
            }, '*');
        }
    } catch(e) { /* cross-origin safety */ }
};

// ═══ SHARE SCORE ON X ═══
Mario.ShareOnX = function(event) {
    var emoji = event === 'game_win' ? '🏆' : '🕹️';
    var action = event === 'game_win' ? 'beat' : 'scored ' + Mario.Score.toLocaleString() + ' on';
    var text = emoji + ' I just ' + action + ' Super Fuzzynuts!\n\n' +
        'The only playable arcade game in XRPL meme coin history.\n' +
        'Can you beat me? → fuzzynuts.xyz\n\n' +
        '$NUT #XRPL 🐿️🥜';
    var url = 'https://x.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'width=600,height=400');
};

Mario.ShowShareOverlay = function(event) {
    // Remove any existing overlay
    var existing = document.getElementById('share-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;gap:10px;align-items:center;';

    var btn = document.createElement('button');
    btn.textContent = '🐦 Share on X';
    btn.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);color:#d4a843;border:2px solid #d4a843;' +
        'padding:12px 24px;border-radius:10px;font-family:Outfit,sans-serif;font-size:15px;font-weight:700;' +
        'cursor:pointer;transition:all 0.3s;box-shadow:0 0 20px rgba(212,168,67,0.3);';
    btn.onmouseover = function() { btn.style.background = '#d4a843'; btn.style.color = '#0a0a1a'; };
    btn.onmouseout = function() { btn.style.background = 'linear-gradient(135deg,#1a1a2e,#16213e)'; btn.style.color = '#d4a843'; };
    btn.onclick = function() { Mario.ShareOnX(event); };

    var dismiss = document.createElement('button');
    dismiss.textContent = '✕';
    dismiss.style.cssText = 'background:none;border:1px solid #6b5b3a;color:#6b5b3a;width:32px;height:32px;' +
        'border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;';
    dismiss.onclick = function() { overlay.remove(); };

    overlay.appendChild(btn);
    overlay.appendChild(dismiss);
    document.body.appendChild(overlay);

    // Auto-dismiss after 15 seconds
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 15000);
};