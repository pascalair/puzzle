/* ===== Snake ===== */
const GAME_ID = 'snake';
const CELLS = 17; // grille carrée CELLS×CELLS

const MODES = [
  { key: 'lent',   label: 'Lent',   step: 180 },
  { key: 'normal', label: 'Normal', step: 120 },
  { key: 'rapide', label: 'Rapide', step: 80 },
];

const Game = {
  mode: MODES[1],
  snake: [],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: { x: 0, y: 0 },
  score: 0,
  running: false,
  loop: null,
  cell: 20,

  init() {
    mountHeader('🐍 Snake');
    this.renderModes();
    this.bindInput();
    this.layout();
    this.reset();
  },

  renderModes() {
    const box = document.getElementById('modes');
    box.innerHTML = '';
    MODES.forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (m.key === this.mode.key ? ' active' : '');
      chip.textContent = m.label;
      chip.onclick = () => { this.mode = m; this.restart(); };
      box.appendChild(chip);
    });
  },

  layout() {
    const canvas = document.getElementById('board');
    const avail = boardArea(canvas);
    this.cell = Math.floor(Math.min(avail, 440) / CELLS);
    const px = this.cell * CELLS;
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';
  },

  reset() {
    this.stop();
    this.renderModes();
    const mid = Math.floor(CELLS / 2);
    this.snake = [{ x: mid - 1, y: mid }, { x: mid, y: mid }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.running = false;
    document.getElementById('score').textContent = '0';
    this.showBest();
    this.placeFood();
    this.draw();
  },

  restart() { this.layout(); this.reset(); },

  showBest() {
    const best = Records.get(GAME_ID, this.mode.key) || 0;
    document.getElementById('hiscore').textContent = best;
    document.getElementById('best').textContent =
      best ? `Record (${this.mode.label}) : ${best}` : 'Pas encore de record';
  },

  startRun() {
    if (this.running) return;
    this.running = true;
    this.loop = setInterval(() => this.tick(), this.mode.step);
  },

  stop() {
    this.running = false;
    if (this.loop) { clearInterval(this.loop); this.loop = null; }
  },

  placeFood() {
    let p;
    do {
      p = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
    } while (this.snake.some(s => s.x === p.x && s.y === p.y));
    this.food = p;
  },

  tick() {
    this.dir = this.nextDir;
    const head = { x: this.snake[this.snake.length - 1].x + this.dir.x,
                   y: this.snake[this.snake.length - 1].y + this.dir.y };

    // Collision murs ou corps => fin
    if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.push(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      document.getElementById('score').textContent = this.score;
      vibrate(8);
      this.placeFood();
    } else {
      this.snake.shift(); // avance sans grandir
    }
    this.draw();
  },

  draw() {
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#667eea';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nourriture
    ctx.fillStyle = '#e74c3c';
    this.cellRect(ctx, this.food.x, this.food.y, 0.5);

    // Serpent
    this.snake.forEach((s, i) => {
      ctx.fillStyle = i === this.snake.length - 1 ? '#2ecc71' : accent;
      this.cellRect(ctx, s.x, s.y, 0.5);
    });
  },

  cellRect(ctx, x, y, radius) {
    const pad = 1;
    ctx.beginPath();
    const px = x * this.cell + pad, py = y * this.cell + pad;
    const size = this.cell - pad * 2;
    const r = size * radius * 0.4;
    ctx.roundRect ? ctx.roundRect(px, py, size, size, r) : ctx.rect(px, py, size, size);
    ctx.fill();
  },

  gameOver() {
    this.stop();
    vibrate(300);
    const isRecord = Records.submit(GAME_ID, this.mode.key, this.score, false);
    document.getElementById('hiscore').textContent = Records.get(GAME_ID, this.mode.key) || 0;
    document.getElementById('overMsg').textContent =
      `${isRecord ? '🏆 Nouveau record — ' : ''}Score : ${this.score}`;
    document.getElementById('over').classList.add('show');
  },

  closeOver() { document.getElementById('over').classList.remove('show'); },

  setDir(x, y) {
    // Interdit le demi-tour direct.
    if (x === -this.dir.x && y === -this.dir.y) return;
    this.nextDir = { x, y };
    if (!this.running) this.startRun();
  },

  bindInput() {
    document.addEventListener('keydown', (e) => {
      const map = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      if (map[e.key]) { e.preventDefault(); this.setDir(...map[e.key]); }
    });

    const canvas = document.getElementById('board');
    let sx = 0, sy = 0;
    canvas.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) this.setDir(dx > 0 ? 1 : -1, 0);
      else this.setDir(0, dy > 0 ? 1 : -1);
    }, { passive: true });
  },
};

window.addEventListener('resize', () => { Game.layout(); Game.draw(); });
window.onload = () => Game.init();
