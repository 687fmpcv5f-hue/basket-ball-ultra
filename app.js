/* app.js — modularized and improved game logic */

/* Utilities */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Sound manager (safe play with promises) */
class Sound {
  constructor(el) { this.el = el; }
  play() { if (!this.el) return; this.el.currentTime = 0; this.el.play().catch(()=>{}); }
  loopStart() { if (!this.el) return; this.el.loop = true; this.el.play().catch(()=>{}); }
  stop() { if (!this.el) return; this.el.pause(); this.el.currentTime = 0; this.el.loop = false; }
}

/* Game class encapsulates state */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // DOM elements
    this.ui = {
      modeLabel: document.getElementById('mode-label'),
      turnLabel: document.getElementById('turn-label'),
      timerEl: document.getElementById('timer'),
      diffEl: document.getElementById('diff'),
      scoreP1El: document.getElementById('score-p1'),
      scoreP2El: document.getElementById('score-p2'),
      powerFill: document.getElementById('power-fill'),
      screenStart: document.getElementById('screen-start'),
      screenPause: document.getElementById('screen-pause'),
      screenOver: document.getElementById('screen-over'),
      finalSummary: document.getElementById('final-summary'),
    };

    // Sounds
    this.sfx = {
      swish: new Sound(document.getElementById('sfx-swish')),
      bounce: new Sound(document.getElementById('sfx-bounce')),
      cheer: new Sound(document.getElementById('sfx-cheer')),
      buzzer: new Sound(document.getElementById('sfx-buzzer')),
      bgm: new Sound(document.getElementById('bgm')),
    };

    this.reset(true);
    this.bindEvents();
    this.lastTime = 0;
    this.running = false;
  }

  reset(initial=false) {
    // Game configuration
    this.mode = 'Solo'; // Solo, PvC, PvP
    this.turn = 1;
    this.diff = 1.0;
    this.timer = 45;
    this.scores = { p1: 0, p2: 0 };
    this.power = 0;
    this.chargeDir = 1;
    this.shot = null; // active shot object
    this.gameOver = false;

    if (!initial) {
      this.ui.scoreP1El.textContent = this.scores.p1;
      this.ui.scoreP2El.textContent = this.scores.p2;
      this.ui.timerEl.textContent = this.timer;
    }
  }

  bindEvents() {
    // Controls
    document.getElementById('btn-start-solo').addEventListener('click', ()=>this.start('Solo'));
    document.getElementById('btn-start-pvc').addEventListener('click', ()=>this.start('PvC'));
    document.getElementById('btn-start-pvp').addEventListener('click', ()=>this.start('PvP'));
    document.getElementById('btn-shoot').addEventListener('click', ()=>this.chargeAndShoot());
    document.getElementById('btn-pause').addEventListener('click', ()=>this.togglePause());
    document.getElementById('btn-reset').addEventListener('click', ()=>this.reset(false));
    document.getElementById('btn-resume').addEventListener('click', ()=>this.resume());
    document.getElementById('btn-play-again').addEventListener('click', ()=>this.restart());

    // Keyboard
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space') { e.preventDefault(); this.chargeAndShoot(); }
      if (e.code === 'KeyP') this.togglePause();
      if (e.code === 'KeyR') this.reset(false);
    });

    // Simple charge on hold
    let chargeStart = null;
    const shootBtn = document.getElementById('btn-shoot');
    shootBtn.addEventListener('mousedown', ()=>{ chargeStart = performance.now(); });
    window.addEventListener('mouseup', ()=>{
      if (chargeStart) {
        const held = (performance.now() - chargeStart)/1000;
        this.takeShot(clamp(held, 0.05, 1.2));
        chargeStart = null;
      }
    });
    // Touch support
    shootBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); chargeStart = performance.now(); });
    window.addEventListener('touchend', ()=>{
      if (chargeStart) {
        const held = (performance.now() - chargeStart)/1000;
        this.takeShot(clamp(held, 0.05, 1.2));
        chargeStart = null;
      }
    });
  }

  start(mode) {
    this.mode = mode || this.mode;
    this.ui.modeLabel.textContent = this.mode;
    this.ui.screenStart.hidden = true;
    this.running = true;
    this.lastTime = performance.now();
    // Try to start background music (may be blocked until user interacts)
    this.sfx.bgm.loopStart();
    requestAnimationFrame((t)=>this.loop(t));
  }

  restart() {
    this.reset(false);
    this.ui.screenOver.hidden = true;
    this.ui.screenStart.hidden = false;
  }

  togglePause() {
    if (!this.running) return;
    this.running = false;
    this.ui.screenPause.hidden = !this.ui.screenPause.hidden;
    if (this.ui.screenPause.hidden) {
      this.resume();
    } else {
      this.sfx.bgm.stop();
    }
  }

  resume() {
    this.ui.screenPause.hidden = true;
    this.sfx.bgm.loopStart();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t)=>this.loop(t));
  }

  chargeAndShoot() {
    // short charge shot for click behavior
    this.takeShot(0.4 + Math.random()*0.45);
  }

  takeShot(powerRatio) {
    // powerRatio: 0.05..1.2
    if (this.shot || !this.running) return;
    const p = clamp(powerRatio, 0.05, 1.2);
    // initial position: near bottom center
    const x0 = this.width * 0.5;
    const y0 = this.height - 70;
    const speed = 6 + p * 18; // tune
    const angle = -Math.PI * (0.45 + (p*0.15)); // more power, flatter arc
    this.shot = {
      x: x0, y: y0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 10,
      alive: true,
      traveled: 0,
    };
    // Immediately update meter UI briefly
    this.ui.powerFill.style.width = `${Math.round(clamp(p,0,1)*100)}%`;
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t)=>this.loop(t));
  }

  update(dt) {
    // Timer decrement
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.endGame();
    }
    this.ui.timerEl.textContent = Math.ceil(this.timer);

    // Update shot physics if present (simple parabolic motion with floor bounce)
    if (this.shot) {
      this.shot.vy += 9.8 * dt; // gravity
      this.shot.x += this.shot.vx;
      this.shot.y += this.shot.vy;
      this.shot.traveled += Math.abs(this.shot.vx) + Math.abs(this.shot.vy);

      // detect simple hoop region (top-right quarter)
      const hoop = { x: this.width * 0.78, y: this.height * 0.28, r: 24 };
      const dx = this.shot.x - hoop.x, dy = this.shot.y - hoop.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < hoop.r && this.shot.vy > -6) {
        // scored
        this.scores.p1 += 2;
        this.ui.scoreP1El.textContent = this.scores.p1;
        this.sfx.swish.play();
        this.spawnScorePopup('+2');
        this.shot = null;
      } else if (this.shot.y > this.height - 18) {
        // bounce on floor
        this.shot.y = this.height - 18;
        this.shot.vy *= -0.45;
        this.shot.vx *= 0.7;
        this.sfx.bounce.play();
        // kill tiny bounces
        if (Math.abs(this.shot.vy) < 0.8) this.shot = null;
      } else if (this.shot.x < -50 || this.shot.x > this.width + 50 || this.shot.traveled > 10000) {
        // out of bounds
        this.shot = null;
      }
    }
  }

  endGame() {
    this.running = false;
    this.ui.screenOver.hidden = false;
    this.ui.finalSummary.textContent = `Final: P1 ${this.scores.p1} — P2 ${this.scores.p2}`;
    this.sfx.buzzer.play();
    this.sfx.bgm.stop();
  }

  spawnScorePopup(text) {
    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = text;
    el.style.left = `${this.width * 0.5}px`;
    el.style.top = `${this.height * 0.4}px`;
    document.getElementById('stage').appendChild(el);
    setTimeout(()=>el.remove(), 900);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.width,this.height);

    // court background
    ctx.fillStyle = '#f3f7fb';
    ctx.fillRect(0,0,this.width,this.height);

    // simple hoop
    const hoopX = this.width * 0.78, hoopY = this.height * 0.28;
    // backboard
    ctx.fillStyle = '#fff'; ctx.fillRect(hoopX+6, hoopY-24, 6, 48);
    // rim
    ctx.beginPath();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 6;
    ctx.arc(hoopX, hoopY, 18, 0, Math.PI*2);
    ctx.stroke();

    // court floor indicator
    ctx.fillStyle = '#e9f6ff';
    ctx.fillRect(0, this.height - 10, this.width, 10);

    // draw shot ball
    if (this.shot) {
      ctx.beginPath();
      ctx.fillStyle = '#ff8b42';
      ctx.arc(this.shot.x, this.shot.y, this.shot.r, 0, Math.PI*2);
      ctx.fill();
      // highlight
      ctx.strokeStyle = '#fff4';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // draw player ball as ready state at bottom center
      const x = this.width * 0.5, y = this.height - 70;
      ctx.beginPath();
      ctx.fillStyle = '#ff8b42';
      ctx.arc(x, y, 10, 0, Math.PI*2);
      ctx.fill();
    }

    // UI overlays (scores)
    ctx.fillStyle = '#222';
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0,0,120,44);
    ctx.globalAlpha = 1;
  }
}

/* Init on DOM ready */
window.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('game');
  // scale canvas for devicePixelRatio
  const dpr = window.devicePixelRatio || 1;
  canvas.width *= dpr;
  canvas.height *= dpr;
  canvas.style.width = `${canvas.width/dpr}px`;
  canvas.style.height = `${canvas.height/dpr}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const game = new Game(canvas);
  // Show start screen and wait for user input
  document.getElementById('screen-start').hidden = false;
});
