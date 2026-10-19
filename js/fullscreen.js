// Plein écran : API Fullscreen (avec préfixes webkit) et repli « pseudo plein écran »
// pour iPhone Safari, qui n'offre pas le plein écran d'un élément.
const ICON_IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v6H3M21 9h-6V3M15 21v-6h6M3 15h6v6"/></svg>';
const LBL = { in: 'PLEIN ÉCRAN', out: 'QUITTER LE PLEIN ÉCRAN' };
const TIP = { in: 'Plein écran (F)', out: 'Quitter le plein écran (F)' };

const D = document, root = D.documentElement;
const native = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);
const fsEl = () => D.fullscreenElement || D.webkitFullscreenElement || null;
// Lancé depuis l'écran d'accueil (PWA) : déjà en plein écran, le bouton ne sert à rien.
const installed = () => matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let pseudo = false, onChange = () => {}, hintT = 0, hinted = false;
export const isFullscreen = () => !!fsEl() || pseudo;

function setPseudo(on) {
  pseudo = on; root.classList.toggle('pseudo-fs', on);
  if (on) { scrollTo(0, 0); if (isIOS() && !hinted) hinted = true, hint('Sur iPhone, pour cacher la barre de Safari : Partager ▸ « Sur l’écran d’accueil », puis lance le jeu depuis l’icône.'); }
  update();
}
function hint(text) { const h = D.getElementById('fshint'); if (!h) return; h.textContent = text; h.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('on'), 6000); }

export function enterFullscreen() {
  if (isFullscreen()) return;
  if (!native()) return setPseudo(true);
  try {
    const r = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
    if (r && r.then) r.then(() => { try { screen.orientation && screen.orientation.lock && D.body.classList.contains('touch') && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }, () => setPseudo(true));
  } catch (_) { setPseudo(true); }
}
export function exitFullscreen() {
  if (pseudo) return setPseudo(false);
  if (!fsEl()) return;
  try { const r = D.exitFullscreen ? D.exitFullscreen() : D.webkitExitFullscreen(); r && r.catch && r.catch(() => {}); } catch (_) {}
}
export const toggleFullscreen = () => (isFullscreen() ? exitFullscreen() : enterFullscreen());

function update() {
  const on = isFullscreen(), k = on ? 'out' : 'in';
  D.querySelectorAll('[data-fs]').forEach(b => {
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.title = TIP[k]; b.setAttribute('aria-label', TIP[k]);
    const ico = b.querySelector('.fsico'); if (ico) ico.innerHTML = on ? ICON_OUT : ICON_IN;
    const t = b.querySelector('.fstxt'); if (t) t.textContent = LBL[k];
  });
  onChange(on);
}

export function initFullscreen(opts = {}) {
  onChange = opts.onChange || onChange;
  if (installed()) root.classList.add('fs-none');
  D.querySelectorAll('[data-fs]').forEach(b => {
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); b.blur(); });
    // ne pas laisser le toucher passer aux zones de visée / joystick en dessous
    b.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  });
  D.addEventListener('fullscreenchange', update); D.addEventListener('webkitfullscreenchange', update);
  addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyF' && !root.classList.contains('fs-none')) { toggleFullscreen(); e.preventDefault(); }
    else if (e.code === 'Escape' && pseudo) setPseudo(false); // le navigateur gère Échap pour le vrai plein écran
  });
  update();
}
