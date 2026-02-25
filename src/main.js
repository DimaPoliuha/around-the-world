import './styles/main.css';
import confetti from 'canvas-confetti';
import _journeyData from './data/journey.json';

// Prefix local asset URLs with Vite's base path (for GitHub Pages)
const base = import.meta.env.BASE_URL;
const journeyData = _journeyData.map(stop => ({
  ...stop,
  narrationUrl: stop.narrationUrl ? base + stop.narrationUrl.replace(/^\//, '') : stop.narrationUrl,
}));
import { initGlobe, initCinematicGlobe, flyToLocation, flyToArc, updateArcs, setRingAtStop, animateTransport, showTransportAtStop, clearTransport } from './components/globe3d.js';
import { updateDayCounter, setDayInstant } from './components/dayCounter.js';
import { initStoryPanel, updateStoryPanel, expandPanel, updateLocationDisplay, hideNarrativeBar, showNarrativeBar } from './components/storyPanel.js';
import { initTimeline, resetTimeline, updateTimeline } from './components/timeline.js';
import { updateCompass, initCompassTicks } from './components/compass.js';
import { typewriteQuote } from './components/typewriter.js';
import { toggleAudio, isAudioEnabled, playChime, playWhoosh, playFanfare, playTrainSound, playSteamerSound, stopTransportSound } from './components/audio.js';
import { showEvent, hideEvent, preloadVideo, setSkipHandler } from './components/eventOverlay.js';
import { triggerMoodEffect, showLetterbox, hideLetterbox } from './components/screenEffects.js';
import { preloadImage, preloadAhead } from './components/imagePreloader.js';
import { playNarration, stopNarration, preloadNarration, getNarrationDuration } from './components/narrator.js';

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let currentStopIndex = 0;
let isPlaying = false;
let playTimeout = null;
let isTransitioning = false;
let arrivalTimeout = null;
let isDemoMode = false;
let activeStops = journeyData; // Full journey by default

const FULL_PLAY_INTERVAL_MS = 15500;
const DEMO_PLAY_INTERVAL_MS = 12000;
const DEMO_INDICES = [0, 7, 8, 11, 13]; // London, Calcutta, Hong Kong, New York, London(victory)

function getPlayInterval() {
  return isDemoMode ? DEMO_PLAY_INTERVAL_MS : FULL_PLAY_INTERVAL_MS;
}

// ═══════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════
const cinematic = document.getElementById('cinematic');
const cinematicGlobeContainer = document.getElementById('cinematic-globe');
const quoteEl = document.getElementById('cinematic-quote');
const app = document.getElementById('app');
const startBtn = document.getElementById('start-journey');
const demoBtn = document.getElementById('start-demo');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const fullJourneyBanner = document.getElementById('full-journey-banner');
const fullJourneyBtn = document.getElementById('full-journey-btn');

// ═══════════════════════════════════════════════
// CINEMATIC OPENING
// ═══════════════════════════════════════════════
(function initCinematic() {
  const cGlobe = initCinematicGlobe(cinematicGlobeContainer);

  setTimeout(() => {
    typewriteQuote(
      quoteEl,
      '"The world has grown smaller, since a man can now go round it ten times more quickly than a hundred years ago."'
    ).then(() => {
      setTimeout(() => {
        startBtn.classList.add('visible');
        demoBtn.classList.add('visible');
      }, 500);
    });
  }, 1500);

  initCompassTicks();
})();

// ═══════════════════════════════════════════════
// START JOURNEY (Full or Demo)
// ═══════════════════════════════════════════════
function launchApp(demo) {
  isDemoMode = demo;
  activeStops = demo
    ? DEMO_INDICES.map(i => journeyData[i])
    : journeyData;

  cinematic.style.transition = 'opacity 1s ease, transform 1s ease';
  cinematic.style.opacity = '0';
  cinematic.style.transform = 'scale(1.03)';

  setTimeout(() => {
    cinematic.classList.add('hidden');
    app.classList.remove('hidden');
    app.style.animation = 'fadeInApp 1.2s ease-out';
    initApp();
  }, 1000);
}

startBtn.addEventListener('click', () => launchApp(false));
demoBtn.addEventListener('click', () => launchApp(true));

// ═══════════════════════════════════════════════
// APP INITIALIZATION
// ═══════════════════════════════════════════════
function initApp() {
  const globeContainer = document.getElementById('globe-container');
  // Globe always gets ALL stops for labels/points
  initGlobe(globeContainer, journeyData);

  // Timeline uses activeStops (5 in demo, 14 in full)
  resetTimeline();
  initTimeline(activeStops, goToStop);
  initStoryPanel();

  // Preload first few location images from active set
  preloadAhead(activeStops, -1, 4);

  // Set initial state (first stop, no animation — no overlay)
  goToStop(0, false);

  // Fly to first stop
  setTimeout(() => {
    flyToLocation(activeStops[0].lat, activeStops[0].lng, 1.0, 2000);
  }, 500);

  // Keyboard controls
  document.addEventListener('keydown', handleKeyboard);

  // Skip button on event overlay → advance to next stop
  setSkipHandler(() => { stopAutoPlay(); nextStop(); });

  // Click overlay background to dismiss (but not the skip button)
  document.addEventListener('click', (e) => {
    if (isTransitioning && e.target.closest('#event-overlay') && !e.target.closest('.eo-skip-btn')) {
      cancelTransition();
    }
  });

  // Hide full-journey banner on start
  fullJourneyBanner.classList.add('hidden');
}

// ═══════════════════════════════════════════════
// CINEMATIC NAVIGATION — The Heart of the Experience
// ═══════════════════════════════════════════════
function goToStop(index, animate = true) {
  if (index < 0 || index >= activeStops.length) return;

  const stop = activeStops[index];
  currentStopIndex = index;

  // Update top bar and timeline immediately
  updateLocationDisplay(stop);
  updateTimeline(index);

  // Compass points to NEXT destination in active set
  const nextDest = index < activeStops.length - 1 ? activeStops[index + 1] : null;
  updateCompass(stop, nextDest);

  // Globe: arcs (draw arcs between consecutive active stops)
  updateArcs(activeStops, index);
  setRingAtStop(stop);

  // Preload current + upcoming images, videos, and narration
  preloadImage(stop.imageUrl);
  preloadAhead(activeStops, index, 3);
  if (stop.videoUrl) preloadVideo(stop.videoUrl);
  if (stop.narrationUrl) preloadNarration(stop.narrationUrl);
  // Also preload the NEXT stop's assets during this one
  if (index < activeStops.length - 1) {
    const next = activeStops[index + 1];
    if (next.videoUrl) preloadVideo(next.videoUrl);
    if (next.narrationUrl) preloadNarration(next.narrationUrl);
  }

  if (animate && index > 0) {
    // ═══ CINEMATIC SEQUENCE ═══
    isTransitioning = true;

    const fromStop = activeStops[index - 1];
    const cameraDuration = 3500;

    // ── Phase 1: TRAVEL ──
    showLetterbox();

    // Camera zooms out → pans → zooms in
    flyToArc(fromStop, stop, cameraDuration);
    animateTransport(fromStop, stop, cameraDuration);

    // Transport-specific sound
    const transport = stop.transport || fromStop.nextTransport;
    if (transport === 'train') {
      playTrainSound(cameraDuration);
    } else if (transport === 'steamer') {
      playSteamerSound(cameraDuration);
    } else {
      playWhoosh();
    }

    // Update urgency counter during travel
    updateDayCounter(stop.day);

    // ── Phase 2: ARRIVAL ──
    arrivalTimeout = setTimeout(() => {
      arrivalTimeout = null;
      if (!isTransitioning) return;

      hideLetterbox();
      stopTransportSound();

      playChime();
      triggerMoodEffect(stop.mood);

      const overlayDuration = 5500;
      playNarration(stop.narrationUrl);

      showEvent(stop, overlayDuration, activeStops.length).then(() => {
        // ── Phase 3: Overlay dissolves ──
        isTransitioning = false;
        showNarrativeBar();
        updateStoryPanel(stop, true);
      });

      hideNarrativeBar();
      updateStoryPanel(stop, false);

      // Victory: confetti + fanfare on final stop
      if (index === activeStops.length - 1) {
        setTimeout(() => {
          playFanfare();
          fireConfetti();
          // In demo mode, show the "See Full Journey" banner
          if (isDemoMode) {
            setTimeout(() => {
              fullJourneyBanner.classList.remove('hidden');
            }, 2000);
          }
        }, 500);
      }
    }, cameraDuration);

  } else {
    // Instant (no animation)
    setDayInstant(stop.day);
    showTransportAtStop(stop);
    showNarrativeBar();
    updateStoryPanel(stop, false);

    hideLetterbox();
    if (index === 0) {
      flyToLocation(stop.lat, stop.lng, 1.0, 0);
    }
  }
}

// ═══════════════════════════════════════════════
// CANCEL IN-FLIGHT TRANSITION
// ═══════════════════════════════════════════════
function cancelTransition() {
  isTransitioning = false;
  if (arrivalTimeout) {
    clearTimeout(arrivalTimeout);
    arrivalTimeout = null;
  }
  hideEvent();
  stopNarration();
  stopTransportSound();
  hideLetterbox();
  showNarrativeBar();
}

// ═══════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════
function nextStop() {
  if (isTransitioning) cancelTransition();
  if (currentStopIndex < activeStops.length - 1) {
    goToStop(currentStopIndex + 1);
  } else {
    stopAutoPlay();
  }
}

function prevStop() {
  if (isTransitioning) return;
  if (currentStopIndex > 0) {
    goToStop(currentStopIndex - 1);
  }
}

// ═══════════════════════════════════════════════
// AUTO-PLAY
// ═══════════════════════════════════════════════
function startAutoPlay() {
  if (isPlaying) return;
  isPlaying = true;
  btnPlay.textContent = '⏸';
  btnPlay.classList.add('playing');

  if (currentStopIndex >= activeStops.length - 1) {
    goToStop(0, false);
    playTimeout = setTimeout(() => {
      goToStop(1);
      scheduleNext();
    }, 800);
  } else {
    nextStop();
    scheduleNext();
  }
}

function scheduleNext() {
  let interval = getPlayInterval();

  // Full journey: extend interval so narration plays to completion
  // Demo mode: keep it fast-paced, narration fades out gracefully between stops
  if (!isDemoMode) {
    const narrationMs = getNarrationDuration(activeStops[currentStopIndex]?.narrationUrl);
    if (narrationMs > 0) {
      interval = Math.max(interval, narrationMs + 5000);
    }
  }

  playTimeout = setTimeout(() => {
    if (!isPlaying) return;
    if (currentStopIndex >= activeStops.length - 1) {
      stopAutoPlay();
      return;
    }
    nextStop();
    scheduleNext();
  }, interval);
}

function stopAutoPlay() {
  isPlaying = false;
  btnPlay.textContent = '▶';
  btnPlay.classList.remove('playing');
  if (playTimeout) {
    clearTimeout(playTimeout);
    playTimeout = null;
  }
}

function toggleAutoPlay() {
  if (isPlaying) stopAutoPlay();
  else startAutoPlay();
}

// ═══════════════════════════════════════════════
// SWITCH TO FULL JOURNEY (from demo end banner)
// ═══════════════════════════════════════════════
function switchToFullJourney() {
  stopAutoPlay();
  cancelTransition();
  fullJourneyBanner.classList.add('hidden');

  isDemoMode = false;
  activeStops = journeyData;
  currentStopIndex = 0;

  // Re-initialize timeline with full data
  resetTimeline();
  initTimeline(activeStops, goToStop);

  // Reset to London
  goToStop(0, false);
  setTimeout(() => {
    flyToLocation(activeStops[0].lat, activeStops[0].lng, 1.0, 2000);
  }, 300);
}

fullJourneyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  switchToFullJourney();
});

