// Flat garment illustrations: used for the sample wardrobe and as a fallback picture.
import { subInfo } from './data.js';
import { readableOn } from './color.js';

const P = {
  tee: 'M60 46 L85 38 Q100 52 115 38 L140 46 L172 78 L152 98 L140 88 L140 196 L60 196 L60 88 L48 98 L28 78 Z',
  tank: 'M72 22 L84 22 Q100 52 116 22 L128 22 L134 82 L140 212 L60 212 L66 82 Z',
  shirt: 'M60 40 L85 28 L100 50 L115 28 L140 40 L170 150 L152 156 L140 92 L140 204 L60 204 L60 92 L48 156 L30 150 Z',
  knit: 'M58 42 Q100 28 142 42 L172 158 L152 162 L140 100 L142 192 L58 192 L60 100 L48 162 L28 158 Z',
  blazer: 'M58 30 L86 18 L100 70 L114 18 L142 30 L172 150 L154 154 L144 96 L146 214 L54 214 L56 96 L46 154 L28 150 Z',
  cardigan: 'M58 32 L88 20 L100 80 L112 20 L142 32 L172 152 L152 158 L140 92 L142 208 L58 208 L60 92 L48 158 L28 152 Z',
  vest: 'M66 22 L86 22 L100 92 L114 22 L134 22 L144 72 L142 200 L58 200 L56 72 Z',
  trousers: 'M62 18 L138 18 L148 224 L110 224 L100 84 L90 224 L52 224 Z',
  wide: 'M62 18 L138 18 L164 224 L106 224 L100 92 L94 224 L36 224 Z',
  shorts: 'M62 50 L138 50 L150 150 L106 150 L100 108 L94 150 L50 150 Z',
  skirt: 'M70 50 L130 50 L152 160 L48 160 Z',
  midi: 'M72 20 L128 20 L158 222 L42 222 Z',
  dress: 'M74 14 L86 14 Q100 34 114 14 L126 14 L132 82 L124 106 L158 228 L42 228 L76 106 L68 82 Z',
  slip: 'M80 12 L84 12 L90 58 Q100 66 110 58 L116 12 L120 12 L128 92 L148 228 L52 228 L72 92 Z',
  jumpsuit: 'M70 14 L130 14 L136 102 L148 228 L108 228 L100 132 L92 228 L52 228 L64 102 Z',
  coat: 'M58 22 L86 12 L100 46 L114 12 L142 22 L174 156 L156 160 L146 112 L152 234 L48 234 L54 112 L44 160 L26 156 Z',
  puffer: 'M56 34 Q100 14 144 34 Q176 70 176 150 L156 152 L148 112 Q152 170 146 196 Q100 210 54 196 Q48 170 52 112 L44 152 L24 150 Q24 70 56 34 Z',
  jacket: 'M58 32 L86 20 L100 46 L114 20 L142 32 L172 142 L154 146 L144 98 L144 184 L56 184 L56 98 L46 146 L28 142 Z',
  sneaker: 'M22 170 L38 128 Q60 120 82 112 L104 128 Q150 136 176 146 Q188 154 184 176 L22 176 Z',
  loafer: 'M22 172 Q30 140 72 136 L122 138 Q170 144 184 168 L184 178 L22 178 Z',
  flat: 'M24 176 Q34 150 80 148 L120 148 Q168 150 182 172 L182 180 L24 180 Z',
  heel: 'M30 120 Q36 112 52 116 L118 150 Q160 156 176 166 L176 176 L120 172 L56 140 L50 196 L42 196 L40 136 Z',
  boot: 'M66 40 L114 40 L116 128 Q170 138 182 160 L182 176 L62 176 Z',
  tallboot: 'M74 8 L114 8 L116 132 Q168 140 180 162 L180 178 L70 178 Z',
  bag: 'M46 100 L154 100 L164 206 L36 206 Z',
  tote: 'M38 90 L162 90 L156 214 L44 214 Z',
  clutch: 'M30 120 L170 120 L170 178 Q170 186 162 186 L38 186 Q30 186 30 178 Z',
  scarf: 'M70 10 L120 10 L130 220 L80 220 Z',
  belt: 'M14 110 L186 110 L186 136 L14 136 Z',
  hat: 'M40 150 Q40 70 100 66 Q160 70 160 150 Z',
  tie: 'M90 20 L110 20 L114 40 L124 180 L100 214 L76 180 L86 40 Z',
  jewel: 'M100 60 m-56 0 a56 56 0 1 0 112 0 a56 56 0 1 0 -112 0',
  gloves: 'M60 210 L60 110 L52 64 L64 60 L72 100 L72 50 L84 48 L86 98 L90 44 L102 44 L102 98 L108 56 L120 58 L118 120 L136 96 L146 104 L120 160 L120 210 Z',
};
const EXTRA = {
  shirt: '<path d="M100 50 L100 204" stroke="#0003" stroke-width="2" fill="none"/>',
  blazer: '<path d="M100 70 L100 214 M86 18 L78 90 L100 112 M114 18 L122 90 L100 112" stroke="#0004" stroke-width="2" fill="none"/>',
  cardigan: '<path d="M100 80 L100 208" stroke="#0004" stroke-width="2" fill="none"/>',
  coat: '<path d="M100 46 L100 234 M86 12 L74 100 M114 12 L126 100" stroke="#0004" stroke-width="2" fill="none"/>',
  puffer: '<path d="M54 80 Q100 92 146 80 M52 120 Q100 132 148 120 M52 160 Q100 172 148 160" stroke="#0003" stroke-width="2" fill="none"/>',
  bag: '<path d="M70 100 Q70 50 100 50 Q130 50 130 100" stroke="currentColor" stroke-width="7" fill="none"/>',
  tote: '<path d="M64 90 Q64 40 84 40 Q100 40 100 90 M100 90 Q100 40 116 40 Q136 40 136 90" stroke="currentColor" stroke-width="6" fill="none"/>',
  belt: '<rect x="86" y="104" width="30" height="38" rx="3" fill="none" stroke="#C8A24A" stroke-width="5"/>',
  hat: '<path d="M22 152 L178 152" stroke="currentColor" stroke-width="10"/>',
  jewel: '<circle cx="100" cy="122" r="12" fill="#C8A24A"/>',
  knit: '<path d="M60 182 L140 182" stroke="#0003" stroke-width="6" fill="none"/>',
  sneaker: '<path d="M22 166 L184 166" stroke="#FFF" stroke-width="8"/>',
};
const PATTERN_DEF = {
  stripe: (c) => `<pattern id="pt" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="${c}"/></pattern>`,
  check: (c) => `<pattern id="pt" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="8" fill="${c}" opacity=".55"/><rect width="8" height="28" fill="${c}" opacity=".55"/></pattern>`,
  dots: (c) => `<pattern id="pt" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3.5" fill="${c}"/></pattern>`,
  floral: (c) => `<pattern id="pt" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="5" fill="${c}"/><circle cx="26" cy="24" r="4" fill="${c}" opacity=".7"/></pattern>`,
  animal: (c) => `<pattern id="pt" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M6 6 q6 -4 10 2 q-4 6 -10 -2 M18 18 q6 -3 9 3 q-5 5 -9 -3" fill="${c}"/></pattern>`,
};

