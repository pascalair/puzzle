/* ===== 2048 ===== */
const GAME_ID = '2048';

const MODES = [
  { key: 'classique', label: '4×4', size: 4, daily: false },
  { key: 'grand',     label: '5×5', size: 5, daily: false },
  { key: 'daily',     label: '🗓️ Jour', size: 4, daily: true },
];

const Game = {
  mode: MODES[0],
  size: 4,
  grid: [],
  score: 0,
  rng: Math.random,
  won: false,
  alive: true,

  init() {
    mountHeader('🔢 2048');
    this.renderModes();
    this.bindInput();
    this.start();
  },

  renderModes() {
    const box = document.getElementById('modes');
    box.innerHTML = '';
    MODES.forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (m.key === this.mode.key ? ' active' : '');
      chip.textContent = m.label;
      chip.onclick = () => { this.mode = m; this.start(); };
      box.appendChild(chip);
    });
  },

  start() {
    this.size = this.mode.size;
    this.renderModes();
    this.score = 0;
    this.won = false;
    this.alive = true;
    this.rng = this.mode.daily ? Daily.rng(GAME_ID) : Math.random;
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.addTile();
    this.addTile();
    this.updateScore();
    this.showBest();
    this.layout();
    this.render();
  },

  restart() { this.start(); },

  showBest() {
    const best = Records.get(GAME_ID, this.mode.key) || 0;
    document.getElementById('hiscore').textContent = best;
    const el = document.getElementById('best');
    if (this.mode.daily) {
      el.textContent = Daily.doneToday(GAME_ID)
        ? '✓ Défi du jour joué — même tirage pour tous'
        : 'Défi du jour : même séquence de tuiles pour tous';
    } else {
      el.textContent = best ? `Record : ${best}` : 'Pas encore de record';
    }
  },

  layout() {
    const board = document.getElementById('board');
    const maxWidth = Math.min(window.innerWidth * 0.88, 460);
    const gap = 8;
    const cell = Math.floor((maxWidth - gap * (this.size + 1)) / this.size);
    board.style.width = (cell * this.size + gap * (this.size + 1)) + 'px';
    board.style.gridTemplateColumns = `repeat(${this.size}, ${cell}px)`;
    board.style.gridTemplateRows = `repeat(${this.size}, ${cell}px)`;
    board.style.setProperty('--fs', Math.floor(cell * 0.42) + 'px');
  },

  emptyCells() {
    const cells = [];
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        if (this.grid[r][c] === 0) cells.push([r, c]);
    return cells;
  },

  addTile() {
    const empty = this.emptyCells();
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(this.rng() * empty.length)];
    this.grid[r][c] = this.rng() < 0.9 ? 2 : 4;
    this._popCells = this._popCells || new Set();
    this._popCells.add(r * this.size + c);
  },

  render() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    const pops = this._popCells || new Set();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const v = this.grid[r][c];
        const cell = document.createElement('div');
        cell.className = 'cell' + (v > 2048 ? ' big' : '') + (pops.has(r * this.size + c) ? ' pop' : '');
        cell.dataset.v = v;
        cell.textContent = v || '';
        board.appendChild(cell);
      }
    }
    this._popCells = new Set();
  },

  updateScore() {
    document.getElementById('score').textContent = this.score;
  },

  /* --- Logique de déplacement --- */
  // Compacte + fusionne une ligne vers la gauche. Renvoie {line, gained}.
  slide(line) {
    const nums = line.filter(v => v !== 0);
    let gained = 0;
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i] === nums[i + 1]) {
        nums[i] *= 2;
        gained += nums[i];
        if (nums[i] === 2048) this.won = true;
        nums.splice(i + 1, 1);
      }
    }
    while (nums.length < this.size) nums.push(0);
    return { line: nums, gained };
  },

  // dir: 'left' | 'right' | 'up' | 'down'
  move(dir) {
    if (!this.alive) return;
    const before = JSON.stringify(this.grid);
    let gained = 0;

    const rows = this.toRows(dir);
    const newRows = rows.map(row => {
      const { line, gained: g } = this.slide(row);
      gained += g;
      return line;
    });
    this.fromRows(newRows, dir);

    if (JSON.stringify(this.grid) === before) return; // rien n'a bougé

    this.score += gained;
    this.addTile();
    this.updateScore();
    vibrate(8);
    this.render();
    this.checkState();
  },

  // Transforme la grille en lignes orientées pour fusionner "vers la gauche".
  toRows(dir) {
    const n = this.size, g = this.grid, rows = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        if (dir === 'left')  row.push(g[i][j]);
        if (dir === 'right') row.push(g[i][n - 1 - j]);
        if (dir === 'up')    row.push(g[j][i]);
        if (dir === 'down')  row.push(g[n - 1 - j][i]);
      }
      rows.push(row);
    }
    return rows;
  },

  fromRows(rows, dir) {
    const n = this.size, g = this.grid;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = rows[i][j];
        if (dir === 'left')  g[i][j] = v;
        if (dir === 'right') g[i][n - 1 - j] = v;
        if (dir === 'up')    g[j][i] = v;
        if (dir === 'down')  g[n - 1 - j][i] = v;
      }
    }
  },

  movesAvailable() {
    if (this.emptyCells().length) return true;
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) {
        const v = this.grid[r][c];
        if (c < this.size - 1 && this.grid[r][c + 1] === v) return true;
        if (r < this.size - 1 && this.grid[r + 1][c] === v) return true;
      }
    return false;
  },

  checkState() {
    // Record + marquage du défi du jour dès qu'on a un score.
    Records.submit(GAME_ID, this.mode.key, this.score, false);
    document.getElementById('hiscore').textContent =
      Records.get(GAME_ID, this.mode.key) || 0;

    if (this.won && !this._wonShown) {
      this._wonShown = true;
      if (this.mode.daily) Daily.markDone(GAME_ID);
      vibrate([100, 50, 100, 50, 200]);
      this.showOver('🎉 2048 !', 'Tu as atteint 2048. Continue ou rejoue.', true);
      return;
    }
    if (!this.movesAvailable()) {
      this.alive = false;
      if (this.mode.daily) Daily.markDone(GAME_ID);
      vibrate(200);
      this.showOver('Partie terminée', 'Plus de coups possibles.', false);
    }
  },

  showOver(title, msg, canContinue) {
    document.getElementById('overTitle').textContent = title;
    document.getElementById('overMsg').textContent = msg;
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('continueBtn').style.display = canContinue ? '' : 'none';
    document.getElementById('over').classList.add('show');
  },

  keepGoing() { this.closeOver(); },
  closeOver() { document.getElementById('over').classList.remove('show'); },

  /* --- Entrées clavier + tactile --- */
  bindInput() {
    document.addEventListener('keydown', (e) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[e.key]) { e.preventDefault(); this.move(map[e.key]); }
    });

    const board = document.getElementById('board');
    let sx = 0, sy = 0;
    board.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    board.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 24) return;
      if (ax > ay) this.move(dx > 0 ? 'right' : 'left');
      else this.move(dy > 0 ? 'down' : 'up');
    }, { passive: true });
  },
};

window.addEventListener('resize', () => { Game.layout(); Game.render(); });
window.onload = () => Game.init();
