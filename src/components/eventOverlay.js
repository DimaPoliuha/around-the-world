/**
 * Full-screen dramatic event overlay with location photography.
 * When arriving at each stop, a stunning photo fills the screen
 * with a slow ken-burns zoom, overlaid with mood-tinted gradient
 * and dramatic text animations.
 *
 * V4: Word-by-word text reveal + journey stats badge.
 */
import gsap from 'gsap';
import { preloadImage } from './imagePreloader.js';

let overlayEl = null;
let videoEl = null;
let imageEl = null;
let gradientEl = null;
let contentEl = null;
let emojiEl = null;
let titleEl = null;
let textEl = null;
let locationEl = null;
let statsEl = null;
let hideTimeline = null;

// Video preload cache: { url: HTMLVideoElement }
const videoCache = new Map();

// Track current canplay listener so we can remove it on rapid navigation
let pendingCanPlayHandler = null;

function ensureDOM() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'event-overlay';
  overlayEl.innerHTML = `
    <div class="eo-image-wrap">
      <video class="eo-video" id="eo-video" muted loop playsinline></video>
      <div class="eo-image" id="eo-image"></div>
    </div>
    <div class="eo-gradient" id="eo-gradient"></div>
    <div class="event-overlay-content" id="eo-content">
      <div class="event-overlay-location" id="eo-location"></div>
      <div class="event-overlay-emoji" id="eo-emoji"></div>
      <div class="event-overlay-title" id="eo-title"></div>
      <div class="event-overlay-text" id="eo-text"></div>
      <div class="event-overlay-stats" id="eo-stats"></div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  videoEl = document.getElementById('eo-video');
  imageEl = document.getElementById('eo-image');
  gradientEl = document.getElementById('eo-gradient');
  contentEl = document.getElementById('eo-content');
  emojiEl = document.getElementById('eo-emoji');
  titleEl = document.getElementById('eo-title');
  textEl = document.getElementById('eo-text');
  locationEl = document.getElementById('eo-location');
  statsEl = document.getElementById('eo-stats');
}

/**
 * Pick a random ken-burns origin for visual variety.
 */
function randomKenBurnsOrigin() {
  const origins = [
    'center center',
    'top center',
    'bottom center',
    'center left',
    'center right',
    'top left',
    'top right',
    'bottom left',
    'bottom right',
  ];
  return origins[Math.floor(Math.random() * origins.length)];
}

/**
 * Split text into word-wrapped spans for staggered reveal.
 */
function setWordSpans(el, text) {
  el.innerHTML = '';
  const words = text.split(/\s+/);
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'eo-word';
    span.textContent = word;
    el.appendChild(span);
    // Add space between words (except last)
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
  return el.querySelectorAll('.eo-word');
}

/**
 * Build stats row HTML from stop data.
 */
function buildStats(stop, totalStops) {
  const parts = [];
  if (stop.distance && stop.distance !== '—') {
    parts.push(`<span class="eo-stat">${stop.transportEmoji} ${stop.distance}</span>`);
  }
  if (stop.travelDays > 0) {
    const dayLabel = stop.travelDays === 1 ? 'day' : 'days';
    parts.push(`<span class="eo-stat">⏱️ ${stop.travelDays} ${dayLabel}</span>`);
  }
  parts.push(`<span class="eo-stat">📍 Stop ${stop.id} of ${totalStops}</span>`);
  return parts.join('<span class="eo-stat-sep">·</span>');
}

/**
 * Show the full-screen event overlay for a stop.
 * Returns a Promise that resolves when the overlay starts fading out.
 */
export function showEvent(stop, displayDuration = 3500, totalStops = 14) {
  ensureDOM();

  // Kill any pending hide
  if (hideTimeline) {
    hideTimeline.kill();
    hideTimeline = null;
  }

  // Set mood class
  const moodClass = `mood-${stop.mood || 'wonder'}`;
  overlayEl.className = `event-overlay-visible ${moodClass}`;

  // Set content
  locationEl.textContent = `${stop.name}, ${stop.country} — Day ${stop.day}`;
  emojiEl.textContent = stop.eventEmoji || '📰';
  titleEl.textContent = stop.eventTitle || 'KEY EVENT';

  // Word-by-word text
  const wordSpans = setWordSpans(textEl, stop.event || '');

  // Stats badge
  statsEl.innerHTML = buildStats(stop, totalStops);

  // Set background: try video first, fall back to image
  const videoUrl = stop.videoUrl;
  const imageUrl = stop.imageUrl;
  let useVideo = false;

  // Reset video state — remove stale canplay listener from previous stop
  if (pendingCanPlayHandler) {
    videoEl.removeEventListener('canplay', pendingCanPlayHandler);
    pendingCanPlayHandler = null;
  }
  videoEl.pause();
  videoEl.style.opacity = '0';

  if (videoUrl) {
    // Check if we have a preloaded video ready
    const cached = videoCache.get(videoUrl);
    if (cached && cached.readyState >= 2) {
      // Already buffered — use it immediately
      videoEl.src = videoUrl;
      videoEl.currentTime = 0;
      useVideo = true;
    } else {
      // Start loading and cross-fade when ready
      videoEl.src = videoUrl;
      videoEl.load();
      pendingCanPlayHandler = () => {
        videoEl.removeEventListener('canplay', pendingCanPlayHandler);
        pendingCanPlayHandler = null;
        // Cross-fade: fade video in over image
        videoEl.play().catch(() => {});
        gsap.to(videoEl, { opacity: 1, duration: 0.8, ease: 'power1.out' });
        gsap.to(imageEl, { opacity: 0.3, duration: 0.8, ease: 'power1.out' });
      };
      videoEl.addEventListener('canplay', pendingCanPlayHandler);
    }
  }

  // Always set image as immediate fallback
  if (imageUrl) {
    imageEl.style.backgroundImage = `url(${imageUrl})`;
    imageEl.style.transformOrigin = randomKenBurnsOrigin();
    imageEl.classList.add('eo-image-active');
  } else {
    imageEl.style.backgroundImage = '';
    imageEl.classList.remove('eo-image-active');
  }

  // Reset transforms for animation
  gsap.set(imageEl, { scale: 1, opacity: 0 });
  gsap.set(overlayEl, { opacity: 0 });

  // === ANIMATE IN ===
  const tl = gsap.timeline();

  // 1. Overlay container fades in
  tl.to(overlayEl, { opacity: 1, duration: 0.4, ease: 'power2.out' });

  // 2. Background fades in + ken-burns
  if (useVideo) {
    // Video is ready — play it and fade in
    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});
    tl.to(videoEl, { opacity: 1, duration: 0.8, ease: 'power1.out' }, '-=0.3');
    // Slight slow zoom on video too
    gsap.fromTo(videoEl,
      { scale: 1.0 },
      { scale: 1.05, duration: (displayDuration / 1000) + 1.5, ease: 'none' }
    );
    // Also show image dimly behind as backup
    if (imageUrl) {
      gsap.set(imageEl, { opacity: 0.3 });
    }
  } else if (imageUrl) {
    // No video yet — show image with full ken-burns
    tl.to(imageEl, {
      opacity: 1,
      duration: 0.8,
      ease: 'power1.out',
    }, '-=0.3');

    gsap.fromTo(imageEl,
      { scale: 1.0 },
      { scale: 1.15, duration: (displayDuration / 1000) + 1.5, ease: 'none' }
    );
  }

  // 3. Location label slides down
  tl.fromTo(locationEl,
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    '-=0.4'
  );

  // 4. Emoji SLAMS in — big scale bounce
  tl.fromTo(emojiEl,
    { opacity: 0, scale: 3, rotation: -15 },
    { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' },
    '-=0.2'
  );

  // 5. Title crashes in from below
  tl.fromTo(titleEl,
    { opacity: 0, y: 40, letterSpacing: '0.5em' },
    { opacity: 1, y: 0, letterSpacing: '0.15em', duration: 0.5, ease: 'power3.out' },
    '-=0.3'
  );

  // 6. Words reveal one by one (staggered)
  if (wordSpans.length > 0) {
    tl.fromTo(wordSpans,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.06 },
      '-=0.2'
    );
  }

  // 7. Stats badge fades in
  tl.fromTo(statsEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.4, ease: 'power2.out' },
    '-=0.1'
  );

  // Return promise that resolves when overlay starts hiding
  return new Promise((resolve) => {
    hideTimeline = gsap.timeline({ delay: displayDuration / 1000 });
    hideTimeline.to(overlayEl, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
      onStart: resolve,
      onComplete: () => {
        overlayEl.className = '';
        imageEl.classList.remove('eo-image-active');
        imageEl.style.backgroundImage = '';
        gsap.killTweensOf(imageEl);
        // Clean up video
        if (videoEl) {
          videoEl.pause();
          videoEl.style.opacity = '0';
          gsap.killTweensOf(videoEl);
        }
      },
    });
  });
}

/**
 * Immediately hide the overlay (e.g., user clicks through quickly).
 */
export function hideEvent() {
  if (!overlayEl) return;
  if (hideTimeline) {
    hideTimeline.kill();
    hideTimeline = null;
  }
  // Clean up pending video listener
  if (pendingCanPlayHandler && videoEl) {
    videoEl.removeEventListener('canplay', pendingCanPlayHandler);
    pendingCanPlayHandler = null;
  }
  gsap.killTweensOf(imageEl);
  if (videoEl) gsap.killTweensOf(videoEl);
  gsap.to(overlayEl, {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      overlayEl.className = '';
      if (imageEl) {
        imageEl.classList.remove('eo-image-active');
        imageEl.style.backgroundImage = '';
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.style.opacity = '0';
      }
    },
  });
}

/**
 * Preload a video URL so it's ready when the overlay appears.
 * Called during the camera-fly phase for the NEXT stop.
 */
export function preloadVideo(url) {
  if (!url || videoCache.has(url)) return;
  const v = document.createElement('video');
  v.preload = 'auto';
  v.muted = true;
  v.src = url;
  v.load();
  videoCache.set(url, v);
  // Clean old entries if cache grows too large
  if (videoCache.size > 5) {
    const oldest = videoCache.keys().next().value;
    videoCache.delete(oldest);
  }
}