export function garmentSVG(cat, sub, hex, pattern = 'solid', hex2) {
  const shape = subInfo(cat, sub).shape;
  const d = P[shape] || P.tee;
  const line = readableOn(hex) === '#FFFFFF' ? '#FFFFFF33' : '#00000022';
  const patC = hex2 || (readableOn(hex) === '#FFFFFF' ? '#FFFFFF55' : '#00000033');
  const pat = PATTERN_DEF[pattern];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480" style="color:${hex}">
<defs>${pat ? pat(patC) : ''}</defs>

<path d="${d}" fill="${hex}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
${pat ? `<path d="${d}" fill="url(#pt)"/>` : ''}
${EXTRA[shape] || ''}
</svg>`;
}
export const svgBlob = (svg) => new Blob([svg], { type: 'image/svg+xml' });

// A believable mixed wardrobe so the app can be tried before photographing anything.
// [cat, sub, hex, pattern, material, formality, warmth, wear, hex2]
const S = [
  ['top', 'tshirt', '#F0EEE9', 'solid', 'cotton', 2, 1],
  ['top', 'tshirt', '#000000', 'solid', 'cotton', 2, 1],
  ['top', 'shirt', '#FFFFFF', 'solid', 'cotton', 3, 1],
  ['top', 'shirt', '#A9C6E8', 'stripe', 'cotton', 3, 1, null, '#FFFFFF'],
  ['top', 'knit', '#6D1F2F', 'solid', 'cashmere', 3, 3],
  ['top', 'turtleneck', '#4A2E22', 'solid', 'wool', 3, 3],
  ['top', 'knit', '#E3D6C1', 'solid', 'wool', 2, 3],
  ['top', 'blouse', '#5A2A55', 'solid', 'satin', 4, 1, 'w'],
  ['top', 'bodysuit', '#000000', 'solid', 'lace', 3, 0, 'w'],
  ['top', 'sweatshirt', '#8D9199', 'solid', 'cotton', 1, 3],
  ['layer', 'blazer', '#1C2A5A', 'solid', 'wool', 4, 2],
  ['layer', 'blazer', '#5E5B2A', 'check', 'wool', 4, 2, null, '#3A2418'],
  ['layer', 'cardigan', '#C8962E', 'solid', 'knit', 2, 2],
  ['layer', 'vest', '#8E7E75', 'solid', 'knit', 3, 1],
  ['bottom', 'jeans', '#3E5A7E', 'solid', 'denim', 2, 2],
  ['bottom', 'jeans', '#1E2230', 'solid', 'denim', 2, 2],
  ['bottom', 'trousers', '#000000', 'solid', 'wool', 4, 2],
  ['bottom', 'trousers', '#B9874D', 'solid', 'wool', 4, 2],
  ['bottom', 'chinos', '#E3D6C1', 'solid', 'cotton', 3, 2],
  ['bottom', 'leather', '#4A2E22', 'solid', 'leather', 3, 2],
  ['bottom', 'midiskirt', '#1F4D3A', 'solid', 'satin', 3, 1, 'w'],
  ['bottom', 'midiskirt', '#8A5A2B', 'animal', 'silk', 3, 1, 'w', '#2E1E18'],
  ['bottom', 'joggers', '#333338', 'solid', 'technical', 1, 2],
  ['dress', 'slipdress', '#6D1F2F', 'solid', 'velvet', 4, 1, 'w'],
  ['dress', 'knitdress', '#8D9199', 'solid', 'knit', 3, 3, 'w'],
  ['dress', 'daydress', '#F0EEE9', 'floral', 'cotton', 2, 1, 'w', '#C9372C'],
  ['dress', 'suit', '#333338', 'solid', 'wool', 5, 2, 'm'],
  ['outer', 'coat', '#B9874D', 'solid', 'wool', 4, 4],
  ['outer', 'coat', '#000000', 'solid', 'wool', 4, 4],
  ['outer', 'trench', '#D8C3A5', 'solid', 'cotton', 3, 2],
  ['outer', 'leatherjkt', '#000000', 'solid', 'leather', 2, 2],
  ['outer', 'puffer', '#1F4D3A', 'solid', 'technical', 1, 5],
  ['shoes', 'sneakers', '#FFFFFF', 'solid', 'leather', 2, 1],
  ['shoes', 'loafers', '#3A2418', 'solid', 'leather', 3, 1],
  ['shoes', 'chelsea', '#000000', 'solid', 'leather', 3, 3],
  ['shoes', 'kneeboots', '#4A2E22', 'solid', 'suede', 3, 3, 'w'],
  ['shoes', 'heels', '#000000', 'solid', 'leather', 5, 0, 'w'],
  ['shoes', 'derby', '#000000', 'solid', 'leather', 4, 1, 'm'],
  ['shoes', 'running', '#8D9199', 'solid', 'technical', 1, 1],
  ['bag', 'shoulder', '#6D1F2F', 'solid', 'leather', 3, 0],
  ['bag', 'tote', '#B9874D', 'solid', 'leather', 2, 0],
  ['bag', 'clutch', '#000000', 'solid', 'satin', 5, 0, 'w'],
  ['acc', 'scarf', '#6D1F2F', 'check', 'wool', 2, 2, null, '#1F4D3A'],
  ['acc', 'jewellery', '#C8A24A', 'solid', null, 3, 0],
  ['acc', 'tie', '#5A2A55', 'solid', 'silk', 4, 0, 'm'],
];

export function sampleItems(wear) {
  return S.filter((r) => !r[7] || wear === 'all' || r[7] === wear).map((r, i) => {
    const [cat, sub, hex, pattern, material, formality, warmth, , hex2] = r;
    return {
      id: 'sample-' + i, sample: true, cat, sub, pattern, material, formality, warmth,
      colors: [{ hex, share: hex2 ? 0.7 : 1 }, ...(hex2 ? [{ hex: hex2, share: 0.3 }] : [])],
      seasons: [], styles: [], fav: false, wornCount: 0, lastWorn: null, created: Date.now() - i,
      img: svgBlob(garmentSVG(cat, sub, hex, pattern, hex2)), name: '',
    };
  });
}
