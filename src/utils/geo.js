/**
 * Interpolate along a great-circle (geodesic) arc.
 * Given t in [0, 1], returns the [lat, lng] at that fraction of the arc.
 */
export function interpolateGreatCircle(lat1, lng1, lat2, lng2, t) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const lam1 = toRad(lng1);
  const phi2 = toRad(lat2);
  const lam2 = toRad(lng2);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((phi2 - phi1) / 2), 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin((lam2 - lam1) / 2), 2)
    )
  );

  if (d < 0.0001) return { lat: lat1, lng: lng1 };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
  const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}
