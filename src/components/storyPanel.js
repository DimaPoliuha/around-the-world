/**
 * Narrative Bar — compact bottom bar replacing the old side panel.
 * Shows city name, day badge, transport icon, and typewriter description.
 */
import gsap from 'gsap';
import { typewrite, setTextInstant } from './typewriter.js';

const bar = document.getElementById('narrative-bar');
const toggleBtn = document.getElementById('narrative-toggle');
const cityEl = document.getElementById('narrative-city');
const dayEl = document.getElementById('narrative-day');
const transportEl = document.getElementById('narrative-transport');
const textEl = document.getElementById('narrative-text');

let isExpanded = false;

export function initStoryPanel() {
  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    bar.classList.toggle('expanded', isExpanded);
  });
}

export function expandPanel() {
  // No-op for narrative bar — it's always visible
}

/**
 * Update the narrative bar with a new stop's data.
 */
export function updateStoryPanel(stop, animate = true) {
  cityEl.textContent = stop.name;
  dayEl.textContent = stop.day === stop.endDay
    ? `Day ${stop.day}`
    : `Days ${stop.day}–${stop.endDay}`;
  transportEl.textContent = stop.nextTransport === 'finish'
    ? '🏆'
    : stop.nextTransportEmoji;

  // Animate header
  gsap.fromTo(cityEl,
    { opacity: 0, x: -15 },
    { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
  );

  // Show short logEntry as typewriter text (one-liner, telegram style).
  // Full description only visible if user manually expands.
  const displayText = isExpanded
    ? (stop.description || stop.logEntry)
    : (stop.logEntry || '');

  if (displayText && animate) {
    typewrite(textEl, displayText);
  } else if (displayText) {
    setTextInstant(textEl, displayText);
  } else {
    textEl.textContent = '';
  }
}

/**
 * Update the top-bar location display.
 */
export function updateLocationDisplay(stop) {
  const emoji = document.getElementById('location-emoji');
  const name = document.getElementById('location-name');
  const transportEmoji = document.getElementById('transport-emoji');
  const transportLabel = document.getElementById('transport-label');

  emoji.textContent = stop.transportEmoji;
  name.textContent = `${stop.name}, ${stop.country}`;
  transportEmoji.textContent = stop.nextTransportEmoji;
  transportLabel.textContent = stop.nextTransport === 'finish'
    ? 'Complete!'
    : stop.nextTransport;
}

/**
 * Show/hide the narrative bar (used during event overlay).
 */
export function hideNarrativeBar() {
  bar.classList.add('hidden-bar');
}

export function showNarrativeBar() {
  bar.classList.remove('hidden-bar');
}
