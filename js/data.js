// Static knowledge: garment types, styles, occasions, colour seasons, AW26 trends.
// Formality scale: 1 lounge/sport · 2 casual · 3 smart casual · 4 business/dressy · 5 formal
// Warmth scale: 0 (very light) … 5 (very warm)

export const CATEGORIES = [
  { key: 'top', name: 'Tops' },
  { key: 'layer', name: 'Layers' },
  { key: 'bottom', name: 'Bottoms' },
  { key: 'dress', name: 'Dresses & one-pieces' },
  { key: 'outer', name: 'Coats & jackets' },
  { key: 'shoes', name: 'Shoes' },
  { key: 'bag', name: 'Bags' },
  { key: 'acc', name: 'Accessories' },
];

// wear: 'w' womenswear-leaning, 'm' menswear-leaning, undefined = everyone
export const SUBS = {
  top: [
    { key: 'tshirt', name: 'T-shirt', f: 2, w: 1, shape: 'tee' },
    { key: 'tank', name: 'Tank / cami', f: 2, w: 0, shape: 'tank' },
    { key: 'shirt', name: 'Shirt', f: 3, w: 1, shape: 'shirt' },
    { key: 'blouse', name: 'Blouse', f: 3, w: 1, shape: 'shirt', wear: 'w' },
    { key: 'polo', name: 'Polo', f: 2, w: 1, shape: 'tee' },
    { key: 'knit', name: 'Sweater', f: 2, w: 3, shape: 'knit' },
    { key: 'turtleneck', name: 'Turtleneck', f: 3, w: 3, shape: 'knit' },
    { key: 'sweatshirt', name: 'Sweatshirt', f: 1, w: 3, shape: 'knit' },
    { key: 'bodysuit', name: 'Bodysuit / corset top', f: 3, w: 0, shape: 'tank', wear: 'w' },
  ],
  layer: [
    { key: 'blazer', name: 'Blazer', f: 4, w: 2, shape: 'blazer' },
    { key: 'cardigan', name: 'Cardigan', f: 2, w: 2, shape: 'cardigan' },
    { key: 'vest', name: 'Waistcoat / knit vest', f: 3, w: 1, shape: 'vest' },
    { key: 'overshirt', name: 'Overshirt', f: 2, w: 2, shape: 'shirt' },
    { key: 'hoodie', name: 'Hoodie', f: 1, w: 3, shape: 'knit' },
  ],
  bottom: [
    { key: 'jeans', name: 'Jeans', f: 2, w: 2, shape: 'trousers' },
    { key: 'trousers', name: 'Tailored trousers', f: 4, w: 2, shape: 'trousers' },
    { key: 'chinos', name: 'Chinos', f: 3, w: 2, shape: 'trousers' },
    { key: 'wideleg', name: 'Wide-leg trousers', f: 3, w: 2, shape: 'wide' },
    { key: 'leather', name: 'Leather trousers', f: 3, w: 2, shape: 'trousers' },
    { key: 'cargo', name: 'Cargo trousers', f: 1, w: 2, shape: 'trousers' },
    { key: 'joggers', name: 'Joggers / leggings', f: 1, w: 2, shape: 'trousers' },
    { key: 'shorts', name: 'Shorts', f: 1, w: 0, shape: 'shorts' },
    { key: 'miniskirt', name: 'Mini skirt', f: 2, w: 1, shape: 'skirt', wear: 'w' },
    { key: 'midiskirt', name: 'Midi skirt', f: 3, w: 1, shape: 'midi', wear: 'w' },
    { key: 'maxiskirt', name: 'Maxi skirt', f: 3, w: 2, shape: 'midi', wear: 'w' },
  ],
  dress: [
    { key: 'daydress', name: 'Day dress', f: 2, w: 1, shape: 'dress', wear: 'w' },
    { key: 'knitdress', name: 'Knit dress', f: 3, w: 3, shape: 'dress', wear: 'w' },
    { key: 'shirtdress', name: 'Shirt dress', f: 3, w: 1, shape: 'dress', wear: 'w' },
    { key: 'slipdress', name: 'Slip / evening dress', f: 4, w: 0, shape: 'slip', wear: 'w', eve: true },
    { key: 'gown', name: 'Gown', f: 5, w: 0, shape: 'slip', wear: 'w', eve: true },
    { key: 'jumpsuit', name: 'Jumpsuit', f: 3, w: 1, shape: 'jumpsuit' },
    { key: 'suit', name: 'Suit (worn as a set)', f: 4, w: 2, shape: 'blazer' },
  ],
  outer: [
    { key: 'trench', name: 'Trench coat', f: 3, w: 2, shape: 'coat', rain: true },
    { key: 'coat', name: 'Wool coat', f: 4, w: 4, shape: 'coat' },
    { key: 'puffer', name: 'Puffer', f: 1, w: 5, shape: 'puffer', rain: true },
    { key: 'parka', name: 'Parka', f: 1, w: 5, shape: 'coat', rain: true },
    { key: 'shearling', name: 'Shearling / aviator', f: 2, w: 5, shape: 'jacket' },
    { key: 'leatherjkt', name: 'Leather jacket', f: 2, w: 2, shape: 'jacket' },
    { key: 'bomber', name: 'Bomber', f: 2, w: 3, shape: 'jacket' },
    { key: 'denimjkt', name: 'Denim jacket', f: 1, w: 2, shape: 'jacket' },
    { key: 'rainjkt', name: 'Rain shell', f: 1, w: 1, shape: 'jacket', rain: true },
  ],
  shoes: [
    { key: 'sneakers', name: 'Sneakers', f: 2, w: 1, shape: 'sneaker' },
    { key: 'running', name: 'Running / gym shoes', f: 1, w: 1, shape: 'sneaker' },
    { key: 'loafers', name: 'Loafers', f: 3, w: 1, shape: 'loafer' },
    { key: 'ballet', name: 'Ballet flats', f: 3, w: 0, shape: 'flat', wear: 'w' },
    { key: 'derby', name: 'Derbies / oxfords', f: 4, w: 1, shape: 'loafer' },
    { key: 'heels', name: 'Heels / pumps', f: 4, w: 0, shape: 'heel', wear: 'w' },
    { key: 'mules', name: 'Mules / slingbacks', f: 3, w: 0, shape: 'heel', wear: 'w' },
    { key: 'ankleboots', name: 'Ankle boots', f: 3, w: 3, shape: 'boot' },
    { key: 'chelsea', name: 'Chelsea boots', f: 3, w: 3, shape: 'boot' },
    { key: 'kneeboots', name: 'Knee boots', f: 3, w: 3, shape: 'tallboot', wear: 'w' },
    { key: 'hiking', name: 'Hiking / winter boots', f: 1, w: 4, shape: 'boot', rain: true },
    { key: 'sandals', name: 'Sandals', f: 2, w: 0, shape: 'flat' },
  ],
  bag: [
    { key: 'tote', name: 'Tote', f: 2, w: 0, shape: 'tote' },
    { key: 'shoulder', name: 'Shoulder bag', f: 3, w: 0, shape: 'bag' },
    { key: 'crossbody', name: 'Crossbody', f: 2, w: 0, shape: 'bag' },
    { key: 'clutch', name: 'Clutch / evening bag', f: 4, w: 0, shape: 'clutch', eve: true },
    { key: 'backpack', name: 'Backpack', f: 1, w: 0, shape: 'tote' },
  ],
  acc: [
    { key: 'scarf', name: 'Scarf', f: 2, w: 2, shape: 'scarf' },
    { key: 'belt', name: 'Belt', f: 3, w: 0, shape: 'belt' },
    { key: 'hat', name: 'Hat / beanie', f: 2, w: 1, shape: 'hat' },
    { key: 'tie', name: 'Tie', f: 4, w: 0, shape: 'tie', wear: 'm' },
    { key: 'jewellery', name: 'Jewellery', f: 3, w: 0, shape: 'jewel' },
    { key: 'gloves', name: 'Gloves', f: 2, w: 1, shape: 'gloves' },
  ],
};

