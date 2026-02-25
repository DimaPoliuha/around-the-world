/**
 * Image Preloader — loads location photography ahead of navigation
 * so transitions are instant and buttery smooth.
 */

const cache = new Map();
const loading = new Map();

/**
 * Preload an image URL. Returns a Promise that resolves with the Image element.
 * If already cached, resolves immediately.
 */
export function preloadImage(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  if (loading.has(url)) return loading.get(url);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(url, img);
      loading.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      loading.delete(url);
      resolve(null); // Graceful — overlay still works without image
    };
    img.src = url;
  });

  loading.set(url, promise);
  return promise;
}

/**
 * Preload images for upcoming stops (look-ahead window).
 * Call this after navigating to a stop.
 */
export function preloadAhead(journeyData, currentIndex, windowSize = 3) {
  for (let i = 1; i <= windowSize; i++) {
    const idx = currentIndex + i;
    if (idx < journeyData.length && journeyData[idx].imageUrl) {
      preloadImage(journeyData[idx].imageUrl);
    }
  }
}

/**
 * Check if an image is already cached.
 */
export function isImageCached(url) {
  return cache.has(url);
}
