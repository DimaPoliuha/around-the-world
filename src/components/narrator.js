/**
 * Voice Narrator — pre-generated British narration audio files.
 * High-quality neural voice (en-GB-RyanNeural via edge-tts).
 * Plays narration during the event overlay and continues over the globe.
 */
import { isAudioEnabled } from './audio.js';

let currentAudio = null;
let fadingAudio = null;
const audioCache = new Map();

/**
 * Preload a narration audio file so it's ready instantly.
 */
export function preloadNarration(url) {
  if (!url || audioCache.has(url)) return;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  audio.load();
  audioCache.set(url, audio);
}

/**
 * Play a narration audio file.
 * Returns the Audio element so callers can listen for 'ended'.
 */
export function playNarration(url) {
  if (!url || !isAudioEnabled()) return null;

  // Fade out any current narration (don't hard-cut)
  fadeOutNarration();

  // Use cached audio or create new
  let audio = audioCache.get(url);
  if (audio) {
    audio.currentTime = 0;
  } else {
    audio = new Audio(url);
    audioCache.set(url, audio);
  }

  audio.volume = 1.0;
  currentAudio = audio;
  audio.play().catch(() => {});
  return audio;
}

/**
 * Gracefully fade out current narration over ~0.8s.
 * Used when transitioning between stops so it doesn't hard-cut.
 */
export function fadeOutNarration() {
  if (!currentAudio) return;

  // Kill any previously fading audio immediately
  if (fadingAudio) {
    fadingAudio.pause();
    fadingAudio.currentTime = 0;
    fadingAudio.volume = 1.0;
    fadingAudio = null;
  }

  // Move current to fading
  fadingAudio = currentAudio;
  currentAudio = null;
  const audio = fadingAudio;

  // Fade volume from current level to 0 over ~0.8s (8 steps × 100ms)
  function fadeStep() {
    if (audio !== fadingAudio) return; // Another fade started
    audio.volume = Math.max(0, audio.volume - 0.125);
    if (audio.volume > 0.01) {
      setTimeout(fadeStep, 100);
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1.0;
      if (fadingAudio === audio) fadingAudio = null;
    }
  }
  fadeStep();
}

/**
 * Stop any currently playing narration immediately (hard stop).
 * Used for sound toggle off, Escape dismiss, etc.
 */
export function stopNarration() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (fadingAudio) {
    fadingAudio.pause();
    fadingAudio.currentTime = 0;
    fadingAudio.volume = 1.0;
    fadingAudio = null;
  }
}

/**
 * Check if narration is currently playing (not fading).
 */
export function isNarrationPlaying() {
  return currentAudio !== null && !currentAudio.paused && !currentAudio.ended;
}

/**
 * Register a callback for when the current narration ends.
 * Calls immediately if nothing is playing.
 */
export function onNarrationEnd(callback) {
  if (!currentAudio || currentAudio.paused || currentAudio.ended) {
    callback();
    return;
  }
  const audio = currentAudio;
  const handler = () => {
    audio.removeEventListener('ended', handler);
    callback();
  };
  audio.addEventListener('ended', handler);
}

/**
 * Get the duration of a narration file (if preloaded).
 * Returns 0 if not loaded yet.
 */
export function getNarrationDuration(url) {
  const audio = audioCache.get(url);
  if (audio && audio.duration && isFinite(audio.duration)) {
    return audio.duration * 1000; // Return ms
  }
  return 0;
}