export const subInfo = (cat, sub) => (SUBS[cat] || []).find((s) => s.key === sub) || { name: sub || cat, f: 2, w: 1, shape: 'tee' };

export const PATTERNS = [
  { key: 'solid', name: 'Plain' },
  { key: 'stripe', name: 'Stripes' },
  { key: 'check', name: 'Check / tartan' },
  { key: 'floral', name: 'Floral' },
  { key: 'animal', name: 'Animal' },
  { key: 'dots', name: 'Dots' },
  { key: 'graphic', name: 'Graphic / logo' },
  { key: 'other', name: 'Other print' },
];

export const MATERIALS = ['cotton', 'denim', 'wool', 'cashmere', 'knit', 'linen', 'silk', 'satin', 'velvet', 'leather', 'suede', 'shearling', 'lace', 'technical', 'synthetic'];

export const SEASONS = [
  { key: 'spring', name: 'Spring' },
  { key: 'summer', name: 'Summer' },
  { key: 'autumn', name: 'Autumn' },
  { key: 'winter', name: 'Winter' },
];

export const FORMALITY_LABELS = ['', 'Lounge & sport', 'Casual', 'Smart casual', 'Business & dressy', 'Formal'];
export const WARMTH_LABELS = ['Very light', 'Light', 'Mid-weight', 'Warm', 'Very warm', 'Arctic'];

