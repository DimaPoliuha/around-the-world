let currentAnimation = null;

/**
 * Type text character by character with variable speed.
 * Pauses longer on punctuation for natural rhythm.
 */
export function typewrite(element, text, speed = 30) {
  // Cancel any running animation
  if (currentAnimation) {
    clearTimeout(currentAnimation);
    currentAnimation = null;
  }

  element.textContent = '';
  const cursor = document.getElementById('story-cursor');
  if (cursor) cursor.classList.remove('done');

  return new Promise((resolve) => {
    let i = 0;

    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;

        // Variable speed for natural feel
        const char = text.charAt(i - 1);
        let delay = speed;
        if ('.!?'.includes(char)) delay = speed * 8;
        else if (',;:'.includes(char)) delay = speed * 4;
        else if (char === '—') delay = speed * 5;
        else if (char === ' ') delay = speed * 0.5;
        // Slight randomness
        delay += (Math.random() - 0.5) * speed * 0.4;

        currentAnimation = setTimeout(tick, Math.max(10, delay));
      } else {
        currentAnimation = null;
        if (cursor) cursor.classList.add('done');
        resolve();
      }
    }

    tick();
  });
}

/**
 * Typewriter effect for the cinematic opening quote.
 */
export function typewriteQuote(element, text, speed = 45) {
  element.textContent = '';
  const cursor = document.getElementById('cinematic-cursor');
  if (cursor) cursor.classList.add('active');

  return new Promise((resolve) => {
    let i = 0;

    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;

        const char = text.charAt(i - 1);
        let delay = speed;
        if ('.!?'.includes(char)) delay = speed * 6;
        else if (','.includes(char)) delay = speed * 3;

        setTimeout(tick, delay);
      } else {
        if (cursor) {
          // Keep cursor blinking for a moment, then fade
          setTimeout(() => cursor.classList.remove('active'), 2000);
        }
        resolve();
      }
    }

    setTimeout(tick, 800); // Initial delay
  });
}

export function cancelTypewriter() {
  if (currentAnimation) {
    clearTimeout(currentAnimation);
    currentAnimation = null;
  }
}

/**
 * Instantly set text (for non-animated updates).
 */
export function setTextInstant(element, text) {
  cancelTypewriter();
  element.textContent = text;
  const cursor = document.getElementById('story-cursor');
  if (cursor) cursor.classList.add('done');
}
