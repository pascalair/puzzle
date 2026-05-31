/* ===== Memory (jeu de paires) ===== */
const GAME_ID = 'memory';
const COLS = 4;

const SYMBOLS = ['🍎','🍌','🍇','🍓','🍑','🍒','🥝','🍍','🥥','🍉','🍊','🫐',
                 '🐶','🐱','🦊','🐼','🐸','🐵','🦁','🐯','🐨','🐰','🐮','🐷'];

const MODES = [
  { key: 'paires-6',  label: '6 paires',  pairs: 6,  daily: false },
  { key: 'paires-8',  label: '8 paires',  pairs: 8,  daily: false },
  { key: 'paires-10', label: '10 paires', pairs: 10, daily: false },
  { key: 'daily',     label: '🗓️ Jour',  pairs: 8,  daily: true },
];

const Game = {
  mode: MODES[1],
  deck: [],          // symboles mélangés
  state: [],         // 'hidden' | 'flipped' | 'matched'
  first: -1,
  moves: 0,
  matched: 0,
  lock: false,

  init() {
    mountHeader('🃏 Memory');
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
    this.renderModes();
    const rng = this.mode.daily ? Daily.rng(GAME_ID) : Math.random;
    const chosen = this.shuffle(SYMBOLS.slice(), rng).slice(0, this.mode.pairs);
    this.deck = this.shuffle([...chosen, ...chosen], rng);
    this.state = this.deck.map(() => 'hidden');
    this.first = -1;
    this.moves = 0;
    this.matched = 0;
    this.lock = false;
    document.getElementById('moves').textContent = '0';
    document.getElementById('pairs').textContent = `0/${this.mode.pairs}`;
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
        ? `✓ Défi du jour réussi${best !== null ? ' — ' + best + ' coups' : ''}`
        : 'Défi du jour : même disposition pour tous aujourd\'hui';
    } else {
      el.textContent = best !== null ? `Record : ${best} coups` : 'Pas encore de record';
    }
  },

  // Fisher-Yates avec RNG injecté (déterministe pour le défi du jour).
  shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  layout() {
    const board = document.getElementById('board');
    // gap 8px entre colonnes, pas de padding sur le board.
    const avail = boardArea(board);
    const size = Math.floor((avail - 8 * (COLS - 1)) / COLS);
    board.style.gridTemplateColumns = `repeat(${COLS}, ${size}px)`;
    this._size = size;
  },

  render() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    const size = this._size;
    this.deck.forEach((sym, i) => {
      const tile = document.createElement('div');
      tile.className = 'card-tile' +
        (this.state[i] === 'flipped' ? ' flipped' : '') +
        (this.state[i] === 'matched' ? ' matched' : '');
      tile.style.width = size + 'px';
      tile.style.height = size + 'px';
      tile.innerHTML = `
        <div class="face back">❓</div>
        <div class="face front" style="font-size:${Math.floor(size * 0.5)}px">${sym}</div>
      `;
      tile.onclick = () => this.flip(i);
      board.appendChild(tile);
    });
  },

  flip(i) {
    if (this.lock || this.state[i] !== 'hidden') return;
    this.state[i] = 'flipped';
    vibrate(8);
    this.render();

    if (this.first === -1) {
      this.first = i;
      return;
    }

    // Deuxième carte retournée => un coup.
    this.moves++;
    document.getElementById('moves').textContent = this.moves;
    const a = this.first;
    this.first = -1;

    if (this.deck[a] === this.deck[i]) {
      this.state[a] = 'matched';
      this.state[i] = 'matched';
      this.matched++;
      document.getElementById('pairs').textContent = `${this.matched}/${this.mode.pairs}`;
      if (this.matched === this.mode.pairs) this.win();
    } else {
      this.lock = true;
      setTimeout(() => {
        this.state[a] = 'hidden';
        this.state[i] = 'hidden';
        this.lock = false;
        this.render();
      }, 700);
    }
  },

  win() {
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