// Each style: what pieces, fabrics, prints and colour strategy it leans towards.
export const STYLES = [
  {
    key: 'chic', name: 'Parisian chic',
    blurb: 'Tailored basics, one deliberate accent, nothing trying too hard.',
    swatch: ['#1F2340', '#F0EEE9', '#B9874D', '#C8102E'],
    subs: ['blazer', 'trench', 'shirt', 'blouse', 'knit', 'jeans', 'trousers', 'loafers', 'ballet', 'midiskirt', 'shoulder', 'scarf', 'coat'],
    materials: ['wool', 'cashmere', 'silk', 'leather'], patterns: ['stripe'], color: 'accent', fShift: 0.3,
  },
  {
    key: 'minimal', name: 'Quiet minimal',
    blurb: 'Clean lines, tonal neutrals, no prints. Fabric does the talking.',
    swatch: ['#000000', '#8D9199', '#E6E1DA', '#4A2E22'],
    subs: ['tshirt', 'turtleneck', 'knit', 'trousers', 'wideleg', 'coat', 'loafers', 'derby', 'tote', 'slipdress'],
    materials: ['wool', 'cashmere', 'cotton', 'silk'], patterns: ['solid'], color: 'tonal', fShift: 0.2,
  },
  {
    key: 'classic', name: 'Classic & preppy',
    blurb: 'Oxford shirts, knits over collars, checks and good loafers.',
    swatch: ['#1C2A5A', '#F2E6CC', '#6D1F2F', '#2F5A3A'],
    subs: ['shirt', 'polo', 'knit', 'vest', 'blazer', 'chinos', 'trousers', 'midiskirt', 'loafers', 'derby', 'coat', 'cardigan'],
    materials: ['wool', 'cotton', 'cashmere'], patterns: ['check', 'stripe'], color: 'accent', fShift: 0.4,
  },
  {
    key: 'smart', name: 'Smart casual',
    blurb: 'Office-ready without the suit. Easy to repeat, always appropriate.',
    swatch: ['#2B3A5A', '#FFFFFF', '#9A8F80', '#4A2E22'],
    subs: ['shirt', 'knit', 'blazer', 'chinos', 'trousers', 'jeans', 'loafers', 'sneakers', 'chelsea', 'coat', 'overshirt'],
    materials: ['cotton', 'wool'], patterns: ['solid', 'stripe', 'check'], color: 'accent', fShift: 0,
  },
  {
    key: 'romantic', name: 'Dark romance',
    blurb: 'Lace, velvet and bows in deep tones. The gothic-romantic mood of the AW26 runways.',
    swatch: ['#000000', '#5A2A55', '#6D1F2F', '#F0EEE9'],
    subs: ['blouse', 'bodysuit', 'midiskirt', 'maxiskirt', 'slipdress', 'knitdress', 'kneeboots', 'ankleboots', 'mules', 'coat', 'jewellery'],
    materials: ['lace', 'velvet', 'satin', 'silk', 'leather'], patterns: ['floral', 'solid'], color: 'tonal', fShift: 0.4,
  },
  {
    key: 'edgy', name: 'Edgy',
    blurb: 'Leather, black on black, boots with weight.',
    swatch: ['#000000', '#333338', '#C0C0C0', '#6A1B2E'],
    subs: ['leatherjkt', 'leather', 'jeans', 'tshirt', 'tank', 'chelsea', 'ankleboots', 'kneeboots', 'bomber', 'hoodie', 'belt'],
    materials: ['leather', 'denim', 'velvet'], patterns: ['solid', 'animal', 'graphic'], color: 'mono', fShift: -0.2,
  },
  {
    key: 'boho', name: 'Folk & boho',
    blurb: 'Suede, earthy tones, flowing skirts, tall boots. Folk revival is back for AW26.',
    swatch: ['#A87C4F', '#6E6B55', '#C25A1C', '#EFE3CC'],
    subs: ['blouse', 'maxiskirt', 'midiskirt', 'daydress', 'cardigan', 'shearling', 'kneeboots', 'ankleboots', 'crossbody', 'scarf', 'hat', 'wideleg'],
    materials: ['suede', 'linen', 'knit', 'shearling', 'lace'], patterns: ['floral', 'other', 'check'], color: 'analogous', fShift: -0.3,
  },
  {
    key: 'street', name: 'Street',
    blurb: 'Sneakers first. Relaxed shapes, bombers, graphic pieces.',
    swatch: ['#000000', '#8D919B', '#0F7C80', '#F0EEE9'],
    subs: ['tshirt', 'sweatshirt', 'hoodie', 'cargo', 'jeans', 'bomber', 'puffer', 'sneakers', 'backpack', 'crossbody', 'hat', 'overshirt'],
    materials: ['cotton', 'denim', 'technical'], patterns: ['graphic', 'solid'], color: 'any', fShift: -0.6,
  },
  {
    key: 'sporty', name: 'Sporty & athleisure',
    blurb: 'Technical fabrics, comfort, polished enough for coffee after.',
    swatch: ['#1C2A5A', '#FFFFFF', '#8D9199', '#2DAA5A'],
    subs: ['tshirt', 'sweatshirt', 'joggers', 'running', 'sneakers', 'puffer', 'rainjkt', 'backpack', 'polo', 'hoodie'],
    materials: ['technical', 'cotton', 'synthetic'], patterns: ['solid', 'stripe'], color: 'any', fShift: -0.8,
  },
  {
    key: 'bold', name: 'Colour & print',
    blurb: 'Colour blocking, clashing prints, maximalism. AW26 is a maximalist season.',
    swatch: ['#1F5FE0', '#C8962E', '#5B2A86', '#C9372C'],
    subs: ['blouse', 'knit', 'wideleg', 'midiskirt', 'daydress', 'coat', 'mules', 'scarf', 'jewellery'],
    materials: ['silk', 'velvet', 'wool'], patterns: ['floral', 'animal', 'check', 'stripe', 'dots', 'other'], color: 'block', fShift: 0,
  },
];
export const styleByKey = (k) => STYLES.find((s) => s.key === k) || STYLES[0];

