/**
 * Screen effects for mood-based visual drama.
 * CSS-class driven — all animations are in main.css.
 */

const body = document.body;

// Reusable overlay for color flashes
let flashEl = null;

function getFlashEl() {
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.id = 'screen-flash';
    flashEl.style.cssText =
      'position:fixed;inset:0;z-index:8000;pointer-events:none;opacity:0;transition:opacity 0.15s ease;';
    document.body.appendChild(flashEl);
  }
  return flashEl;
}

/**
 * Shake the entire screen.
 * @param {'light'|'heavy'} intensity
 * @param {number} duration ms
 */
export function shakeScreen(intensity = 'light', duration = 600) {
  const cls = intensity === 'heavy' ? 'fx-shake-heavy' : 'fx-shake-light';
  body.classList.add(cls);
  setTimeout(() => body.classList.remove(cls), duration);
}

/**
 * Flash the screen a color (e.g., red for danger, gold for triumph).
 * @param {string} color CSS color string
 * @param {number} duration ms
 */
export function flashScreen(color = 'rgba(255,0,0,0.25)', duration = 400) {
  const el = getFlashEl();
  el.style.background = color;
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
  }, duration);
}

/**
 * Pulse the vignette with a tinted color.
 * @param {string} color
 * @param {number} duration ms
 */
export function pulseVignette(color = 'rgba(201,168,76,0.4)', duration = 1500) {
  const vig = document.getElementById('vignette-overlay');
  if (!vig) return;
  const original = vig.style.background;
  vig.style.transition = `background ${duration / 2}ms ease`;
  vig.style.background = `radial-gradient(ellipse at center, transparent 30%, ${color} 80%, rgba(0,0,0,0.8) 100%)`;
  setTimeout(() => {
    vig.style.transition = `background ${duration / 2}ms ease`;
    vig.style.background = original || '';
  }, duration / 2);
}

// ─── Cinematic Letterbox Bars ───────────────
const letterboxTop = document.getElementById('letterbox-top');
const letterboxBottom = document.getElementById('letterbox-bottom');

/**
 * Slide in cinematic letterbox bars (widescreen feel during camera moves).
 */
export function showLetterbox() {
  if (letterboxTop) letterboxTop.classList.add('active');
  if (letterboxBottom) letterboxBottom.classList.add('active');
}

/**
 * Retract letterbox bars.
 */
export function hideLetterbox() {
  if (letterboxTop) letterboxTop.classList.remove('active');
  if (letterboxBottom) letterboxBottom.classList.remove('active');
}

/**
 * Trigger the appropriate screen effect for a mood.
 */
export function triggerMoodEffect(mood) {
  switch (mood) {
    case 'triumph':
      flashScreen('rgba(201,168,76,0.3)', 500);
      pulseVignette('rgba(201,168,76,0.5)', 2000);
      break;
    case 'mystery':
      pulseVignette('rgba(40,20,80,0.6)', 2500);
      break;
    case 'wonder':
      pulseVignette('rgba(30,80,120,0.4)', 2000);
      break;
    case 'danger':
      flashScreen('rgba(180,30,30,0.35)', 300);
      shakeScreen('light', 500);
      pulseVignette('rgba(120,20,20,0.5)', 2000);
      break;
    case 'action':
      flashScreen('rgba(255,120,0,0.3)', 200);
      shakeScreen('heavy', 800);
      break;
    case 'comedy':
      flashScreen('rgba(255,220,100,0.2)', 400);
      break;
    case 'victory':
      flashScreen('rgba(255,215,0,0.5)', 600);
      shakeScreen('light', 400);
      pulseVignette('rgba(201,168,76,0.6)', 3000);
      break;
    default:
      break;
  }
}
