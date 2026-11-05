// Colour maths: hex/rgb/lab, CIEDE-ish distance, dominant colour extraction, naming.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
export function rgbToLab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export const hexToLab = (hex) => rgbToLab(hexToRgb(hex));

// Lab → LCh
export function lch(hex) {
  const [L, a, b] = hexToLab(hex);
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

// CIE94-style distance (good enough for wardrobe matching)
export function deltaE(hexA, hexB) {
  const [L1, a1, b1] = hexToLab(hexA), [L2, a2, b2] = hexToLab(hexB);
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const dL = L1 - L2, dC = C1 - C2;
  const dH2 = Math.max(0, (a1 - a2) ** 2 + (b1 - b2) ** 2 - dC ** 2);
  const sC = 1 + 0.045 * C1, sH = 1 + 0.015 * C1;
  return Math.sqrt(dL ** 2 + (dC / sC) ** 2 + dH2 / sH ** 2);
}

export const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

// In fashion, navy, brown, camel, beige, denim, olive and khaki behave as neutrals.
export function isNeutral(hex) {
  const { L, C, h } = lch(hex);
  if (C < 13) return true;                         // black, white, greys
  if (L < 16) return true;                         // near-black of any hue
  if (L < 34 && C < 42 && ((h >= 235 && h <= 300) || (h >= 30 && h <= 95))) return true; // navy, midnight, espresso, chocolate
  if (h >= 40 && h <= 95 && C < 42 && L < 82) return true; // camel, tan, khaki, brown, beige
  if (h >= 95 && h <= 120 && C < 30 && L < 55) return true; // olive
  if (h >= 230 && h <= 290 && C < 32 && L < 60) return true; // denim / slate blue
  return false;
}

const NAMES = [
  ['#000000', 'black'], ['#333338', 'charcoal'], ['#808080', 'grey'], ['#C0C0C0', 'light grey'], ['#FFFFFF', 'white'],
  ['#F0EEE9', 'off-white'], ['#F2E6CC', 'cream'], ['#E3D6C1', 'oatmeal'], ['#D8C3A5', 'beige'], ['#B9874D', 'camel'],
  ['#9C8B78', 'taupe'], ['#8A5A2B', 'tan'], ['#5A3A26', 'brown'], ['#4A2E22', 'chocolate'], ['#2E1E18', 'espresso'], ['#3A3330', 'charcoal brown'], ['#C25A1C', 'burnt orange'], ['#B98222', 'amber'], ['#A08F5E', 'khaki'],
  ['#5E5B2A', 'olive'], ['#3F3F1F', 'dark olive'], ['#1C2A5A', 'navy'], ['#141E3C', 'midnight'], ['#4A6A8F', 'denim blue'], ['#8BB4DE', 'sky blue'],
  ['#1F50B8', 'cobalt'], ['#2C5BD9', 'royal blue'], ['#A9C6E8', 'powder blue'], ['#0F7C80', 'teal'], ['#00A8B5', 'turquoise'],
  ['#1F4D3A', 'bottle green'], ['#2F5A3A', 'forest green'], ['#00875A', 'emerald'], ['#2DAA5A', 'kelly green'], ['#9CAF9A', 'sage'],
  ['#7B8A4E', 'moss'], ['#C5D86D', 'chartreuse'], ['#F6D86B', 'butter yellow'], ['#C8962E', 'ochre'], ['#E0B03A', 'mustard'],
  ['#F28A2E', 'orange'], ['#B5512A', 'rust'], ['#C9372C', 'tomato red'], ['#D0102E', 'red'], ['#9C3B2E', 'brick'],
  ['#6D1F2F', 'burgundy'], ['#8E1E4F', 'berry'], ['#C2185B', 'fuchsia'], ['#E8338A', 'hot pink'], ['#F4A6B4', 'pink'],
  ['#E8B4C4', 'baby pink'], ['#C99AA0', 'dusty rose'], ['#F08A75', 'coral'], ['#F7B89A', 'peach'], ['#A7869C', 'mauve'],
  ['#B7A9DA', 'lavender'], ['#7A4C7E', 'purple'], ['#5A2A55', 'plum'], ['#3F2340', 'aubergine'], ['#5B2A86', 'violet'],
];
const NAME_LABS = NAMES.map(([hex, n]) => [hex, n]);
export function colorName(hex) {
  let best = 'colour', bd = Infinity;
  for (const [h, n] of NAME_LABS) { const d = deltaE(hex, h); if (d < bd) { bd = d; best = n; } }
  return best;
}

// --- Dominant colour extraction from an image ---
// Background is estimated from the border; pixels close to it are ignored, then k-means in Lab.
export function extractColors(imgSource, k = 3) {
  const S = 72;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgSource, 0, 0, S, S);
  const data = ctx.getImageData(0, 0, S, S).data;
  const px = [], border = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (data[i + 3] < 128) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const onBorder = x < 3 || y < 3 || x >= S - 3 || y >= S - 3;
    if (onBorder) border.push(rgb); else px.push({ rgb, x, y });
  }
  const bgLab = rgbToLab(border.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / Math.max(1, border.length)));
  // weight towards centre; drop background-like pixels
  let pts = px.map((p) => ({ lab: rgbToLab(p.rgb), rgb: p.rgb, w: 1.5 - Math.hypot(p.x - S / 2, p.y - S / 2) / S }))
    .filter((p) => Math.hypot(p.lab[0] - bgLab[0], p.lab[1] - bgLab[1], p.lab[2] - bgLab[2]) > 14);
  if (pts.length < 80) pts = px.map((p) => ({ lab: rgbToLab(p.rgb), rgb: p.rgb, w: 1 }));
  // k-means++ lite
  let cents = [pts[Math.floor(pts.length / 2)].lab];
  while (cents.length < k) {
    let far = pts[0], fd = -1;
    for (const p of pts) { const d = Math.min(...cents.map((c2) => dist(p.lab, c2))); if (d > fd) { fd = d; far = p; } }
    cents.push(far.lab);
  }
  let groups = [];
  for (let it = 0; it < 8; it++) {
    groups = cents.map(() => ({ sum: [0, 0, 0], rgb: [0, 0, 0], w: 0 }));
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cents.forEach((c2, i) => { const d = dist(p.lab, c2); if (d < bd) { bd = d; bi = i; } });
      const g = groups[bi];
      g.w += p.w; for (let j = 0; j < 3; j++) { g.sum[j] += p.lab[j] * p.w; g.rgb[j] += p.rgb[j] * p.w; }
    }
    cents = groups.map((g, i) => (g.w ? g.sum.map((v) => v / g.w) : cents[i]));
  }
  const total = groups.reduce((a, g) => a + g.w, 0) || 1;
  const out = groups.filter((g) => g.w > 0)
    .map((g) => ({ hex: rgbToHex(g.rgb.map((v) => v / g.w)), share: g.w / total }))
    .sort((a, b) => b.share - a.share);
  // merge near-duplicates
  const merged = [];
  for (const o of out) { const m = merged.find((x) => deltaE(x.hex, o.hex) < 10); if (m) m.share += o.share; else merged.push(o); }
  return merged.filter((o, i) => i === 0 || o.share > 0.12).slice(0, 3);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function readableOn(hex) { return lch(hex).L > 62 ? '#1E1626' : '#FFFFFF'; }