export const OCCASIONS = [
  { key: 'weekend', name: 'Weekend', range: [1, 2.5] },
  { key: 'office', name: 'Office day', range: [2.5, 4] },
  { key: 'meeting', name: 'Big meeting', range: [3.5, 4.6], note: 'Interviews, presentations, clients.' },
  { key: 'brunch', name: 'Brunch', range: [2, 3] },
  { key: 'date', name: 'Date night', range: [3, 4.5], evening: true },
  { key: 'dinner', name: 'Dinner out', range: [3, 4], evening: true },
  { key: 'party', name: 'Party & drinks', range: [3, 4.5], evening: true },
  { key: 'wedding', name: 'Wedding guest', range: [4, 5], noWhite: true, evening: true },
  { key: 'culture', name: 'Theatre & galleries', range: [3, 4] },
  { key: 'travel', name: 'Travel day', range: [1.5, 2.5], comfort: true },
  { key: 'walk', name: 'Outdoor walk', range: [1, 2], comfort: true, outdoor: true },
  { key: 'errands', name: 'Errands', range: [1, 2] },
  { key: 'sport', name: 'Gym & sport', range: [1, 1.4], sport: true },
];
export const occasionByKey = (k) => OCCASIONS.find((o) => o.key === k) || OCCASIONS[0];

