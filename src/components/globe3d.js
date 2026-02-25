import Globe from 'globe.gl';
import { interpolateGreatCircle } from '../utils/geo.js';

let globe = null;
let transportAnimId = null;
let transportData = [];

const GLOBE_IMAGE = 'https://unpkg.com/three-globe@2.34.1/example/img/earth-night.jpg';
const BUMP_IMAGE = 'https://unpkg.com/three-globe@2.34.1/example/img/earth-topology.png';
const BG_IMAGE = 'https://unpkg.com/three-globe@2.34.1/example/img/night-sky.png';

// Transport emoji to use on the globe
const TRANSPORT_MAP = {
  train: '🚂',
  steamer: '🚢',
  start: '📍',
  finish: '🏆',
};

function createTransportElement(emoji) {
  const wrapper = document.createElement('div');
  wrapper.className = 'globe-transport-marker';
  wrapper.innerHTML = `<span class="transport-icon-globe">${emoji}</span>`;
  return wrapper;
}

export function initGlobe(container, stops) {
  globe = Globe()
    .globeImageUrl(GLOBE_IMAGE)
    .bumpImageUrl(BUMP_IMAGE)
    .backgroundImageUrl(BG_IMAGE)
    .showAtmosphere(true)
    .atmosphereColor('#c9a84c')
    .atmosphereAltitude(0.2)
    // Points (city markers)
    .pointsData(stops)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(() => '#c9a84c')
    .pointAltitude(0.01)
    .pointRadius(0.35)
    .pointsMerge(true)
    // Labels
    .labelsData(stops)
    .labelLat('lat')
    .labelLng('lng')
    .labelText('name')
    .labelSize(1.2)
    .labelDotRadius(0.4)
    .labelDotOrientation(() => 'right')
    .labelColor(() => 'rgba(232, 212, 139, 0.85)')
    .labelResolution(2)
    // Arcs
    .arcsData([])
    .arcColor(() => ['rgba(201, 168, 76, 0.9)', 'rgba(232, 212, 139, 0.6)'])
    .arcDashLength(0.6)
    .arcDashGap(0.3)
    .arcDashAnimateTime(2000)
    .arcStroke(0.6)
    .arcAltitudeAutoScale(0.4)
    // Rings
    .ringsData([])
    .ringColor(() => (t) => `rgba(201, 168, 76, ${1 - t})`)
    .ringMaxRadius(3)
    .ringPropagationSpeed(2)
    .ringRepeatPeriod(1500)
    // HTML transport markers on globe
    .htmlElementsData([])
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude(0.03)
    .htmlElement(d => d.el)
    (container);

  globe.controls().enableDamping = true;
  globe.controls().dampingFactor = 0.1;
  globe.controls().rotateSpeed = 0.5;
  globe.controls().zoomSpeed = 0.8;
  globe.controls().autoRotate = false;

  globe.pointOfView({ lat: 51.5, lng: -0.13, altitude: 2.5 }, 0);

  return globe;
}

export function initCinematicGlobe(container) {
  const cinematicGlobe = Globe()
    .globeImageUrl(GLOBE_IMAGE)
    .bumpImageUrl(BUMP_IMAGE)
    .backgroundImageUrl(BG_IMAGE)
    .showAtmosphere(true)
    .atmosphereColor('#c9a84c')
    .atmosphereAltitude(0.15)
    .pointsData([])
    .arcsData([])
    (container);

  cinematicGlobe.controls().enableZoom = false;
  cinematicGlobe.controls().enablePan = false;
  cinematicGlobe.controls().autoRotate = true;
  cinematicGlobe.controls().autoRotateSpeed = 0.5;
  cinematicGlobe.pointOfView({ lat: 30, lng: 0, altitude: 2.8 }, 0);

  return cinematicGlobe;
}

export function flyToLocation(lat, lng, altitude = 1.8, duration = 2000) {
  if (!globe) return;
  globe.pointOfView({ lat, lng, altitude }, duration);
}

/**
 * Calculate the zoomed-out altitude for an arc between two stops.
 */
function arcAltitude(fromStop, toStop) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(toStop.lat - fromStop.lat);
  const dLng = toRad(toStop.lng - fromStop.lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromStop.lat)) * Math.cos(toRad(toStop.lat)) *
    Math.sin(dLng / 2) ** 2;
  const angularDist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1.4, Math.min(3.2, 0.8 + angularDist * 1.5));
}

