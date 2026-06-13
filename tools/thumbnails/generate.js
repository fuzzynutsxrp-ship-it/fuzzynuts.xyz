// FuzzyNuts thumbnail generator — designed cards for placeholder games.
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const OUT = process.argv[2] || "./out";
fs.mkdirSync(OUT, { recursive: true });

// ---- helpers ----
function darken(hex, f = 0.32) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function fitFont(title) {
  // left-anchored title at x=48, must fit within ~600px
  const max = 600, base = 76;
  const w = 0.56 * base * title.length;
  if (w <= max) return base;
  return Math.max(34, Math.floor(max / (0.56 * title.length)));
}

// ---- shared template ----
function card(cfg) {
  const { title, badge, color, motif } = cfg;
  const fs_ = fitFont(title);
  const badgeW = 40 + badge.length * 15.5;
  const badgeText = darken(color, 0.3);
  return `<svg width="800" height="800" viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160d2e"/><stop offset="1" stop-color="#0a0613"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.4" r="0.55"><stop offset="0" stop-color="${color}" stop-opacity="0.42"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0613" stop-opacity="0"/><stop offset="1" stop-color="#0a0613" stop-opacity="0.96"/></linearGradient>
</defs>
<rect x="0" y="0" width="680" height="680" fill="url(#bg)"/>
<g stroke="#ffffff" stroke-opacity="0.045" stroke-width="1">
<path d="M0 113H680M0 226H680M0 340H680M0 453H680M0 566H680"/>
<path d="M113 0V680M226 0V680M340 0V680M453 0V680M566 0V680"/>
</g>
<rect x="0" y="0" width="680" height="680" fill="url(#glow)"/>
${motif(color)}
<rect x="36" y="38" width="${badgeW}" height="48" rx="10" fill="${color}"/>
<text x="${36 + badgeW / 2}" y="70" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="${badgeText}" letter-spacing="2">${badge}</text>
<rect x="0" y="490" width="680" height="190" fill="url(#scrim)"/>
<text x="48" y="614" font-family="sans-serif" font-size="${fs_}" font-weight="bold" fill="#ffffff">${title}</text>
<text x="640" y="650" text-anchor="end" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FBBF24" letter-spacing="1">FUZZYNUTS</text>
</svg>`;
}

// ---- motif helpers ----
const W = "#ffffff";
const cell = (x, y, s, fill, r = 12) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${fill}"/>`;
const circ = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