// ---------- Colour seasons (12-season system) ----------
export const PALETTES = {
  'light-spring': {
    name: 'Light Spring', metal: 'Gold',
    about: 'Light, warm and clear. Soft peaches, buttery yellow, aqua. Swap black for navy or camel.',
    neutrals: ['#FFF8E7', '#E8D3B0', '#D9B98C', '#BDB3A3', '#5B7095', '#8A5F41'],
    accents: ['#F7B89A', '#F08A75', '#F4A6B4', '#F6D86B', '#88D4C8', '#9AA8E0', '#A8DDB5', '#6CC6CF', '#F5B36B', '#F49A8B'],
    avoid: ['#000000', '#6D1F2F', '#36363C', '#9B7B8C'],
  },
  'true-spring': {
    name: 'True Spring', metal: 'Gold',
    about: 'Warm and lively. Tomato, coral, grass green and golden yellow. Camel and cream beat black and grey.',
    neutrals: ['#FBF1DA', '#C49A62', '#8A5A2B', '#9A8F80', '#2E3F6B', '#B5A27A'],
    accents: ['#E9472F', '#F07A5A', '#2BB3A3', '#6BB33E', '#F2B632', '#F28A2E', '#57C4B4', '#F4907A', '#7D8BD6', '#E8402E'],
    avoid: ['#000000', '#F3D9E4', '#8A8E99', '#5C1A2E'],
  },
  'bright-spring': {
    name: 'Bright Spring', metal: 'Gold',
    about: 'Warm leaning but vivid. Clear coral, turquoise, kelly green. Dusty, muted shades flatten you.',
    neutrals: ['#FFF6E0', '#C69C6D', '#8E857A', '#23356B', '#5A3A28', '#FFFFFF'],
    accents: ['#F2554A', '#FF6F59', '#E63E8C', '#2DAA5A', '#00A8B5', '#FFD23F', '#FF8A2B', '#7B5CD6', '#2C5BD9', '#3CCFC4'],
    avoid: ['#C4A0A0', '#A9B49A', '#A39383', '#9C7C8E'],
  },
  'light-summer': {
    name: 'Light Summer', metal: 'Silver',
    about: 'Light, cool and gentle. Powder blue, lavender, rose. Soft navy and grey instead of black.',
    neutrals: ['#F6F4F0', '#C9CBCF', '#D8C3B8', '#8A9BB0', '#4E5D7A', '#8B7068'],
    accents: ['#A9C6E8', '#B7A9DA', '#E7A9BF', '#C9637F', '#7FC0B1', '#8C9BDB', '#6FAFB3', '#C99BC9', '#6F94C8', '#B5DCCB'],
    avoid: ['#000000', '#F28A2E', '#C8962E', '#6B4226'],
  },
  'true-summer': {
    name: 'True Summer', metal: 'Silver',
    about: 'Cool and medium-soft. Raspberry, cornflower, teal, plum. Avoid orange and golden browns.',
    neutrals: ['#F2F2EE', '#8D9199', '#4B5363', '#2B3A5A', '#7D5E5E', '#9C948F'],
    accents: ['#B83A68', '#D97A99', '#4A78B8', '#6C8FD3', '#2E8C8C', '#3D6E65', '#7A4C7E', '#C45A9A', '#8BB4DE', '#E26A7A'],
    avoid: ['#F28A2E', '#C69C6D', '#C8962E', '#6B6B2F'],
  },
  'soft-summer': {
    name: 'Soft Summer', metal: 'Silver or rose gold',
    about: 'Muted and cool. Dusty rose, sage, slate, denim blue. Tonal outfits look expensive on you.',
    neutrals: ['#E6E1DA', '#B8AFA6', '#7F7F82', '#5B6170', '#3E4A63', '#8E7E75'],
    accents: ['#C99AA0', '#A7869C', '#9CAF9A', '#5F8C8A', '#6B87A8', '#7B5A78', '#A48FAF', '#6E9E97', '#A85C77', '#5E7F94'],
    avoid: ['#000000', '#FF6F00', '#FFFFFF', '#FF2E9A'],
  },
  'soft-autumn': {
    name: 'Soft Autumn', metal: 'Soft gold',
    about: 'Muted and warm. Oatmeal, sage, moss, salmon. Low contrast, rich texture.',
    neutrals: ['#E3D6C1', '#B8956A', '#9C8B78', '#7A6450', '#6E6B55', '#4E443B'],
    accents: ['#A3AE88', '#7B8A4E', '#D9907A', '#B8735A', '#5F8E87', '#C9A15A', '#E2AC8C', '#C48A84', '#8C8A4E', '#6E4E5E'],
    avoid: ['#000000', '#CFE6F5', '#E2338C', '#FFFFFF'],
  },
  'true-autumn': {
    name: 'True Autumn', metal: 'Gold or bronze',
    about: 'Warm and rich. Rust, mustard, forest, olive and chocolate. This season’s runway palette is yours.',
    neutrals: ['#F2E6CC', '#B9874D', '#5A3A26', '#5E5B2A', '#A08F5E', '#3E2B20'],
    accents: ['#B5512A', '#C8962E', '#D9772A', '#2F5A3A', '#1F6F6F', '#C9372C', '#CC8A2E', '#C4622D', '#6B7A2E', '#9C3B2E'],
    avoid: ['#000000', '#F3D9E4', '#E2338C', '#8A8E99'],
  },
  'deep-autumn': {
    name: 'Deep Autumn', metal: 'Gold or brass',
    about: 'Deep and warm. Burgundy, bottle green, plum, espresso. Wear brown where others wear black.',
    neutrals: ['#EFE3CC', '#A87C4F', '#4A2E22', '#2E1E18', '#3F3F1F', '#3A3330'],
    accents: ['#6D1F2F', '#5A2A55', '#1F4D3A', '#0F5F63', '#C8962E', '#A34A28', '#B83226', '#3F2340', '#C25A1C', '#B98222'],
    avoid: ['#F4C9D8', '#CFE6F5', '#C0C0C0', '#FF2E9A'],
  },
  'deep-winter': {
    name: 'Deep Winter', metal: 'Silver',
    about: 'Deep and cool. Black, burgundy, emerald, sapphire. High contrast suits you.',
    neutrals: ['#000000', '#FFFFFF', '#333338', '#141E3C', '#2A2326', '#D8DCE3'],
    accents: ['#6A1B2E', '#00785A', '#C8102E', '#5B2A86', '#1F4BA5', '#00686B', '#C2185B', '#1E4D3A', '#8E1E4F', '#F3D6E4'],
    avoid: ['#C69C6D', '#F28A2E', '#C8962E', '#F7B89A'],
  },
  'true-winter': {
    name: 'True Winter', metal: 'Silver',
    about: 'Cool and crisp. True red, royal blue, emerald, pure white. Avoid warm, muted earth tones.',
    neutrals: ['#000000', '#FFFFFF', '#3A3A40', '#1C2A5A', '#9A9DA6', '#E6E9EE'],
    accents: ['#D0102E', '#1F4FCC', '#00875A', '#C2187F', '#CFE6F5', '#F5E663', '#6A3FB5', '#E8338A', '#1D5C46', '#1E50B8'],
    avoid: ['#C69C6D', '#F28A2E', '#6B6B2F', '#B5512A'],
  },
  'bright-winter': {
    name: 'Bright Winter', metal: 'Silver',
    about: 'Cool leaning and vivid. Cobalt, hot pink, emerald, black and white. Dusty shades drain you.',
    neutrals: ['#000000', '#FFFFFF', '#333338', '#182657', '#8D919B', '#D9D6D2'],
    accents: ['#1F5FE0', '#FF2E8B', '#00A8A8', '#00A36C', '#E3122B', '#7A2FBF', '#FFE94D', '#00C1C8', '#E0218A', '#D9CFF3'],
    avoid: ['#A9B49A', '#A7869C', '#C69C6D', '#C8962E'],
  },
  trend: {
    name: 'AW26 runway', metal: 'Either',
    about: 'Not sure about your colouring? This palette follows the Fall/Winter 2026 runways: brown, burgundy and plum as the new base, with teal, ochre and tomato as accents.',
    neutrals: ['#F0EEE9', '#4A2E22', '#000000', '#8D9199', '#B9874D', '#1C2A5A'],
    accents: ['#6D1F2F', '#5A2A55', '#1F4D3A', '#0F7C80', '#C8962E', '#C9372C', '#1F50B8', '#E8B4C4', '#B5512A', '#6B7A2E'],
    avoid: [],
  },
};

