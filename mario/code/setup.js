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