/**
 * Cinematic 3-phase camera: zoom OUT from departure → pan across route → zoom IN to destination.
 * totalDuration is split roughly: 30% zoom-out, 40% pan, 30% zoom-in.
 */
export function flyToArc(fromStop, toStop, totalDuration = 3500) {
  if (!globe) return;

  const mid = interpolateGreatCircle(
    fromStop.lat, fromStop.lng,
    toStop.lat, toStop.lng,
    0.5
  );

  const cruiseAlt = arcAltitude(fromStop, toStop);
  const zoomInAlt = 0.6; // Intimate close-up on arrival

  const t1 = Math.round(totalDuration * 0.30); // Zoom out
  const t2 = Math.round(totalDuration * 0.40); // Pan across
  const t3 = Math.round(totalDuration * 0.30); // Zoom in

  // Phase 1: Zoom OUT from departure city (stay centered on departure, rise up)
  globe.pointOfView({ lat: fromStop.lat, lng: fromStop.lng, altitude: cruiseAlt }, t1);

  // Phase 2: Pan across to midpoint (stay at cruise altitude)
  setTimeout(() => {
    globe.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: cruiseAlt }, t2);
  }, t1);

  // Phase 3: Zoom IN to destination city
  setTimeout(() => {
    globe.pointOfView({ lat: toStop.lat, lng: toStop.lng, altitude: zoomInAlt }, t3);
  }, t1 + t2);
}

export function updateArcs(stops, upToIndex) {
  const arcs = [];
  for (let i = 0; i < upToIndex && i < stops.length - 1; i++) {
    arcs.push({
      startLat: stops[i].lat,
      startLng: stops[i].lng,
      endLat: stops[i + 1].lat,
      endLng: stops[i + 1].lng,
      color: i === upToIndex - 1
        ? ['rgba(232, 212, 139, 1)', 'rgba(201, 168, 76, 0.8)']
        : ['rgba(201, 168, 76, 0.5)', 'rgba(138, 114, 52, 0.3)'],
      stroke: i === upToIndex - 1 ? 0.8 : 0.4,
    });
  }

  globe
    .arcsData(arcs)
    .arcColor('color')
    .arcStroke('stroke');
}

export function setRingAtStop(stop) {
  if (!globe) return;
  globe.ringsData([{ lat: stop.lat, lng: stop.lng }]);
}

/**
 * Animate a transport icon (🚂, 🚢, etc.) moving along the arc
 * from one stop to the next over `duration` ms.
 */
export function animateTransport(fromStop, toStop, duration = 6000) {
  stopTransportAnimation();

  const emoji = TRANSPORT_MAP[toStop.transport] || TRANSPORT_MAP[fromStop.nextTransport] || '🚂';

  // Pre-compute the animation path
  const STEPS = 80;
  const path = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    path.push(interpolateGreatCircle(
      fromStop.lat, fromStop.lng,
      toStop.lat, toStop.lng,
      eased
    ));
  }

  // Create the element ONCE and keep a stable reference
  const el = createTransportElement(emoji);
  let lastIdx = -1;

  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const idx = Math.min(Math.floor(t * STEPS), STEPS);

    // Only update when position actually changes
    if (idx !== lastIdx) {
      lastIdx = idx;
      const pos = path[idx];

      // Create a FRESH data array with a FRESH object each update
      // This forces Globe.gl's digest to detect the change
      transportData = [{ lat: pos.lat, lng: pos.lng, el }];
      globe.htmlElementsData(transportData);
    }

    if (t < 1) {
      transportAnimId = requestAnimationFrame(tick);
    } else {
      transportAnimId = null;
    }
  }

  // Kick off with initial position
  transportData = [{ lat: fromStop.lat, lng: fromStop.lng, el }];
  globe.htmlElementsData(transportData);

  transportAnimId = requestAnimationFrame(tick);
}

/**
 * Place a static transport icon at the current stop (showing what arrived).
 */
export function showTransportAtStop(stop) {
  stopTransportAnimation();

  const emoji = TRANSPORT_MAP[stop.transport] || '📍';
  const el = createTransportElement(emoji);
  transportData = [{ lat: stop.lat, lng: stop.lng, el }];
  globe.htmlElementsData(transportData);
}

export function stopTransportAnimation() {
  if (transportAnimId) {
    cancelAnimationFrame(transportAnimId);
    transportAnimId = null;
  }
}

export function clearTransport() {
  stopTransportAnimation();
  transportData = [];
  if (globe) globe.htmlElementsData([]);
}

export function getGlobe() {
  return globe;
}