// Colour-season quiz → season key
export function seasonFromQuiz({ undertone, depth, contrast, chroma, drape }) {
  // when the undertone is unclear, the face-drape question decides
  if (undertone === 'neutral' && (drape === 'warm' || drape === 'cool')) undertone = drape;
  const warm = undertone === 'warm', cool = undertone === 'cool';
  if (depth === 'light') {
    if (warm) return 'light-spring';
    if (cool) return 'light-summer';
    return chroma === 'bright' ? 'light-spring' : 'light-summer';
  }
  if (depth === 'deep') {
    if (warm) return 'deep-autumn';
    if (cool) return 'deep-winter';
    return chroma === 'bright' || contrast === 'high' ? 'deep-winter' : 'deep-autumn';
  }
  // medium depth
  if (chroma === 'bright') return warm ? 'bright-spring' : cool ? 'bright-winter' : contrast === 'high' ? 'bright-winter' : 'bright-spring';
  if (chroma === 'soft') return warm ? 'soft-autumn' : cool ? 'soft-summer' : contrast === 'low' ? 'soft-summer' : 'soft-autumn';
  if (warm) return contrast === 'high' ? 'true-spring' : 'true-autumn';
  if (cool) return contrast === 'high' ? 'true-winter' : 'true-summer';
  if (contrast === 'high') return 'true-winter';
  return drape === 'warm' ? 'true-autumn' : 'true-summer';
}

