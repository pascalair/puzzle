/* ===== Mini-Jeux — couche partagée (storage, thème, seed du jour, helpers) ===== */

/* --- Thème clair/sombre --- */
const Theme = {
  KEY: 'mj-theme',
  get() {
    return localStorage.getItem(this.KEY) || 'light';
  },
  apply(value) {
    document.documentElement.setAttribute('data-theme', value);
  },
  set(value) {
    localStorage.setItem(this.KEY, value);
    this.apply(value);
  },
  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },
};
// Applique tout de suite pour éviter le flash (le script <head> le fait déjà,
// mais on garantit l'état si core.js est chargé seul).
Theme.apply(Theme.get());

/* --- Records (meilleurs scores en localStorage) --- */
const Records = {
  key(gameId, mode) {
    return `mj-best:${gameId}:${mode}`;
  },
  /**
   * Renvoie le meilleur score enregistré pour ce jeu/mode, ou null.
   */
  get(gameId, mode) {
    const raw = localStorage.getItem(this.key(gameId, mode));
    return raw === null ? null : Number(raw);
  },
  /**
   * Enregistre `value` si c'est un nouveau record.
   * lowerIsBetter = true pour temps/coups, false pour score (2048).
   * Renvoie true si un nouveau record a été établi.
   */
  submit(gameId, mode, value, lowerIsBetter = true) {
    const current = this.get(gameId, mode);
    const better =
      current === null ||
      (lowerIsBetter ? value < current : value > current);
    if (better) {
      localStorage.setItem(this.key(gameId, mode), String(value));
    }
    return better;
  },
};

/* --- Défi du jour : PRNG seedé par la date --- */
const Daily = {
  /** Chaîne de date locale YYYY-MM-DD. */
  today() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },
  /** Hash 32 bits d'une chaîne (FNV-1a). */
  hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  },
  /**
   * Générateur déterministe (mulberry32) pour un jeu donné, basé sur la date.
   * Renvoie une fonction () => float dans [0,1).
   */
  rng(gameId, date = this.today()) {
    let a = this.hash(`${date}:${gameId}`);
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  /** Le défi du jour a-t-il déjà été réussi pour ce jeu ? */
  doneToday(gameId) {
    return localStorage.getItem(`mj-daily:${gameId}`) === this.today();
  },
  markDone(gameId) {
    localStorage.setItem(`mj-daily:${gameId}`, this.today());
  },
};

/* --- Helpers UI --- */
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/**
 * Largeur utile réelle pour une grille, à l'intérieur de la carte parente
 * (déduit le padding de la carte). Évite les débordements sur petit écran.
 */
function boardArea(board) {
  const card = board.closest('.card') || board.parentElement;
  const cs = getComputedStyle(card);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  return card.clientWidth - pad;
}

let _toastTimer;
function toast(message, duration = 1800) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  // Reflow pour relancer la transition
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/**
 * Construit l'en-tête commun (retour vers le hub + titre + bouton thème).
 * À appeler dans chaque jeu. `backHref` est relatif à la page du jeu.
 */
function mountHeader(title, backHref = '../../index.html') {
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <a class="icon-btn" href="${backHref}" aria-label="Retour">←</a>
    <h1>${title}</h1>
    <button class="icon-btn" id="themeBtn" aria-label="Thème">🌓</button>
  `;
  document.body.prepend(header);
  header.querySelector('#themeBtn').addEventListener('click', () => Theme.toggle());
}

/* --- Enregistrement du service worker (chemin relatif à la racine) --- */
function registerSW(swPath) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(swPath).catch(() => {});
  }
}