// ---- motif library (centered roughly at cx=340, cy=285) ----
const M = {
  blocks: () => { // tetris — keep multicolour, iconic
    let s = "";
    [[206,168],[280,168],[206,242],[280,242]].forEach(([x,y])=>s+=cell(x,y,70,"#22d3ee"));
    [[356,300],[430,300],[504,300],[430,374]].forEach(([x,y])=>s+=cell(x,y,70,"#a855f7"));
    [[206,384],[206,458],[280,458],[354,458]].forEach(([x,y])=>s+=cell(x,y,70,"#f97316"));
    return s;
  },
  snake: (c) => {
    let s = "";
    const seg=[[230,300],[290,300],[350,300],[350,240],[350,180],[410,180]];
    seg.forEach(([x,y])=>s+=cell(x,y,52,c,14));
    s+=circ(470,206,24,"#ef4444"); // apple
    s+=`<rect x="462" y="176" width="8" height="14" rx="4" fill="#10b981"/>`;
    return s;
  },
  bricks: (c) => {
    let s="";
    const cols=["#ef4444","#f97316","#fbbf24"];
    for(let r=0;r<3;r++)for(let i=0;i<4;i++)s+=`<rect x="${206+i*72}" y="${170+r*40}" width="64" height="30" rx="6" fill="${cols[r]}"/>`;
    s+=`<rect x="300" y="430" width="110" height="20" rx="10" fill="${W}"/>`; // paddle
    s+=circ(355,360,16,W);
    return s;
  },
  pong: (c) => `<rect x="200" y="210" width="22" height="120" rx="11" fill="${W}"/>
<rect x="458" y="300" width="22" height="120" rx="11" fill="${W}"/>
<g stroke="${W}" stroke-opacity="0.4" stroke-width="6" stroke-dasharray="18 18"><path d="M340 170V470"/></g>
${circ(340,300,18,c)}`,
  asteroids: (c) => `<path d="M340 230 L378 330 L302 330 Z" fill="${W}"/>
<path d="M210 200 l40 -16 l34 22 l-10 40 l-44 8 l-26 -30 Z" fill="#888780"/>
<path d="M470 250 l34 -10 l28 26 l-14 34 l-40 2 l-18 -28 Z" fill="#9a9a92"/>
<path d="M430 400 l28 -8 l22 20 l-12 26 l-32 0 Z" fill="#777771"/>
${circ(360,300,5,c)}${circ(300,360,5,c)}`,
  flappy: (c) => `<rect x="220" y="160" width="60" height="150" rx="8" fill="#10b981"/>
<rect x="210" y="300" width="80" height="26" rx="6" fill="#10b981"/>
<rect x="430" y="280" width="60" height="170" rx="8" fill="#10b981"/>
<rect x="420" y="260" width="80" height="26" rx="6" fill="#10b981"/>
${circ(355,300,40,"#fbbf24")}
<path d="M392 296 l30 -8 l0 24 Z" fill="#f97316"/>
${circ(372,288,7,"#0a0613")}
<ellipse cx="338" cy="312" rx="20" ry="13" fill="#f59e0b"/>`,
  lanes: (c) => `<path d="M300 460 L240 180 H300 L320 460 Z" fill="${W}" fill-opacity="0.12"/>
<path d="M360 460 L360 180 H400 L420 460 Z" fill="${W}" fill-opacity="0.18"/>
<path d="M420 460 L440 180 H500 L440 460 Z" fill="${W}" fill-opacity="0.12"/>
<rect x="338" y="360" width="56" height="70" rx="10" fill="${c}"/>
${circ(300,250,12,"#fbbf24")}${circ(420,300,12,"#fbbf24")}${circ(360,210,12,"#fbbf24")}`,
  jetpack: (c) => `<rect x="320" y="210" width="60" height="100" rx="22" fill="${W}"/>
${circ(350,185,28,"#fbbf24")}
<rect x="384" y="220" width="34" height="60" rx="14" fill="${c}"/>
<path d="M392 280 q14 40 0 70 q-14 -30 0 -70" fill="#f97316"/>
${circ(250,260,11,"#fbbf24")}${circ(470,320,11,"#fbbf24")}${circ(300,400,11,"#fbbf24")}`,
  ski: (c) => `<path d="M200 430 L500 320" stroke="${W}" stroke-opacity="0.3" stroke-width="6"/>
<path d="M470 200 l26 70 h-52 Z" fill="#10b981"/><rect x="463" y="266" width="14" height="20" fill="#5f3a1a"/>
${circ(320,300,18,"#fbbf24")}
<rect x="312" y="316" width="16" height="50" rx="8" fill="${c}"/>
<path d="M300 372 L370 360" stroke="${W}" stroke-width="8" stroke-linecap="round"/>`,
  doodle: (c) => `<rect x="250" y="420" width="120" height="22" rx="11" fill="#10b981"/>
<rect x="410" y="320" width="110" height="22" rx="11" fill="#10b981"/>
<rect x="220" y="240" width="110" height="22" rx="11" fill="#10b981"/>
${circ(310,388,34,c)}
${circ(300,382,7,W)}${circ(322,382,7,W)}${circ(300,382,3,"#0a0613")}${circ(322,382,3,"#0a0613")}`,
  t2048: (c) => `<rect x="250" y="200" width="180" height="180" rx="16" fill="${c}"/>
<text x="340" y="320" text-anchor="middle" font-family="sans-serif" font-size="74" font-weight="bold" fill="#0a0613">2048</text>
<rect x="250" y="400" width="80" height="80" rx="12" fill="#fbbf24"/><text x="290" y="456" text-anchor="middle" font-family="sans-serif" font-size="42" font-weight="bold" fill="#0a0613">2</text>
<rect x="350" y="400" width="80" height="80" rx="12" fill="#f97316"/><text x="390" y="456" text-anchor="middle" font-family="sans-serif" font-size="42" font-weight="bold" fill="#0a0613">4</text>`,
  memory: (c) => {
    const pos=[[230,200],[360,200],[230,330],[360,330]];
    const faces=["?","★","?","★"];
    let s="";
    pos.forEach(([x,y],i)=>{s+=`<rect x="${x}" y="${y}" width="100" height="110" rx="12" fill="${i%3===0?c:"#2a1f4a"}"/>`;
      s+=`<text x="${x+50}" y="${y+72}" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="bold" fill="${W}">${faces[i]}</text>`;});
    return s;
  },
  mines: (c) => {
    let s="";
    for(let r=0;r<3;r++)for(let i=0;i<3;i++)s+=`<rect x="${236+i*72}" y="${190+r*72}" width="64" height="64" rx="8" fill="#2a1f4a" stroke="${W}" stroke-opacity="0.15"/>`;
    s+=circ(268,222,18,"#0a0613");s+=`<path d="M268 200v44M246 222h44" stroke="#0a0613" stroke-width="6"/>`;
    s+=`<text x="412" y="306" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="bold" fill="${c}">3</text>`;
    s+=`<path d="M340 350 l0 50 M340 350 l30 12 l-30 12" stroke="#ef4444" stroke-width="6" fill="none"/>`;
    return s;
  },
  sudoku: (c) => {
    let s=`<rect x="230" y="180" width="220" height="220" rx="8" fill="#2a1f4a"/>`;
    for(let i=1;i<3;i++){s+=`<path d="M${230+i*73} 180 v220" stroke="${W}" stroke-opacity="0.25" stroke-width="3"/>`;
      s+=`<path d="M230 ${180+i*73} h220" stroke="${W}" stroke-opacity="0.25" stroke-width="3"/>`;}
    const nums=[["5",260,240],["3",405,240],["8",340,320],["1",260,380],["9",405,380]];
    nums.forEach(([n,x,y])=>s+=`<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="bold" fill="${c}">${n}</text>`);
    return s;
  },
  wordle: (c) => {
    const tiles=[["F","#10b981"],["U","#3a3a3a"],["Z","#fbbf24"],["Z","#10b981"],["Y","#3a3a3a"]];
    let s="";
    tiles.forEach(([l,col],i)=>{const x=180+i*68;s+=`<rect x="${x}" y="250" width="58" height="58" rx="6" fill="${col}"/>`;
      s+=`<text x="${x+29}" y="293" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="bold" fill="${W}">${l}</text>`;});
    return s;
  },
  tank: (c) => `<rect x="240" y="320" width="200" height="60" rx="12" fill="${c}"/>
<rect x="300" y="270" width="90" height="60" rx="10" fill="${c}"/>
<rect x="385" y="288" width="90" height="20" rx="6" fill="${c}"/>
<rect x="232" y="380" width="216" height="36" rx="18" fill="#3a3a3a"/>
${[0,1,2,3,4].map(i=>circ(264+i*40,398,14,"#1a1a1a")).join("")}`,
  heli: (c) => `<ellipse cx="330" cy="320" rx="90" ry="46" fill="${c}"/>
<rect x="410" y="306" width="120" height="20" rx="8" fill="${c}"/>
<path d="M520 300 l16 26 l-22 0 Z" fill="${c}"/>
<rect x="180" y="250" width="320" height="12" rx="6" fill="${W}"/>
<rect x="326" y="262" width="12" height="34" fill="${W}"/>
<path d="M270 366 h140 M290 366 v22 M390 366 v22" stroke="${W}" stroke-width="8" fill="none" stroke-linecap="round"/>
${circ(300,316,14,"#0a0613")}`,
  fruit: (c) => `<path d="M250 250 a90 90 0 0 0 90 90 l0 -90 Z" fill="#ef4444"/>
<path d="M250 250 a90 90 0 0 0 90 90" fill="none" stroke="#10b981" stroke-width="10"/>
<path d="M430 250 a90 90 0 0 1 -90 90 l0 -90 Z" fill="#ef4444"/>
<path d="M430 250 a90 90 0 0 1 -90 90" fill="none" stroke="#10b981" stroke-width="10"/>
<path d="M180 200 L500 420" stroke="${W}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.85"/>`,
  tower: (c) => `<path d="M210 440 Q300 360 360 400 T500 360" stroke="${W}" stroke-opacity="0.25" stroke-width="20" fill="none"/>
<rect x="300" y="210" width="80" height="160" fill="${c}"/>
<path d="M300 210 h16 v-16 h16 v16 h16 v-16 h16 v16 h16" fill="none" stroke="${c}" stroke-width="6"/>
<rect x="316" y="250" width="48" height="40" rx="6" fill="#0a0613"/>
${circ(230,420,12,"#ef4444")}${circ(470,360,12,"#ef4444")}`,
  invader: (c) => {
    const P=[
      "  X   X  ",
      "   X X   ",
      "  XXXXX  ",
      " XX XXX X",
      "XXXXXXXXX",
      "X XXXXX X",
      "X X   X X",
    ];
    const s0=34, ox=340-(9*s0)/2, oy=170;
    let s="";
    P.forEach((row,r)=>{[...row].forEach((ch,i)=>{if(ch==="X")s+=`<rect x="${ox+i*s0}" y="${oy+r*s0}" width="${s0-4}" height="${s0-4}" rx="4" fill="${c}"/>`;});});
    s+=`<rect x="300" y="430" width="80" height="22" rx="6" fill="${W}"/><rect x="332" y="412" width="16" height="22" fill="${W}"/>`;
    return s;
  },
  glove: (c) => `<path d="M280 230 h70 a60 60 0 0 1 60 60 v70 a70 70 0 0 1 -70 70 h-60 a60 60 0 0 1 -60 -60 v-80 a60 60 0 0 1 60 -60 Z" fill="${c}"/>
<path d="M250 300 a40 40 0 0 0 -40 40 v20 a40 40 0 0 0 40 40 Z" fill="${c}"/>
<path d="M280 360 h130" stroke="#0a0613" stroke-width="8" stroke-opacity="0.4"/>`,
  bowling: (c) => `${circ(300,320,80,"#1a1a2e")}
${circ(280,300,12,W)}${circ(316,300,12,W)}${circ(298,336,12,W)}
${[0,1,2].map(i=>`<g><ellipse cx="${430+i*38}" cy="300" rx="16" ry="46" fill="${W}"/><rect x="${418+i*38}" y="290" width="24" height="10" fill="#ef4444"/></g>`).join("")}`,
  archery: (c) => `${circ(340,300,90,"#ffffff")}${circ(340,300,66,"#3a86ff")}${circ(340,300,42,"#ef4444")}${circ(340,300,18,"#fbbf24")}
<path d="M180 180 L360 300" stroke="#5f3a1a" stroke-width="8"/>
<path d="M360 300 l-30 -6 l8 -10 Z" fill="${W}"/>
<path d="M180 180 l24 4 l-4 -24 Z" fill="${c}"/>`,
  surf: (c) => `<path d="M180 360 q60 -60 130 0 t130 0 t130 0" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round"/>
<path d="M180 410 q60 -60 130 0 t130 0 t130 0" fill="none" stroke="${c}" stroke-opacity="0.5" stroke-width="14" stroke-linecap="round"/>
<ellipse cx="360" cy="250" rx="26" ry="84" fill="#fbbf24" transform="rotate(35 360 250)"/>`,
  flag2: (c) => `<rect x="250" y="180" width="10" height="260" rx="4" fill="${W}"/>
<path d="M260 190 h140 l-30 36 l30 36 h-140 Z" fill="${c}"/>
<rect x="200" y="436" width="280" height="14" rx="6" fill="${W}" fill-opacity="0.3"/>`,
  maze: (c) => {
    let s=`<rect x="220" y="180" width="240" height="240" rx="6" fill="none" stroke="${c}" stroke-width="8"/>`;
    s+=`<path d="M220 240 h120 M460 240 h-60 M340 180 v120 M280 300 h120 M300 420 v-60 M380 420 v-90" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    s+=circ(252,212,12,"#fbbf24");
    return s;
  },
  frog: (c) => `<ellipse cx="340" cy="320" rx="80" ry="64" fill="${c}"/>
${circ(308,268,22,c)}${circ(372,268,22,c)}${circ(308,266,9,W)}${circ(372,266,9,W)}${circ(308,266,4,"#0a0613")}${circ(372,266,4,"#0a0613")}
<path d="M270 370 l-30 30 M410 370 l30 30" stroke="${c}" stroke-width="16" stroke-linecap="round"/>
<g stroke="${W}" stroke-opacity="0.2" stroke-width="6" stroke-dasharray="20 16"><path d="M180 430 H500"/></g>`,
  bomb: (c) => `${circ(330,330,84,"#1a1a2e")}
${circ(305,305,22,"#3a3a5a")}
<path d="M390 270 q30 -40 50 -50" stroke="#888" stroke-width="10" fill="none"/>
<path d="M440 220 l8 -20 l8 20 l20 8 l-20 8 l-8 20 l-8 -20 l-20 -8 Z" fill="#fbbf24"/>`,
  stack: (c) => `<rect x="250" y="400" width="180" height="50" rx="8" fill="${c}"/>
<rect x="270" y="350" width="160" height="50" rx="8" fill="#fbbf24"/>
<rect x="255" y="300" width="150" height="50" rx="8" fill="#f97316"/>
<rect x="285" y="250" width="120" height="50" rx="8" fill="#22d3ee"/>
<rect x="300" y="200" width="90" height="50" rx="8" fill="#a855f7"/>`,
  rsc: (c) => `<path d="M340 180 l70 28 v70 q0 90 -70 130 q-70 -40 -70 -130 v-70 Z" fill="${c}"/>
<path d="M340 210 l44 18 v52 q0 64 -44 96 q-44 -32 -44 -96 v-52 Z" fill="#0a0613" fill-opacity="0.35"/>
<path d="M340 240 v150 M310 280 h60" stroke="${W}" stroke-width="10" stroke-linecap="round"/>`,
};

// ---- per-game config (31 placeholders) ----
const GAMES = [
  ["snake","Snake","ARCADE","#10b981","snake"],
  ["breakout","Breakout","ARCADE","#f59e0b","bricks"],
  ["pong","Pong","ARCADE","#22d3ee","pong"],
  ["tetris","Tetris","PUZZLE","#7c3aed","blocks"],
  ["asteroids","Asteroids","ARCADE","#ef4444","asteroids"],
  ["flappy","Flappy Nut","RUNNER","#fbbf24","flappy"],
  ["subway-runner","Subway Runner","RUNNER","#06b6d4","lanes"],
  ["jetpack","Jetpack Joyride","RUNNER","#f97316","jetpack"],
  ["ski-free","Ski Free","RUNNER","#22d3ee","ski"],
  ["doodle-jump","Doodle Jump","RUNNER","#10b981","doodle"],
  ["2048","2048","PUZZLE","#d4a843","t2048"],
  ["memory","Memory Match","PUZZLE","#a855f7","memory"],
  ["minesweeper","Minesweeper","PUZZLE","#ef4444","mines"],
  ["sudoku","Sudoku","PUZZLE","#06b6d4","sudoku"],
  ["wordle","Wordle","PUZZLE","#10b981","wordle"],
  ["tank-battle","Tank Battle","ACTION","#22c55e","tank"],
  ["helicopter","Helicopter","ACTION","#f97316","heli"],
  ["fruit-ninja","Fruit Ninja","ACTION","#ef4444","fruit"],
  ["tower-defense","Tower Defense","ACTION","#7c3aed","tower"],
  ["space-invaders","Space Invaders","ACTION","#06b6d4","invader"],
  ["boxing","Boxing","SPORTS","#ef4444","glove"],
  ["bowling","Bowling","SPORTS","#f97316","bowling"],
  ["archery","Archery","SPORTS","#10b981","archery"],
  ["surf-up","Surf Up","SPORTS","#06b6d4","surf"],
  ["rally","Rally","RACING","#fbbf24","flag2"],
  ["maze-escape","Maze Escape","PUZZLE","#a855f7","maze"],
  ["frogger","Frogger","CLASSIC","#10b981","frog"],
  ["bomberman","Bomberman","ACTION","#f97316","bomb"],
  ["capture-flag","Capture the Flag","2 PLAYER","#ef4444","flag2"],
  ["tower-stack","Tower Stack","ARCADE","#fbbf24","stack"],
  ["rsc","RuneScape Classic","MMORPG","#22c55e","rsc"],
];

let ok = 0;
for (const [id, title, badge, color, motifKey] of GAMES) {
  const svg = card({ title, badge, color, motif: M[motifKey] });
  const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "sans-serif" } }).render().asPng();
  fs.writeFileSync(path.join(OUT, id + ".png"), png);
  ok++;
}
console.log("generated", ok, "thumbnails to", OUT);