// ---------- AW26 trend knowledge (Fall/Winter 2026 runway reports) ----------
export const TRENDS = {
  season: 'Autumn/Winter 2026',
  colors: [
    { hex: '#6D1F2F', name: 'Burgundy' },
    { hex: '#5A2A55', name: 'Plum' },
    { hex: '#4A2E22', name: 'Deep brown' },
    { hex: '#1F4D3A', name: 'Bottle green' },
    { hex: '#C8962E', name: 'Ochre' },
    { hex: '#0F7C80', name: 'Teal' },
    { hex: '#C9372C', name: 'Tomato red' },
    { hex: '#F0EEE9', name: 'Cloud white' },
  ],
  materials: ['velvet', 'leather', 'suede', 'shearling', 'lace'],
  patterns: ['check', 'animal', 'floral'],
  subs: ['kneeboots', 'midiskirt', 'slipdress', 'coat', 'shearling', 'vest', 'blazer'],
  notes: [
    'Brown, burgundy and plum replace black as the base of the season.',
    'Tonal dressing in one colour family, especially brown with burgundy.',
    'Texture mixing: velvet, suede, leather and lace together.',
    'Checks and tartan are back; animal print goes beyond leopard.',
    'Slimmer, structured silhouettes. Very tall boots worn with skirts.',
    'Pantone’s colour of 2026 is a soft white, Cloud Dancer.',
  ],
};
