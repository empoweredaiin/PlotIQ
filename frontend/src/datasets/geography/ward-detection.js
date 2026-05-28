function _pipRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function detectWardFromCoords(lat, lng, features) {
  const pt = [lng, lat];
  for (const f of features) {
    const { type, coordinates } = f.geometry;
    let hit = false;
    if (type === 'Polygon') hit = _pipRing(pt, coordinates[0]);
    else if (type === 'MultiPolygon') hit = coordinates.some(poly => _pipRing(pt, poly[0]));
    if (hit) return f.properties.wardname;
  }
  return null;
}

export function parseGoogleMapsPlace(url) {
  const match = url.match(/\/place\/([^/@?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
  } catch (e) {
    return null;
  }
}

export function parseGoogleMapsCoords(url) {
  const atMatch = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) return [parseFloat(atMatch[1]), parseFloat(atMatch[2])];
  const qMatch = url.match(/[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (qMatch) return [parseFloat(qMatch[1]), parseFloat(qMatch[2])];
  const llMatch = url.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (llMatch) return [parseFloat(llMatch[1]), parseFloat(llMatch[2])];
  return null;
}
