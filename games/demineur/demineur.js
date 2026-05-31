/* ===== Démineur ===== */
const GAME_ID = 'demineur';

const MODES = [
  { key: 'facile',    label: 'Facile',  cols: 9,  rows: 9,  mines: 10, daily: false },
  { key: 'moyen',     label: 'Moyen',   cols: 12, rows: 12, mines: 24, daily: false },
  { key: 'difficile', label: 'Difficile', cols: 14, rows: 14, mines: 40, daily: false },
  { key: 'daily',     label: '🗓️ Jour', cols: 12, rows: 12, mines: 24, daily: true },
];

const Game = {
  mode: MODES[1],
  cols: 12, rows: 12, mines: 24,
  cells: [],          // { mine, revealed, flagged, count }
  flagMode: false,
  started: false,     // mines placées après le 1er clic
  alive: true,
  flagsUsed: 0,
  revealedCount: 0,
  startTime: 0,
  timer: null,

  init() {
    mountHeader('💣 Démineur');
    this.renderModes();
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
    this.cols = this.mode.cols;
    this.rows = this.mode.rows;
    this.mines = this.mode.mines;
    this.renderModes();
    this.cells = Array.from({ length: this.cols * this.rows }, () => ({
      mine: false, revealed: false, flagged: false, count: 0,
    }));
    this.started = false;
    this.alive = true;
    this.flagsUsed = 0;
    this.revealedCount = 0;
    this.flagMode = false;
    document.getElementById('flagBtn').classList.remove('armed');
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.getElementById('time').textContent = '00:00';
    this.updateMinesLeft();
    this.showBest();
    this.layout();
    this.render();
  },

  restart() { this.start(); },

  showBest() {
    const best = Records.get(GAME_ID, this.mode.key);
    const el = document.getElementById('best');
    if (this.mode.daily) {
      el.textContent = Daily.doneToday(GAME_ID)
        ? `✓ Défi du jour réussi${best !== null ? ' — ' + formatTime(best) : ''}`
        : 'Défi du jour : même grille pour tous aujourd\'hui';
    } else {
      el.textContent = best !== null ? `Record : ${formatTime(best)}` : 'Pas encore de record';
    }
  },

  layout() {
    const board = document.getElementById('board');
    const maxWidth = Math.min(window.innerWidth * 0.92, 460);
    const cell = Math.floor((maxWidth - 2 * (this.cols + 1)) / this.cols);
    board.style.gridTemplateColumns = `repeat(${this.cols}, ${cell}px)`;
    this._cellSize = cell;
  },

  idx(r, c) { return r * this.cols + c; },
  inBounds(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols; },

  neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (this.inBounds(r + dr, c + dc)) out.push([r + dr, c + dc]);
      }
    return out;
  },

  // Place les mines en évitant la 1re case cliquée et ses voisines.
  placeMines(safeR, safeC) {
    const rng = this.mode.daily ? Daily.rng(GAME_ID) : Math.random;
    const forbidden = new Set([this.idx(safeR, safeC)]);
    this.neighbors(safeR, safeC).forEach(([r, c]) => forbidden.add(this.idx(r, c)));

    let placed = 0;
    // Garde-fou : si la grille est trop petite pour exclure les voisines.
    const maxMines = Math.min(this.mines, this.cols * this.rows - forbidden.size);
    while (placed < maxMines) {
      const i = Math.floor(rng() * this.cells.length);
      if (forbidden.has(i) || this.cells[i].mine) continue;
      this.cells[i].mine = true;
      placed++;
    }
    // Calcul des compteurs
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[this.idx(r, c)].mine) continue;
        this.cells[this.idx(r, c)].count =
          this.neighbors(r, c).filter(([nr, nc]) => this.cells[this.idx(nr, nc)].mine).length;
      }
    this.started = true;
    this.startTimer();
  },

  render() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    const size = this._cellSize;
    const fs = Math.floor(size * 0.55);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[this.idx(r, c)];
        const el = document.createElement('div');
        el.className = 'cell';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.fontSize = fs + 'px';
        if (cell.revealed) {
          el.classList.add('revealed');
          if (cell.mine) {
            el.classList.add('mine');
            el.textContent = '💣';
          } else if (cell.count > 0) {
            el.classList.add('c' + cell.count);
            el.textContent = cell.count;
          }
        } else if (cell.flagged) {
          el.classList.add('flag');
          el.textContent = '🚩';
        }
        el.addEventListener('click', () => this.tap(r, c));
        this.bindLongPress(el, r, c);
        board.appendChild(el);
      }
    }
  },

  // Appui long = poser/retirer un drapeau (alternative au mode drapeau).
  bindLongPress(el, r, c) {
    let timer;
    el.addEventListener('touchstart', () => {
      timer = setTimeout(() => { timer = null; this.flag(r, c); }, 350);
    }, { passive: true });
    const cancel = () => { if (timer) { clearTimeout(timer); } };
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    // Clic droit sur PC
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.flag(r, c); });
  },

  tap(r, c) {
    if (!this.alive) return;
    if (this.flagMode) { this.flag(r, c); return; }
    const cell = this.cells[this.idx(r, c)];
    if (cell.flagged) return;
    if (!this.started) this.placeMines(r, c);
    if (cell.revealed) return;

    if (cell.mine) { this.reveal(r, c); this.lose(); return; }
    this.floodReveal(r, c);
    vibrate(8);
    this.render();
    this.checkWin();
  },

  flag(r, c) {
    if (!this.alive) return;
    const cell = this.cells[this.idx(r, c)];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.flagsUsed += cell.flagged ? 1 : -1;
    vibrate(8);
    this.updateMinesLeft();
    this.render();
  },

  reveal(r, c) {
    const cell = this.cells[this.idx(r, c)];
    if (!cell.revealed) { cell.revealed = true; if (!cell.mine) this.revealedCount++; }
  },

  // Révèle en cascade les cases vides (compteur 0).
  floodReveal(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const cell = this.cells[this.idx(cr, cc)];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      this.revealedCount++;
      if (cell.count === 0) {
        this.neighbors(cr, cc).forEach(([nr, nc]) => {
          if (!this.cells[this.idx(nr, nc)].revealed) stack.push([nr, nc]);
        });
      }
    }
  },

  updateMinesLeft() {
    document.getElementById('minesLeft').textContent = this.mines - this.flagsUsed;
  },

  toggleFlagMode() {
    this.flagMode = !this.flagMode;
    document.getElementById('flagBtn').classList.toggle('armed', this.flagMode);
  },

  checkWin() {
    const safe = this.cols * this.rows - this.mines;
    if (this.revealedCount < safe) return;
    this.alive = false;
    clearInterval(this.timer);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const isRecord = Records.submit(GAME_ID, this.mode.key, elapsed, true);
    if (this.mode.daily) Daily.markDone(GAME_ID);
    vibrate([100, 50, 100, 50, 200]);
    document.getElementById('overTitle').textContent = '🎉 Gagné !';
    document.getElementById('overMsg').textContent =
      `${isRecord ? '🏆 Nouveau record — ' : ''}Temps : ${formatTime(elapsed)}`;
    document.getElementById('over').classList.add('show');
  },

  lose() {
    this.alive = false;
    clearInterval(this.timer);
    vibrate(300);
    // Révèle toutes les mines
    this.cells.forEach(cell => { if (cell.mine) cell.revealed = true; });
    this.render();
    document.getElementById('overTitle').textContent = '💥 Perdu';
    document.getElementById('overMsg').textContent = 'Tu as touché une mine.';
    document.getElementById('over').classList.add('show');
  },

  closeOver() { document.getElementById('over').classList.remove('show'); },

  startTimer() {
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      document.getElementById('time').textContent = formatTime(elapsed);
    }, 1000);
  },
};

window.addEventListener('resize', () => { Game.layout(); Game.render(); });
window.onload = () => Game.init();