// ═══════════════════════════════════════════════
// CONFETTI (Journey Complete!)
// ═══════════════════════════════════════════════
function fireConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ['#c9a84c', '#e8d48b', '#8a7234', '#f0e6d2', '#ffd700'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// ═══════════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════════
btnPlay.addEventListener('click', toggleAutoPlay);
btnPrev.addEventListener('click', () => { stopAutoPlay(); prevStop(); });
btnNext.addEventListener('click', () => { stopAutoPlay(); nextStop(); });

soundToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const enabled = toggleAudio();
  soundIcon.textContent = enabled ? '🔊' : '🔇';
  soundToggle.style.borderColor = enabled ? '#c9a84c' : '';
  soundToggle.style.background = enabled ? 'rgba(201, 168, 76, 0.15)' : '';
  if (!enabled) {
    stopNarration();
    stopTransportSound();
  }
});

function handleKeyboard(e) {
  switch (e.key) {
    case ' ':
      e.preventDefault();
      toggleAutoPlay();
      break;
    case 'ArrowRight':
      stopAutoPlay();
      nextStop();
      break;
    case 'ArrowLeft':
      stopAutoPlay();
      prevStop();
      break;
    case 'Escape':
      if (isTransitioning) {
        cancelTransition();
      }
      stopAutoPlay();
      break;
    case 'm':
    case 'M':
      soundToggle.click();
      break;
  }
}
