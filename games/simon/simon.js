/* ===== Simon (mémoire de séquence) ===== */
const GAME_ID = 'simon';

const MODES = [
  { key: 'normal', label: 'Normal', flash: 500, gap: 250 },
  { key: 'rapide', label: 'Rapide', flash: 320, gap: 150 },
];

// Sons via WebAudio : une fréquence par pad.
const TONES = [330, 415, 247, 554];

const Game = {
  mode: MODES[0],
  seq: [],
  input: 0,        // index attendu dans la séquence
  level: 0,
  playing: false,  // séquence en cours de démonstration
  accepting: false,// attend l'entrée du joueur
  audio: null,

  init() {
    mountHeader('🎵 Simon');
    this.renderModes();
    this.bindPads();
    this.showBest();
    this.setLevel(0);
  },

  renderModes() {
    const box = document.getElementById('modes');
    box.innerHTML = '';
    MODES.forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (m.key === this.mode.key ? ' active' : '');
      chip.textContent = m.label;
      chip.onclick = () => { this.mode = m; this.showBest(); this.reset(); };
      box.appendChild(chip);
    });
  },

  layout() {
    const pads = document.getElementById('pads');
    // 2 colonnes, gap 12px ; plafonné pour rester confortable.
    const total = Math.min(boardArea(pads), 340);
    const size = Math.floor((total - 12) / 2);
    pads.querySelectorAll('.pad').forEach(p => {
      p.style.width = size + 'px';
      p.style.height = size + 'px';
    });
  },

  showBest() {
    const best = Records.get(GAME_ID, this.mode.key) || 0;
    document.getElementById('hiscore').textContent = best;
    document.getElementById('best').textContent =
      best ? `Record (${this.mode.label}) : niveau ${best}` : 'Pas encore de record';
  },

  setLevel(n) {
    this.level = n;
    document.getElementById('level').textContent = n;
  },

  reset() {
    this.seq = [];
    this.input = 0;
    this.accepting = false;
    this.playing = false;
    this.setLevel(0);
    document.getElementById('hint').textContent = 'Appuie sur « Jouer ».';
  },

  startRun() {
    if (this.playing) return;
    // Débloque l'audio sur interaction utilisateur.
    if (!this.audio) {
      try { this.audio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.audio = null; }
    }
    this.seq = [];
    this.setLevel(0);
    this.nextRound();
  },

  nextRound() {
    this.input = 0;
    this.seq.push(Math.floor(Math.random() * 4));
    this.setLevel(this.seq.length);
    this.playSequence();
  },

  async playSequence() {
    this.accepting = false;
    this.playing = true;
    document.getElementById('hint').textContent = 'Observe…';
    await this.wait(600);
    for (const i of this.seq) {
      await this.flash(i);
      await this.wait(this.mode.gap);
    }
    this.playing = false;
    this.accepting = true;
    document.getElementById('hint').textContent = 'À toi !';
  },

  flash(i) {
    return new Promise(resolve => {
      const pad = document.querySelector(`.pad[data-i="${i}"]`);
      pad.classList.add('lit');
      this.beep(TONES[i], this.mode.flash);
      setTimeout(() => { pad.classList.remove('lit'); resolve(); }, this.mode.flash);
    });
  },

  wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  beep(freq, ms) {
    if (!this.audio) return;
    const osc = this.audio.createOscillator();
    const gain = this.audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain); gain.connect(this.audio.destination);
    osc.start();
    osc.stop(this.audio.currentTime + ms / 1000);
  },

  bindPads() {
    document.querySelectorAll('.pad').forEach(pad => {
      const i = Number(pad.dataset.i);
      const press = (e) => {
        if (e) e.preventDefault();
        this.tap(i);
      };
      pad.addEventListener('touchstart', press, { passive: false });
      pad.addEventListener('mousedown', press);
    });
  },

  async tap(i) {
    if (!this.accepting) return;
    // Retour visuel + sonore court
    const pad = document.querySelector(`.pad[data-i="${i}"]`);
    pad.classList.add('lit');
    this.beep(TONES[i], 200);
    setTimeout(() => pad.classList.remove('lit'), 160);

    if (i === this.seq[this.input]) {
      this.input++;
      if (this.input === this.seq.length) {
        this.accepting = false;
        vibrate(20);
        await this.wait(500);
        this.nextRound();
      }
    } else {
      this.fail();
    }
  },

  fail() {
    this.accepting = false;
    this.playing = false;
    vibrate(300);
    const reached = this.seq.length - 1; // niveaux complétés
    const isRecord = reached > 0 && Records.submit(GAME_ID, this.mode.key, reached, false);
    document.getElementById('hiscore').textContent = Records.get(GAME_ID, this.mode.key) || 0;
    document.getElementById('overMsg').textContent =
      `${isRecord ? '🏆 Nouveau record — ' : ''}Niveau atteint : ${reached}`;
    document.getElementById('over').classList.add('show');
  },

  closeOver() {
    document.getElementById('over').classList.remove('show');
    this.reset();
  },
};

window.addEventListener('resize', () => Game.layout());
window.onload = () => { Game.init(); Game.layout(); };
