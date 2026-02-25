import gsap from 'gsap';

const needle = document.getElementById('compass-needle');
const bearingLabel = document.getElementById('compass-bearing');

/**
 * Calculate the initial bearing from point A to point B.
 * Returns degrees from north (0° = north, 90° = east).
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  return ((bearing % 360) + 360) % 360; // Normalize to 0-360
}

/**
 * Point the compass needle toward the next destination.
 */
export function updateCompass(fromStop, toStop) {
  if (!toStop) {
    // Journey complete — spin slowly
    gsap.to(needle, {
      rotation: '+=360',
      duration: 4,
      ease: 'none',
      repeat: -1,
      transformOrigin: '100px 100px',
    });
    bearingLabel.textContent = '✦ FIN ✦';
    return;
  }

  const bearing = calculateBearing(
    fromStop.lat, fromStop.lng,
    toStop.lat, toStop.lng
  );

  // Rotate needle (SVG transform-origin is at center: 100,100)
  gsap.to(needle, {
    rotation: bearing,
    duration: 1.5,
    ease: 'power2.inOut',
    transformOrigin: '100px 100px',
    overwrite: true,
  });

  bearingLabel.textContent = `${Math.round(bearing).toString().padStart(3, '0')}°`;
}

/**
 * Add tick marks to compass ring.
 */
export function initCompassTicks() {
  const ticksGroup = document.getElementById('compass-ticks');
  if (!ticksGroup) return;

  for (let i = 0; i < 72; i++) {
    const angle = i * 5;
    const isMajor = angle % 90 === 0;
    const isMid = angle % 45 === 0;
    const r1 = isMajor ? 80 : isMid ? 83 : 86;
    const r2 = 90;

    const rad = (angle * Math.PI) / 180;
    const x1 = 100 + r1 * Math.sin(rad);
    const y1 = 100 - r1 * Math.cos(rad);
    const x2 = 100 + r2 * Math.sin(rad);
    const y2 = 100 - r2 * Math.cos(rad);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#c9a84c');
    line.setAttribute('stroke-width', isMajor ? '1.5' : isMid ? '1' : '0.5');
    ticksGroup.appendChild(line);
  }
}
