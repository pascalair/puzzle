/* ===== Lights Out ===== */
const GAME_ID = 'lightsout';

const MODES = [
  { key: 'taille-3', label: '3×3', size: 3, daily: false },
  { key: 'taille-5', label: '5×5', size: 5, daily: false },
  { key: 'daily',    label: '🗓️ Jour', size: 5, daily: true },
];

const Game = {
  mode: MODES[1],
  size: 5,
  grid: [],     // true = allumée
  moves: 0,

  init() {
    mountHeader('💡 Lights Out');
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
    this.size = this.mode.size;
    this.renderModes();
    this.moves = 0;
    document.getElementById('moves').textContent = '0';
    this.scramble();
    this.showBest();
    this.layout();
    this.render();
    this.updateOnCount();
  },

  restart() { this.start(); },

  showBest() {
    const best = Records.get(GAME_ID, this.mode.key);
    const el = document.getElementById('best');
    if (this.mode.daily) {
      el.textContent = Daily.doneToday(GAME_ID)
        ? `✓ Défi du jour réussi${best !== null ? ' — ' + best + ' coups' : ''}`
        : 'Défi du jour : même grille pour tous aujourd\'hui';
    } else {
      el.textContent = best !== null ? `Record : ${best} coups` : 'Pas encore de record';
    }
  },

  // On part de tout éteint et on applique des bascules aléatoires :
  // la configuration obtenue est donc toujours résoluble.
  scramble() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const rng = this.mode.daily ? Daily.rng(GAME_ID) : Math.random;
    const presses = this.size * this.size;
    let changed = false;
    while (!changed) {
      for (let i = 0; i < presses; i++) {
        const r = Math.floor(rng() * this.size);
        const c = Math.floor(rng() * this.size);
        this.toggle(r, c);
      }
      changed = this.grid.some(row => row.some(Boolean)); // éviter une grille déjà résolue
    }
  },

  toggle(r, c) {
    const flip = (rr, cc) => {
      if (rr >= 0 && rr < this.size && cc >= 0 && cc < this.size)
        this.grid[rr][cc] = !this.grid[rr][cc];
    };
    flip(r, c); flip(r - 1, c); flip(r + 1, c); flip(r, c - 1); flip(r, c + 1);
  },

  layout() {
    const board = document.getElementById('board');
    // padding 6px (=12 total) + gap 6px entre cases.
    const avail = boardArea(board);
    const cell = Math.floor((avail - 12 - 6 * (this.size - 1)) / this.size);
    board.style.gridTemplateColumns = `repeat(${this.size}, ${cell}px)`;
    this._cell = cell;
  },

  render() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const el = document.createElement('div');
        el.className = 'light' + (this.grid[r][c] ? ' on' : '');
        el.style.width = this._cell + 'px';
        el.style.height = this._cell + 'px';
        el.onclick = () => this.press(r, c);
        board.appendChild(el);
      }
    }
  },

  press(r, c) {
    this.toggle(r, c);
    this.moves++;
    document.getElementById('moves').textContent = this.moves;
    vibrate(8);
    this.render();
    this.updateOnCount();
    this.checkWin();
  },

  updateOnCount() {
    const on = this.grid.reduce((s, row) => s + row.filter(Boolean).length, 0);
    document.getElementById('onCount').textContent = on;
  },

  checkWin() {
    const solved = this.grid.every(row => row.every(v => !v));
    if (!solved) return;
    const isRecord = Records.submit(GAME_ID, this.mode.key, this.moves, true);
    if (this.mode.daily) Daily.markDone(GAME_ID);
    vibrate([100, 50, 100, 50, 200]);
    document.getElementById('overMsg').textContent =
      `${isRecord ? '🏆 Nouveau record — ' : ''}Réussi en ${this.moves} coups !`;
    document.getElementById('over').classList.add('show');
  },

  closeOver() { document.getElementById('over').classList.remove('show'); },
};

window.addEventListener('resize', () => { Game.layout(); Game.render(); });
window.onload = () => Game.init();
