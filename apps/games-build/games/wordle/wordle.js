(function() {
  'use strict';

  // ─── CONSTANTS ───────────────────────────────────────────────────────
  const BG_COLOR = '#0a0614';
  const TILE_CORRECT = '#10b981';
  const TILE_PRESENT = '#fbbf24';
  const TILE_ABSENT = '#374151';
  const TILE_EMPTY = '#1a1a2e';
  const TILE_BORDER = '#2d2d44';
  const TILE_BORDER_ACTIVE = '#6b7280';
  const TEXT_COLOR = '#e5e7eb';
  const KEY_BG = '#3a3a52';
  const KEY_TEXT = '#e5e7eb';
  const TILE_SIZE_RATIO = 0.12;   // tile size relative to canvas width
  const TILE_GAP_RATIO = 0.012;
  const ANIM_FLIP_DURATION = 300;
  const ANIM_STAGGER = 100;
  const ANIM_BOUNCE_DURATION = 400;
  const ANIM_SHAKE_DURATION = 500;

  // ─── WORD LIST (200+ common 5-letter words) ─────────────────────────
  const WORDS = [
    'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
    'agent','agree','ahead','alarm','album','alert','alien','align','alive','allow',
    'alone','along','alter','among','angel','anger','angle','angry','anime','ankle',
    'apart','apple','apply','arena','argue','arise','armor','array','arrow','aside',
    'asset','atlas','audio','audit','avoid','awake','aware','badly','basic','basin',
    'basis','batch','beach','beard','beast','begun','being','belly','bench','bible',
    'birth','black','blade','blame','bland','blank','blast','blaze','bleed','blend',
    'bless','blind','block','blood','bloom','blown','blues','blunt','board','bonus',
    'booth','bound','brain','brand','brave','bread','break','breed','brick','bride',
    'brief','bring','broad','broke','brook','brown','brush','buddy','build','bunch',
    'burst','buyer','cabin','cable','candy','cargo','carry','catch','cause','chain',
    'chair','chalk','chaos','charm','chart','chase','cheap','check','cheek','cheer',
    'chess','chest','chief','child','china','chord','chunk','civil','claim','clash',
    'class','clean','clear','climb','cling','clock','clone','close','cloth','cloud',
    'coach','coast','color','comet','coral','could','count','court','cover','crack',
    'craft','crane','crash','crazy','cream','crisp','cross','crowd','crown','crush',
    'curve','cycle','dance','dealt','death','debug','delay','delta','dense','depot',
    'depth','derby','desk','dial','diary','dirty','ditch','dodge','doing','doubt',
    'dough','draft','drain','drake','drama','drank','drawn','dream','dress','dried',
    'drift','drill','drink','drive','drops','drove','dying','eager','eagle','early',
    'earth','eight','elder','elect','elite','empty','enemy','enjoy','enter','entry',
    'equal','error','essay','event','every','exact','exert','exist','extra','faint',
    'faith','false','fancy','fatal','fault','feast','fence','ferry','fever','fewer',
    'fiber','field','fifth','fifty','fight','file','final','flame','flash','fleet',
    'flesh','flies','float','flood','floor','flour','fluid','flush','focus','force',
    'forge','forth','forum','found','frame','frank','fraud','fresh','front','frost',
    'fruit','funds','funny','gamma','gauge','genre','ghost','giant','given','glass',
    'globe','gloom','gloss','glove','going','grace','grade','grain','grand','grant',
    'graph','grasp','grass','grave','great','green','greet','grief','grill','grind',
    'groan','gross','group','grove','grown','guard','guess','guest','guide','guild',
    'guilt','piano','happy','harsh','haven','heart','heavy','hence','herbs','horse',
    'hotel','house','human','humor','ideal','image','imply','index','indie','inner',
    'input','irony','ivory','jewel','joint','judge','juice','known','label','labor',
    'large','laser','later','laugh','layer','learn','lease','least','leave','legal',
    'lemon','level','light','limit','linen','liver','lobby','local','logic','login',
    'lucky','lunch','lying','magic','major','maker','manor','march','marry','match',
    'mayor','media','mercy','merge','merit','metal','meter','micro','might','minor',
    'minus','model','money','month','moral','motor','motel','mount','mouse','mouth',
    'movie','music','naked','nerve','never','newly','night','noble','noise','north',
    'noted','novel','nurse','nylon','occur','ocean','olive','onset','opera','orbit',
    'organ','other','outer','oxide','ozone','paint','panel','panic','paper','patch',
    'pause','peace','pearl','phase','phone','photo','piece','pilot','pinch','pitch',
    'pixel','place','plain','plane','plant','plate','plaza','plead','plumb','plump',
    'plush','point','polar','porch','pound','power','press','price','pride','prime',
    'prince','print','prior','prize','proof','proud','prove','psalm','pulse','punch',
    'pupil','purse','queen','query','quest','queue','quick','quiet','quote','radar',
    'radio','raise','rally','ranch','range','rapid','ratio','reach','react','ready',
    'realm','rebel','refer','reign','relax','relay','renal','renew','repay','reply',
    'rider','ridge','rifle','right','rigid','risky','rival','river','robot','rocky',
    'roman','rouge','rough','round','route','royal','rugby','ruler','rural','sadly',
    'saint','salad','scale','scare','scene','scope','score','scout','seize','sense',
    'serve','setup','seven','shade','shall','shame','shape','share','shark','sharp',
    'sheep','sheer','sheet','shelf','shell','shift','shine','shirt','shock','shoot',
    'shore','short','shout','sight','since','sixth','sixty','sized','skill','skull',
    'slash','slate','sleep','slice','slide','slope','small','smart','smell','smile',
    'smoke','snake','solar','solid','solve','sorry','sound','south','space','spare',
    'spark','speak','speed','spend','spent','spill','spine','spoke','spoon','sport',
    'spray','squad','stack','staff','stage','stain','stake','stall','stamp','stand',
    'start','state','steak','steal','steam','steel','steep','steer','stern','stick',
    'stiff','still','stock','stone','stood','storm','story','stove','strap','straw',
    'strip','stuck','study','stuff','style','sugar','suite','sunny','super','surge',
    'swamp','swear','sweep','sweet','swept','swift','swing','sword','sworn','syrup',
    'table','taste','teach','teeth','tempo','tense','tenth','theme','there','thick',
    'thing','think','third','thorn','those','three','threw','throw','thumb','tidal',
    'tiger','tight','timer','tired','title','token','torch','total','touch','tough',
    'tower','toxic','trace','track','trade','trail','train','trait','trash','treat',
    'trend','trial','tribe','trick','tried','troop','truck','truly','trump','trunk',
    'trust','truth','tumor','twist','ultra','uncle','under','union','unite','unity',
    'until','upper','upset','urban','usage','usual','utter','valid','value','valve',
    'vapor','vault','venue','verse','video','vigor','vinyl','viola','virus','visit',
    'vista','vital','vivid','vocal','vodka','voice','voter','waist','waste','watch',
    'water','weary','weave','weigh','weird','wheat','wheel','where','which','while',
    'white','whole','whose','widow','width','witch','woman','world','worry','worse',
    'worst','worth','would','wound','wrath','wrist','wrote','yield','young','youth',
    'abate','abbey','abbot','abide','abort','ached','acorn','adept','adore','afire',
    'agile','aging','aglow','aisle','alarm','amend','ample','anvil','arbor','aroma',
    'attic','badge','baker','baron','batch','baton','began','bench','berry','birch',
    'blade','bliss','bloom','blown','blunt','boast','bonus','brace','brake','brass',
    'brink','brute','budge','canal','carat','cedar','chant','chord','civic','clerk',
    'cliff','climb','cloth','cobra','comet','coral','creed','creek','crest','crown',
    'cruel','crush','curse','cycle','dairy','decay','decoy','delve','depot','digit',
    'disco','dodge','donor','dwarf','easel','edict','eject','elfin','ember','envoy',
    'epoch','erode','erupt','evict','exalt','exile','fable','facet','feast','ferry',
    'fibre','flank','flask','flora','flout','flung','flute','foamy','forge','forte',
    'frail','freak','froze','fumes','gamma','gauge','gavel','geyser','given','gland',
    'gleam','globe','gloom','gloss','gnome','golly','goose','grain','grape','grasp',
    'grass','grate','greed','grief','grill','gripe','groan','groom','gruel','guava',
    'guild','guise','haven','hazel','heist','hence','heron','hoard','homer','honey',
    'honor','hoped','horse','hound','humid','hyena','igloo','image','imply','incur',
    'inert','infer','ingot','inlet','inter','ionic','irate','ivory','jaunt','jazzy',
    'joker','jolly','joust','kayak','karma','kebab','knack','knelt','knoll','label',
    'laden','ladle','lapse','large','larva','latch','laugh','layer','leach','leapt',
    'ledge','legal','lever','light','lilac','llama','lofty','loner','loose','lotus',
    'lover','lower','loyal','lucid','lunar','lyric','macro','magic','major','manor',
    'maple','marsh','mason','matte','medal','mercy','merge','merit','metal','might',
    'minor','minus','mirth','model','moist','money','moose','motel','mound','mount',
    'mourn','mouse','mouth','mulch','mural','nadir','naive','nerve','niece','noble',
    'noise','notch','noted','novel','nudge','oasis','ocean','onset','opera','opted',
    'orbit','organ','otter','outer','oxide','ozone','pager','paint','paler','pansy',
    'paste','patch','pause','pearl','pecan','penal','perch','peril','perry','pesto',
    'petal','phase','phone','piano','piece','piggy','pilot','pinch','pixel','pizza',
    'place','plaid','plait','plane','plank','plant','plaza','plead','plier','plumb',
    'plump','plush','poach','poker','polar','poppy','posse','pouch','pouty','prawn',
    'press','prism','privy','probe','prone','prose','proud','prune','psalm','pulse',
    'punch','puppy','purse','quail','qualm','quart','quash','quasi','quota','rabbi',
    'racer','radar','radio','raise','rally','ranch','range','rapid','raspy','raven',
    'reach','realm','reams','rebel','rebus','recur','refer','reign','remit','renal',
    'renew','repay','repel','reply','rider','ridge','rifle','right','rigid','rinse',
    'ripen','risen','risky','rival','river','rivet','robot','rocky','rogue','rouge',
    'rough','round','route','rover','rowdy','royal','ruler','rural','sable','salsa',
    'salty','sandy','satin','sauce','sauna','scale','scalp','scant','scare','scarf',
    'scent','scone','scope','score','scout','scowl','scrub','sedan','sense','serif',
    'serve','setup','seven','shade','shady','shaft','shale','shall','shame','shank',
    'shape','shard','share','shark','shawl','sheen','sheep','sheer','sheet','shelf',
    'shell','shift','shire','shirt','shock','shore','shorn','short','shout','shove',
    'shrub','siege','sight','sigma','silly','since','sinew','siren','sixth','sixty',
    'sized','skate','skill','skimp','skull','slain','slang','slant','slash','slate',
    'sleek','sleep','sleet','slept','slice','slide','sling','slope','sloth','smack',
    'smart','smash','smear','smell','smelt','smile','smirk','smith','smoke','snack',
    'snail','snake','snare','sneak','snore','solar','solid','solve','sonic','sorry',
    'south','space','spade','spank','spark','spawn','speak','spear','specs','speed',
    'spell','spend','spent','spice','spicy','spill','spine','spite','split','spoke',
    'spoon','sport','spray','sprig','spunk','squab','squat','stab','stack','staff',
    'stage','staid','stain','stair','stake','stale','stalk','stall','stamp','stand',
    'stank','stare','stark','start','stash','state','stave','stays','steak','steal',
    'steam','steel','steep','steer','stern','stick','stiff','still','sting','stint',
    'stock','stoic','stoke','stole','stomp','stone','stood','stool','stoop','store',
    'stork','storm','story','stout','stove','strap','straw','stray','strip','strum',
    'strut','stuck','study','stuff','stump','stung','stunk','stunt','style','suite',
    'sunny','super','surge','swamp','swarm','swath','swear','sweat','sweep','sweet',
    'swept','swift','swill','swine','swing','swipe','swirl','swoon','sword','swore',
    'sworn','syrup','tabby','table','tacit','taffy','talon','tango','taper','taste',
    'taunt','teach','teeth','tempo','tenet','tenor','tense','tenth','tepid','theme',
    'there','thick','thief','thigh','thing','think','thorn','those','three','threw',
    'throw','thrum','thumb','thump','tidal','tiger','tight','tilth','timer','timid',
    'tipsy','titan','title','toast','today','token','tonal','torch','torso','total',
    'touch','tough','towel','tower','toxic','trace','track','trade','trail','train',
    'trait','tramp','trash','trawl','tread','treat','trend','trial','tribe','trick',
    'tried','trill','tripe','trite','troll','troop','troth','trout','truce','truck',
    'truly','trump','trunk','truss','trust','truth','tulip','tumor','tunic','tutor',
    'twang','tweak','tweed','tweet','twice','twigs','twine','twist','tying','udder',
    'ulcer','ultra','umbra','uncle','under','undid','unfit','unify','union','unite',
    'unity','unlit','unmet','until','upper','upset','urban','usage','usher','usual',
    'utter','vague','valid','valor','value','valve','vapor','vault','venue','verse',
    'vigor','vinyl','viola','viper','virus','visor','visit','vista','vital','vivid',
    'vocal','vodka','vogue','voice','voter','vouch','vowel','wager','wagon','waist',
    'watch','water','waver','weary','weave','wedge','weigh','weird','whale','wheat',
    'wheel','where','which','while','whine','whirl','white','whole','widen','widow',
    'width','wield','witch','woman','world','worry','worse','worst','worth','would',
    'wound','wrath','wreck','wrest','wring','wrist','wrote','yacht','yearn','yield',
    'young','youth','zebra','zesty'
  ];

  // Deduplicate and filter to exactly 5 letters
  const VALID_WORDS = [...new Set(WORDS.filter(w => w.length === 5))];
  const ANSWER_WORDS = [...new Set(WORDS.filter(w => /^[a-z]{5}$/.test(w)))];

  // ─── SCORING ────────────────────────────────────────────────────────
  const SCORE_TABLE = [0, 1000, 800, 500, 300, 200, 100];

  // ─── GAME STATE ─────────────────────────────────────────────────────
  let canvas, ctx;
  let canvasW, canvasH, tileW, tileH, gapX, gapY, gridStartX, gridStartY;
  let kbStartY, keyW, keyH, keyGap;
  let state = 'start'; // 'start' | 'playing' | 'animating' | 'gameover'
  let answer = '';
  let currentRow = 0;
  let currentCol = 0;
  let guesses = [];        // array of strings
  let tileColors = [];     // [row][col] = color string
  let keyboardColors = {}; // letter -> color
  let hardMode = false;
  let hardModeHints = { correct: {}, present: new Set(), absent: new Set() };
  let startTime = 0;
  let score = 0;
  let bestScore = 0;
  let won = false;
  let animQueue = [];      // animation events
  let shakeRow = -1;
  let shakeStartTime = 0;
  let bounceTiles = [];    // [{row, col, startTime}]
  let currentInput = '';
  let gameOverMessage = '';
  let guessCount = 0;

  // Keyboard layout
  const KB_ROWS = [
    'QWERTYUIOP',
    'ASDFGHJKL',
    'ZXCVBNM'
  ];

  // ─── INITIALIZATION ─────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');

    bestScore = parseInt(localStorage.getItem('wordle_best') || '0', 10);
    window.__gameScore = 0;

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', handleKeyDown);

    // Touch support
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    showStartScreen();
    requestAnimationFrame(gameLoop);
  }

  // ─── RESIZE ─────────────────────────────────────────────────────────
  function resize() {
    const parent = canvas.parentElement || document.body;
    const maxW = parent.clientWidth || window.innerWidth;
    const maxH = parent.clientHeight || window.innerHeight;
    canvasW = Math.min(maxW, 500);
    canvasH = Math.min(maxH, 800);
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';

    // Grid dimensions
    gapX = Math.floor(canvasW * 0.02);
    gapY = Math.floor(canvasW * 0.02);
    tileW = Math.floor((canvasW - 6 * gapX) / 5);
    tileH = tileW;
    gridStartX = Math.floor((canvasW - 5 * tileW - 4 * gapX) / 2);
    gridStartY = Math.floor(canvasH * 0.08);

    // Keyboard dimensions
    keyGap = Math.floor(canvasW * 0.012);
    keyW = Math.floor((canvasW - 11 * keyGap) / 10);
    keyH = Math.floor(keyW * 1.3);
    kbStartY = gridStartY + 6 * (tileH + gapY) + gapY * 3;
  }

  // ─── GAME LOGIC ─────────────────────────────────────────────────────
  function startGame() {
    state = 'playing';
    answer = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
    currentRow = 0;
    currentCol = 0;
    guesses = [];
    tileColors = [];
    keyboardColors = {};
    hardModeHints = { correct: {}, present: new Set(), absent: new Set() };
    currentInput = '';
    score = 0;
    won = false;
    guessCount = 0;
    startTime = Date.now();
    animQueue = [];
    shakeRow = -1;
    bounceTiles = [];
    gameOverMessage = '';
    window.__gameScore = 0;
    updateScoreDisplay(0);
  }

  function addLetter(letter) {
    if (state !== 'playing' || currentCol >= 5) return;
    currentInput += letter;
    currentCol++;
  }

  function removeLetter() {
    if (state !== 'playing' || currentCol <= 0) return;
    currentInput = currentInput.slice(0, -1);
    currentCol--;
  }

  function submitGuess() {
    if (state !== 'playing') return;
    if (currentCol < 5) return;

    const guess = currentInput.toLowerCase();

    // Validate word
    if (!VALID_WORDS.includes(guess)) {
      triggerShake();
      return;
    }

    // Hard mode validation
    if (hardMode && currentRow > 0) {
      const err = validateHardMode(guess);
      if (err) {
        triggerShake();
        gameOverMessage = err;
        setTimeout(() => { gameOverMessage = ''; }, 1500);
        return;
      }
    }

    // Evaluate guess
    const colors = evaluateGuess(guess, answer);
    guesses.push(guess);
    tileColors.push(colors);

    // Update hard mode hints
    updateHardModeHints(guess, colors);

    // Update keyboard colors
    for (let i = 0; i < 5; i++) {
      const letter = guess[i].toUpperCase();
      const color = colors[i];
      const existing = keyboardColors[letter];
      if (color === TILE_CORRECT) {
        keyboardColors[letter] = TILE_CORRECT;
      } else if (color === TILE_PRESENT && existing !== TILE_CORRECT) {
        keyboardColors[letter] = TILE_PRESENT;
      } else if (color === TILE_ABSENT && !existing) {
        keyboardColors[letter] = TILE_ABSENT;
      }
    }

    // Trigger flip animation
    triggerFlipAnimation(currentRow, colors);

    // Check win
    if (guess === answer) {
      won = true;
      guessCount = currentRow + 1;
      score = SCORE_TABLE[guessCount] || 100;
      state = 'animating';
      setTimeout(() => {
        triggerWinBounce();
        setTimeout(() => endGame(), guessCount * ANIM_STAGGER + ANIM_BOUNCE_DURATION + 300);
      }, 5 * ANIM_STAGGER + ANIM_FLIP_DURATION);
      return;
    }

    currentRow++;
    currentCol = 0;
    currentInput = '';

    // Check game over (6 guesses used)
    if (currentRow >= 6) {
      guessCount = 6;
      score = 0;
      state = 'animating';
      setTimeout(() => endGame(), 5 * ANIM_STAGGER + ANIM_FLIP_DURATION + 300);
    }
  }

  function evaluateGuess(guess, target) {
    const colors = Array(5).fill(TILE_ABSENT);
    const targetArr = target.split('');
    const guessArr = guess.split('');
    const used = Array(5).fill(false);

    // First pass: correct
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        colors[i] = TILE_CORRECT;
        used[i] = true;
      }
    }

    // Second pass: present
    for (let i = 0; i < 5; i++) {
      if (colors[i] === TILE_CORRECT) continue;
      for (let j = 0; j < 5; j++) {
        if (!used[j] && guessArr[i] === targetArr[j]) {
          colors[i] = TILE_PRESENT;
          used[j] = true;
          break;
        }
      }
    }

    return colors;
  }

  function validateHardMode(guess) {
    // Check correct positions
    for (const pos in hardModeHints.correct) {
      const letter = hardModeHints.correct[pos];
      if (guess[pos] !== letter) {
        return `"${letter.toUpperCase()}" must be in position ${parseInt(pos) + 1}`;
      }
    }

    // Check present letters (must be somewhere in guess)
    for (const letter of hardModeHints.present) {
      if (!guess.includes(letter)) {
        return `Guess must contain "${letter.toUpperCase()}"`;
      }
    }

    return null;
  }

  function updateHardModeHints(guess, colors) {
    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      if (colors[i] === TILE_CORRECT) {
        hardModeHints.correct[i] = letter;
      } else if (colors[i] === TILE_PRESENT) {
        hardModeHints.present.add(letter);
      }
    }
  }

  function endGame() {
    state = 'gameover';
    const duration = Math.floor((Date.now() - startTime) / 1000);
    window.__gameScore = score;
    updateScoreDisplay(score);

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('wordle_best', bestScore.toString());
    }

    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('wordle', score, duration);
    }

    showGameOverScreen();
  }

  // ─── ANIMATIONS ─────────────────────────────────────────────────────
  function triggerFlipAnimation(row, colors) {
    state = 'animating';
    for (let i = 0; i < 5; i++) {
      animQueue.push({
        type: 'flip',
        row: row,
        col: i,
        color: colors[i],
        startTime: Date.now() + i * ANIM_STAGGER
      });
    }
    setTimeout(() => {
      if (state === 'animating' && !won) {
        state = 'playing';
      }
    }, 5 * ANIM_STAGGER + ANIM_FLIP_DURATION);
  }

  function triggerShake() {
    shakeRow = currentRow;
    shakeStartTime = Date.now();
    setTimeout(() => { shakeRow = -1; }, ANIM_SHAKE_DURATION);
  }

  function triggerWinBounce() {
    for (let i = 0; i < 5; i++) {
      bounceTiles.push({
        row: currentRow,
        col: i,
        startTime: Date.now() + i * ANIM_STAGGER
      });
    }
  }

  function gameLoop(timestamp) {
    update(timestamp);
    render();
    requestAnimationFrame(gameLoop);
  }

  function update(timestamp) {
    // Clean up finished animations
    animQueue = animQueue.filter(a => Date.now() < a.startTime + ANIM_FLIP_DURATION);
    bounceTiles = bounceTiles.filter(b => Date.now() < b.startTime + ANIM_BOUNCE_DURATION);
  }

  // ─── RENDERING ──────────────────────────────────────────────────────
  function render() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (state === 'start') {
      renderStartScreen();
      return;
    }

    renderGrid();
    renderKeyboard();

    if (state === 'gameover') {
      renderGameOver();
    }

    // Hard mode indicator
    if (hardMode && (state === 'playing' || state === 'animating')) {
      ctx.fillStyle = TILE_PRESENT;
      ctx.font = `bold ${Math.floor(canvasH * 0.025)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('HARD', canvasW - 10, gridStartY - 8);
    }

    // Game over message (hard mode error etc.)
    if (gameOverMessage) {
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.floor(canvasH * 0.03)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(gameOverMessage, canvasW / 2, gridStartY - 8);
    }
  }

  function renderGrid() {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        let x = gridStartX + col * (tileW + gapX);
        let y = gridStartY + row * (tileH + gapY);
        let letter = '';
        let bgColor = TILE_EMPTY;
        let borderColor = TILE_BORDER;
        let textColor = TEXT_COLOR;

        // Shake offset
        let shakeOffset = 0;
        if (shakeRow === row) {
          const elapsed = Date.now() - shakeStartTime;
          if (elapsed < ANIM_SHAKE_DURATION) {
            const progress = elapsed / ANIM_SHAKE_DURATION;
            shakeOffset = Math.sin(progress * Math.PI * 6) * 8 * (1 - progress);
          }
        }
        x += shakeOffset;

        // Bounce offset
        let bounceOffset = 0;
        for (const b of bounceTiles) {
          if (b.row === row && b.col === col) {
            const elapsed = Date.now() - b.startTime;
            if (elapsed < ANIM_BOUNCE_DURATION) {
              const progress = elapsed / ANIM_BOUNCE_DURATION;
              bounceOffset = -Math.sin(progress * Math.PI) * tileH * 0.3;
            }
          }
        }
        y += bounceOffset;

        // Flip animation
        let scaleY = 1;
        for (const a of animQueue) {
          if (a.row === row && a.col === col) {
            const elapsed = Date.now() - a.startTime;
            if (elapsed >= 0 && elapsed < ANIM_FLIP_DURATION) {
              const progress = elapsed / ANIM_FLIP_DURATION;
              scaleY = Math.abs(Math.cos(progress * Math.PI));
              if (progress > 0.5) {
                bgColor = a.color;
                borderColor = 'transparent';
              }
            } else if (elapsed >= ANIM_FLIP_DURATION) {
              bgColor = a.color;
              borderColor = 'transparent';
            }
          }
        }

        // Already completed rows
        if (row < guesses.length && !animQueue.some(a => a.row === row)) {
          bgColor = tileColors[row] ? tileColors[row][col] : TILE_EMPTY;
          borderColor = 'transparent';
          letter = guesses[row] ? guesses[row][col].toUpperCase() : '';
        }

        // Current input
        if (row === currentRow && col < currentInput.length && state === 'playing') {
          letter = currentInput[col].toUpperCase();
          borderColor = TILE_BORDER_ACTIVE;
        }

        // Draw tile
        ctx.save();
        if (scaleY !== 1) {
          const cy = y + tileH / 2;
          ctx.translate(0, cy);
          ctx.scale(1, scaleY);
          ctx.translate(0, -cy);
        }

        // Tile background
        ctx.fillStyle = bgColor;
        roundRect(ctx, x, y, tileW, tileH, 4);
        ctx.fill();

        // Tile border
        if (borderColor !== 'transparent') {
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          roundRect(ctx, x, y, tileW, tileH, 4);
          ctx.stroke();
        }

        // Letter
        if (letter) {
          ctx.fillStyle = textColor;
          ctx.font = `bold ${Math.floor(tileH * 0.55)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, x + tileW / 2, y + tileH / 2);
        }

        ctx.restore();
      }
    }
  }

  function renderKeyboard() {
    const totalHeight = 3 * (keyH + keyGap);
    const baseY = kbStartY;

    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      const rowWidth = row.length * keyW + (row.length - 1) * keyGap;
      const startX = (canvasW - rowWidth) / 2;
      const y = baseY + r * (keyH + keyGap);

      for (let c = 0; c < row.length; c++) {
        const x = startX + c * (keyW + keyGap);
        const letter = row[c];

        let bg = KEY_BG;
        if (keyboardColors[letter]) {
          bg = keyboardColors[letter];
        }

        ctx.fillStyle = bg;
        roundRect(ctx, x, y, keyW, keyH, 4);
        ctx.fill();

        ctx.fillStyle = KEY_TEXT;
        ctx.font = `bold ${Math.floor(keyH * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, x + keyW / 2, y + keyH / 2);
      }
    }

    // Enter and Backspace buttons
    const enterW = keyW * 1.5;
    const backW = keyW * 1.5;

    // Enter (bottom-left of last row)
    const lastRow = KB_ROWS[2];
    const lastRowWidth = lastRow.length * keyW + (lastRow.length - 1) * keyGap;
    const lastRowStartX = (canvasW - lastRowWidth) / 2;
    const enterX = lastRowStartX - keyGap - enterW;
    const enterY = baseY + 2 * (keyH + keyGap);

    ctx.fillStyle = KEY_BG;
    roundRect(ctx, enterX, enterY, enterW, keyH, 4);
    ctx.fill();
    ctx.fillStyle = KEY_TEXT;
    ctx.font = `bold ${Math.floor(keyH * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENTER', enterX + enterW / 2, enterY + keyH / 2);

    // Backspace (bottom-right of last row)
    const backX = lastRowStartX + lastRowWidth + keyGap;
    ctx.fillStyle = KEY_BG;
    roundRect(ctx, backX, enterY, backW, keyH, 4);
    ctx.fill();
    ctx.fillStyle = KEY_TEXT;
    ctx.font = `bold ${Math.floor(keyH * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⌫', backX + backW / 2, enterY + keyH / 2);

    // Hard mode toggle
    const toggleY = enterY + keyH + keyGap * 2;
    const toggleW = canvasW * 0.4;
    const toggleH = keyH * 0.7;
    const toggleX = (canvasW - toggleW) / 2;

    ctx.fillStyle = hardMode ? TILE_PRESENT : TILE_BORDER;
    roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 6);
    ctx.fill();
    ctx.fillStyle = hardMode ? BG_COLOR : TEXT_COLOR;
    ctx.font = `bold ${Math.floor(toggleH * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hardMode ? 'HARD MODE: ON' : 'HARD MODE: OFF', canvasW / 2, toggleY + toggleH / 2);

    // Store button bounds for click detection
    window.__kbBounds = {
      enter: { x: enterX, y: enterY, w: enterW, h: keyH },
      backspace: { x: backX, y: enterY, w: backW, h: keyH },
      hardMode: { x: toggleX, y: toggleY, w: toggleW, h: toggleH }
    };
  }

  function renderStartScreen() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = TILE_CORRECT;
    ctx.font = `bold ${Math.floor(canvasH * 0.08)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WORDLE', canvasW / 2, canvasH * 0.25);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${Math.floor(canvasH * 0.035)}px sans-serif`;
    ctx.fillText('Guess the word in 6 tries', canvasW / 2, canvasH * 0.35);
    ctx.fillText('Each guess must be a valid 5-letter word', canvasW / 2, canvasH * 0.40);
    ctx.fillText('After each guess, tiles change color:', canvasW / 2, canvasH * 0.45);

    // Example tiles
    const exY = canvasH * 0.50;
    const exSize = Math.floor(canvasW * 0.08);
    const exGap = Math.floor(canvasW * 0.02);
    const exStartX = canvasW / 2 - (3 * exSize + 2 * exGap) / 2;

    // Green
    ctx.fillStyle = TILE_CORRECT;
    roundRect(ctx, exStartX, exY, exSize, exSize, 3);
    ctx.fill();
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${Math.floor(exSize * 0.5)}px sans-serif`;
    ctx.fillText('G', exStartX + exSize / 2, exY + exSize / 2);

    // Yellow
    ctx.fillStyle = TILE_PRESENT;
    roundRect(ctx, exStartX + exSize + exGap, exY, exSize, exSize, 3);
    ctx.fill();
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText('Y', exStartX + exSize + exGap + exSize / 2, exY + exSize / 2);

    // Grey
    ctx.fillStyle = TILE_ABSENT;
    roundRect(ctx, exStartX + 2 * (exSize + exGap), exY, exSize, exSize, 3);
    ctx.fill();
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText('B', exStartX + 2 * (exSize + exGap) + exSize / 2, exY + exSize / 2);

    // Labels
    const labelY = exY + exSize + Math.floor(canvasH * 0.025);
    ctx.font = `${Math.floor(canvasH * 0.022)}px sans-serif`;
    ctx.fillStyle = TILE_CORRECT;
    ctx.fillText('Correct', exStartX + exSize / 2, labelY);
    ctx.fillStyle = TILE_PRESENT;
    ctx.fillText('Present', exStartX + exSize + exGap + exSize / 2, labelY);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Absent', exStartX + 2 * (exSize + exGap) + exSize / 2, labelY);

    // Best score
    if (bestScore > 0) {
      ctx.fillStyle = TILE_PRESENT;
      ctx.font = `${Math.floor(canvasH * 0.03)}px sans-serif`;
      ctx.fillText(`Best Score: ${bestScore}`, canvasW / 2, canvasH * 0.65);
    }

    // Hard mode toggle on start
    const toggleW = canvasW * 0.4;
    const toggleH = keyH * 0.7;
    const toggleX = (canvasW - toggleW) / 2;
    const toggleY = canvasH * 0.70;

    ctx.fillStyle = hardMode ? TILE_PRESENT : TILE_BORDER;
    roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 6);
    ctx.fill();
    ctx.fillStyle = hardMode ? BG_COLOR : TEXT_COLOR;
    ctx.font = `bold ${Math.floor(toggleH * 0.45)}px sans-serif`;
    ctx.fillText(hardMode ? 'HARD MODE: ON' : 'HARD MODE: OFF', canvasW / 2, toggleY + toggleH / 2);

    window.__startHardModeBounds = { x: toggleX, y: toggleY, w: toggleW, h: toggleH };

    // Play button
    const playW = canvasW * 0.5;
    const playH = keyH * 0.9;
    const playX = (canvasW - playW) / 2;
    const playY = canvasH * 0.80;

    ctx.fillStyle = TILE_CORRECT;
    roundRect(ctx, playX, playY, playW, playH, 8);
    ctx.fill();
    ctx.fillStyle = BG_COLOR;
    ctx.font = `bold ${Math.floor(playH * 0.45)}px sans-serif`;
    ctx.fillText('PLAY', canvasW / 2, playY + playH / 2);

    window.__startPlayBounds = { x: playX, y: playY, w: playW, h: playH };
  }

  function renderGameOver() {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = won ? TILE_CORRECT : '#ef4444';
    ctx.font = `bold ${Math.floor(canvasH * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(won ? 'YOU WIN!' : 'GAME OVER', canvasW / 2, canvasH * 0.30);

    if (!won) {
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.floor(canvasH * 0.035)}px sans-serif`;
      ctx.fillText(`Answer: ${answer.toUpperCase()}`, canvasW / 2, canvasH * 0.38);
    }

    ctx.fillStyle = TILE_PRESENT;
    ctx.font = `bold ${Math.floor(canvasH * 0.05)}px sans-serif`;
    ctx.fillText(`Score: ${score}`, canvasW / 2, canvasH * 0.45);

    if (bestScore > 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.floor(canvasH * 0.03)}px sans-serif`;
      ctx.fillText(`Best: ${bestScore}`, canvasW / 2, canvasH * 0.52);
    }

    // Play Again button
    const btnW = canvasW * 0.5;
    const btnH = keyH * 0.9;
    const btnX = (canvasW - btnW) / 2;
    const btnY = canvasH * 0.60;

    ctx.fillStyle = TILE_CORRECT;
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = BG_COLOR;
    ctx.font = `bold ${Math.floor(btnH * 0.45)}px sans-serif`;
    ctx.fillText('PLAY AGAIN', canvasW / 2, btnY + btnH / 2);

    window.__replayBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  // ─── INPUT HANDLING ─────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state === 'start') {
        startGame();
        return;
      }
      if (state === 'gameover') {
        startGame();
        return;
      }
      submitGuess();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      removeLetter();
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      if (state === 'start') {
        hardMode = !hardMode;
        return;
      }
    }

    if (state === 'playing' && /^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key.toUpperCase());
    }
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    handleInteraction(mx, my);
  }

  function handleTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    handleInteraction(mx, my);
  }

  function handleInteraction(mx, my) {
    if (state === 'start') {
      if (window.__startPlayBounds && hitTest(mx, my, window.__startPlayBounds)) {
        startGame();
        return;
      }
      if (window.__startHardModeBounds && hitTest(mx, my, window.__startHardModeBounds)) {
        hardMode = !hardMode;
        return;
      }
      return;
    }

    if (state === 'gameover') {
      if (window.__replayBounds && hitTest(mx, my, window.__replayBounds)) {
        startGame();
        return;
      }
      return;
    }

    if (state !== 'playing') return;

    // Check keyboard buttons
    const bounds = window.__kbBounds;
    if (!bounds) return;

    // Enter button
    if (bounds.enter && hitTest(mx, my, bounds.enter)) {
      submitGuess();
      return;
    }

    // Backspace button
    if (bounds.backspace && hitTest(mx, my, bounds.backspace)) {
      removeLetter();
      return;
    }

    // Hard mode toggle
    if (bounds.hardMode && hitTest(mx, my, bounds.hardMode)) {
      hardMode = !hardMode;
      return;
    }

    // Letter keys
    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      const rowWidth = row.length * keyW + (row.length - 1) * keyGap;
      const startX = (canvasW - rowWidth) / 2;
      const y = kbStartY + r * (keyH + keyGap);

      for (let c = 0; c < row.length; c++) {
        const x = startX + c * (keyW + keyGap);
        if (mx >= x && mx <= x + keyW && my >= y && my <= y + keyH) {
          addLetter(row[c]);
          return;
        }
      }
    }
  }

  function hitTest(mx, my, bounds) {
    return mx >= bounds.x && mx <= bounds.x + bounds.w &&
           my >= bounds.y && my <= bounds.y + bounds.h;
  }

  // ─── HELPERS ────────────────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function updateScoreDisplay(score) {
    const el = document.getElementById('score-display');
    if (el) {
      el.textContent = score.toString();
    }
  }

  // ─── START ──────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
