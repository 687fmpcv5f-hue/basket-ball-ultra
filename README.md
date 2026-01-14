# basket-ball-ultra
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Basketball Elite — Unified</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* --- Styles merged from all versions --- */
:root {
  --bg1:#0f2027;--bg2:#203a43;--bg3:#2c5364;
  --panel:#0b1220;--text:#e5e7eb;--accent:#f59e0b;
  --success:#22c55e;--danger:#ef4444;--border:#1f2937;
  --glass:rgba(17,24,39,0.6);--p1:#60a5fa;--p2:#f472b6;
}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:var(--text);
background:linear-gradient(180deg,var(--bg1),var(--bg2),var(--bg3));}
#app{display:grid;grid-template-rows:auto 1fr auto;min-height:100vh;}
header,footer{background:var(--glass);padding:10px 16px;display:flex;
justify-content:space-between;align-items:center;}
footer{border-top:1px solid var(--border);}
.brand{font-weight:700;}
.hud{display:flex;gap:12px;flex-wrap:wrap;}
.pill{background:rgba(255,255,255,0.08);border:1px solid var(--border);
border-radius:999px;padding:6px 12px;}
main{display:grid;grid-template-columns:1fr 340px;gap:16px;padding:16px;}
@media(max-width:900px){main{grid-template-columns:1fr;}}
.panel{background:var(--glass);border:1px solid var(--border);
border-radius:12px;padding:12px;}
#stage{position:relative;display:flex;align-items:center;justify-content:center;}
canvas{background:linear-gradient(#87ceeb,#bde0ff);border:4px solid #fff;
border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.3);touch-action:none;}
.overlay{position:absolute;inset:0;display:grid;place-items:center;
background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);z-index:10;}
.modal{background:rgba(17,24,39,0.85);border-radius:16px;padding:20px;
width:min(560px,92vw);text-align:center;}
button{background:#1f2430;color:var(--text);border:1px solid #2a3140;
border-radius:10px;padding:10px 14px;cursor:pointer;}
button:hover{border-color:var(--accent);color:var(--accent);}
.score-popup{position:absolute;color:#ffd166;font-weight:800;font-size:1.6rem;
animation:pop 0.8s forwards;}
@keyframes pop{0%{opacity:1;transform:translateY(0);}100%{opacity:0;transform:translateY(-60px) scale(1.2);}}
.net-swish{animation:netSwish 0.35s;}
@keyframes netSwish{0%{transform:translateY(0);}50%{transform:translateY(6px);}100%{transform:translateY(0);}}
.bg-transition{animation:bgPulse 2s;}
@keyframes bgPulse{0%{filter:saturate(1);}50%{filter:saturate(1.3) brightness(1.05);}100%{filter:saturate(1);}}
.meter{height:10px;background:#2a3140;border-radius:999px;overflow:hidden;}
.meter .fill{height:100%;width:0%;background:var(--accent);transition:width 0.15s;}
.p1{color:var(--p1);} .p2{color:var(--p2);}
</style>
</head>
<body>
<div id="app">
<header>
  <div class="brand">Basketball Elite</div>
  <div class="hud">
    <div class="pill">Mode: <span id="mode-label">Solo</span></div>
    <div class="pill">Turn: <span id="turn-label" class="p1">P1</span></div>
    <div class="pill">Time: <span id="timer">45</span>s</div>
    <div class="pill">Diff: <span id="diff">1.0</span></div>
  </div>
  <div class="hud">
    <div class="pill p1">P1 Score: <span id="score-p1">0</span></div>
    <div class="pill p2">P2/AI Score: <span id="score-p2">0</span></div>
  </div>
</header>
<main>
<section id="stage" class="panel">
  <canvas id="game" width="480" height="720"></canvas>
  <!-- Start screen -->
  <div id="screen-start" class="overlay">
    <div class="modal">
      <h2>Basketball Elite</h2>
      <p>Choose a mode.</p>
      <div class="actions">
        <button id="btn-start-solo">Solo</button>
        <button id="btn-start-pvc">PvC</button>
        <button id="btn-start-pvp">PvP</button>
      </div>
    </div>
  </div>
  <!-- Pause -->
  <div id="screen-pause" class="overlay" hidden>
    <div class="modal"><h2>Paused</h2><button id="btn-resume">Resume</button></div>
  </div>
  <!-- Game Over -->
  <div id="screen-over" class="overlay" hidden>
    <div class="modal"><h2>Game Over</h2><p id="final-summary"></p>
      <button id="btn-play-again">Play Again</button></div>
  </div>
</section>
<aside class="panel">
  <h3>Controls</h3>
  <button id="btn-shoot">Shoot</button>
  <button id="btn-pause">Pause</button>
  <button id="btn-reset">Reset</button>
  <div class="meter"><div id="power-fill" class="fill"></div></div>
</aside>
</main>
<footer><div>Built with HTML, CSS, JS</div></footer>
</div>

<!-- Sounds -->
<audio id="sfx-swish" src="swish.mp3" preload="auto"></audio>
<audio id="sfx-bounce" src="bounce.mp3" preload="auto"></audio>
<audio id="sfx-cheer" src="cheer.mp3" preload="auto"></audio>
<audio id="sfx-buzzer" src="buzzer.mp3" preload="auto"></audio>
<audio id="bgm" src="bgm.mp3" preload="auto" loop></audio>

<script>
/* --- Unified JS: mechanics, animations, sound, modes --- */
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const modeLabel=document.getElementById('mode-label'),turnLabel=document.getElementById('turn-label');
const timerEl=document.getElementById('timer'),diffEl=document.getElementById('diff');
const scoreP1El=document.getElementById('score-p1'),scoreP2El=document.getElementById('score-p2');
const powerFill=document.getElementById('power-fill');
const screenStart=document.getElementById('screen-start'),screenPause=document.getElementById('screen-pause'),screenOver=document.getElementById('screen-over');
const finalSummary=document.getElementById('final-summary');
const btnStartSolo=document.getElementById('btn-start-solo'),btnStartPvC=document.getElementById('btn-start-pvc'),btnStartPvP=document.getElementById('btn-start-pvp');
const btnShoot=document.getElementById('btn-shoot'),btnPause=document.getElementById('btn-pause'),btnReset=document.getElementById('btn-reset');
const btnResume=document.getElementById('btn-resume'),btnPlayAgain=document.getElementById('btn-play-again');
const sfxSwish=document.getElementById('sfx-swish'),sfxBounce=document.getElementById('sfx-bounce'),sfx
