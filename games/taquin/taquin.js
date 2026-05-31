/* ===== Taquin ===== */
const GAME_ID = 'taquin';

// Modes jouables : tailles classiques + défi du jour (taille fixe 4×4, seedé).
const MODES = [
  { key: 'taille-3', label: '3×3', size: 3, daily: false },
  { key: 'taille-4', label: '4×4', size: 4, daily: false },
  { key: 'taille-5', label: '5×5', size: 5, daily: false },
  { key: 'daily',    label: '🗓️ Jour', size: 4, daily: true },
];

const Game = {
  mode: MODES[1],
  size: 4,
  tiles: [],
  moves: 0,

  init() {
    mountHeader('🧩 Taquin');
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

  tileSize() {
    const maxWidth = Math.min(window.innerWidth * 0.85, 450);
    return Math.floor(maxWidth / this.size) - 5;
  },

  start() {
    this.size = this.mode.size;
    this.renderModes();
    this.showBest();

    this.tiles = Array.from({ length: this.size * this.size - 1 }, (_, i) => i + 1);
    this.tiles.push(0);

    // Défi du jour : mélange déterministe via le RNG seedé par la date.
    const rnd = this.mode.daily ? Daily.rng(GAME_ID) : Math.random;
    this.shuffle(rnd);

    this.moves = 0;
    document.getElementById('moves').textContent = '0';
    this.render();
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

  shuffle(rnd) {
    // Mélange par coups valides successifs => toujours résoluble.
    const count = 1000 + this.size * 200;
    for (let i = 0; i < count; i++) {
      const valid = this.validMoves();
      const move = valid[Math.floor(rnd() * valid.length)];
      this.swap(move, this.tiles.indexOf(0));
    }
  },

  validMoves() {
    const empty = this.tiles.indexOf(0);
    const row = Math.floor(empty / this.size);
    const col = empty % this.size;
    const valid = [];
    if (row > 0) valid.push(empty - this.size);
    if (row < this.size - 1) valid.push(empty + this.size);
    if (col > 0) valid.push(empty - 1);
    if (col < this.size - 1) valid.push(empty + 1);
    return valid;
  },

  swap(i, j) {
    [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
  },

  render() {
    const puzzle = document.getElementById('puzzle');
    const size = this.tileSize();
    puzzle.style.gridTemplateColumns = `repeat(${this.size}, ${size}px)`;
    puzzle.innerHTML = '';
    this.tiles.forEach((num, index) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.style.width = size + 'px';
      tile.style.height = size + 'px';
      if (num === 0) {
        tile.classList.add('empty');
      } else {
        tile.textContent = num;
        tile.onclick = () => this.move(index);
        tile.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.move(index);
        }, { passive: false });
      }
      puzzle.appendChild(tile);
    });
  },

  move(index) {
    if (!this.validMoves().includes(index)) return;
    this.swap(index, this.tiles.indexOf(0));
    this.moves++;
    document.getElementById('moves').textContent = this.moves;
    vibrate(10);
    this.render();
    this.checkWin();
  },

  checkWin() {
    const win = this.tiles.every((num, i) =>
      i === this.tiles.length - 1 ? num === 0 : num === i + 1);
    if (!win) return;

    vibrate([100, 50, 100, 50, 200]);

    // Le taquin récompense la réflexion : record sur le nombre de coups.
    const isRecord = Records.submit(GAME_ID, this.mode.key, this.moves, true);
    if (this.mode.daily) Daily.markDone(GAME_ID);

    document.getElementById('vMsg').textContent =
      isRecord ? '🏆 Nouveau record !' : 'Puzzle résolu !';
    document.getElementById('finalMoves').textContent = this.moves;
    document.getElementById('victory').classList.add('show');
  },

  closeVictory() {
    document.getElementById('victory').classList.remove('show');
  },
};

window.addEventListener('resize', () => Game.render());
window.onload = () => Game.init();
