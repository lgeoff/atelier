// Outfit engine: scores single pieces for the context, samples many combinations,
// scores them as a whole (colour harmony, warmth, prints, formality coherence) and keeps a diverse top set.
import { STYLES, styleByKey, occasionByKey, PALETTES, TRENDS, subInfo } from './data.js';
import { lch, deltaE, isNeutral, hueDiff, colorName } from './color.js';

export const SLOT_ORDER = ['outer', 'layer', 'top', 'dress', 'bottom', 'shoes', 'bag', 'acc'];
export const SLOT_NAMES = { outer: 'Coat', layer: 'Layer', top: 'Top', dress: 'Dress', bottom: 'Bottom', shoes: 'Shoes', bag: 'Bag', acc: 'Accessory' };
export const slotLabel = (k, it) => (k === 'dress' && it ? ({ suit: 'Suit', jumpsuit: 'Jumpsuit' }[it.sub] || 'Dress') : k === 'acc' && it ? subInfo('acc', it.sub).name.split(' ')[0] : SLOT_NAMES[k]);

export function currentSeason(d = new Date()) {
  const m = d.getMonth();
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
}

// total warmth a combination should reach for a temperature (°C)
export function warmthNeed(t) {
  const pts = [[-5, 13], [0, 12], [5, 10], [10, 8], [14, 6], [18, 4], [22, 3], [26, 2], [32, 1.5]];
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, w1] = pts[i - 1], [t2, w2] = pts[i];
    if (t <= t2) return w1 + ((t - t1) / (t2 - t1)) * (w2 - w1);
  }
  return 1.5;
}

const mainHex = (it) => it.colors?.[0]?.hex || '#808080';
const daysSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);
const isWhiteish = (hex) => { const c = lch(hex); return c.L > 88 && c.C < 12; };
const NEAR_FACE = new Set(['top', 'layer', 'dress', 'outer']);

export function makeContext({ settings, occasion, styleKey, temp, rain, date = new Date() }) {
  const occ = occasionByKey(occasion);
  const style = styleByKey(styleKey || settings.styles?.[0]);
  const pal = PALETTES[settings.palette] || PALETTES.trend;
  return {
    occ, style, temp: Number(temp), rain: !!rain, pal, settings,
    season: currentSeason(date),
    paletteHexes: [...pal.neutrals, ...pal.accents],
    trendW: [0.3, 0.6, 1][settings.trendiness ?? 1],
    bold: settings.boldness ?? 1,
  };
}

function wearOK(item, ctx) {
  const w = ctx.settings.wear;
  if (w === 'all') return true;
  const s = subInfo(item.cat, item.sub);
  return !s.wear || s.wear === w || item.manual; // user-added pieces are always allowed
}

// ---------- single piece fit ----------
export function pieceFit(item, ctx) {
  const r = [];
  let s = 0;
  const [lo, hi] = ctx.occ.range;
  const f = Number(item.formality ?? subInfo(item.cat, item.sub).f);
  const fWeight = item.cat === 'shoes' ? 1.3 : item.cat === 'acc' ? 0.5 : 1;
  if (f < lo) {
    let p = (lo - f) * 2.6 * fWeight;
    if (item.sub === 'sneakers' && lo <= 3.2) p *= 0.4; // clean sneakers are accepted smart-casual now
    s -= p;
  } else if (f > hi) s -= (f - hi) * 1.8 * fWeight;
  else s += 0.6;

  if (item.seasons?.length && !item.seasons.includes(ctx.season)) s -= 1.2;
  const sub = subInfo(item.cat, item.sub);
  if (ctx.rain) {
    if (item.cat === 'shoes' && (item.material === 'suede' || ['ballet', 'sandals', 'mules'].includes(item.sub))) s -= 2;
    if (item.cat === 'outer' && sub.rain) s += 1.2;
  }
  if (ctx.temp < 5 && item.cat === 'shoes' && ['sandals', 'ballet', 'mules'].includes(item.sub)) s -= 2.5;
  if (ctx.temp < 3 && item.cat === 'shoes' && !['ankleboots', 'chelsea', 'kneeboots', 'hiking'].includes(item.sub)) s -= 1.2;
  if (ctx.temp > 22 && Number(item.warmth) >= 3 && item.cat !== 'shoes') s -= 3;
  if (ctx.rain && item.sub === 'sneakers' && lch(mainHex(item)).L > 85) s -= 1.5;
  if (item.sub === 'running' && !ctx.occ.sport && ctx.style.key !== 'sporty') s -= 2.5;
  if (ctx.occ.sport && item.cat === 'bag' && item.sub !== 'backpack') s -= 3;
  if (item.sub === 'suit' && ctx.occ.range[1] >= 4.5) s += 2;
  if (ctx.temp > 22 && item.cat === 'shoes' && ['hiking', 'kneeboots'].includes(item.sub)) s -= 1.5;

  // style
  const st = ctx.style;
  if (item.styles?.includes(st.key)) s += 1.2;
  if (st.subs.includes(item.sub)) s += 0.8;
  if (item.material && st.materials.includes(item.material)) s += 0.4;
  if (item.pattern && item.pattern !== 'solid') s += st.patterns.includes(item.pattern) ? 0.4 : st.key === 'minimal' ? -1.2 : -0.2;

  if (ctx.occ.sport && f > 1.6 && item.cat !== 'bag' && item.cat !== 'outer') s -= 4;
  if (sub.eve && !ctx.occ.evening) s -= ['office', 'meeting'].includes(ctx.occ.key) ? 4 : 3; // evening pieces by day
  if (sub.eve && ctx.occ.evening) s += 0.6;
  if (ctx.occ.comfort && ['heels', 'kneeboots'].includes(item.sub)) s -= 1.5;
  if (ctx.occ.noWhite && NEAR_FACE.has(item.cat) && isWhiteish(mainHex(item)) && (item.colors?.[0]?.share ?? 1) > 0.5) s -= 8;

  // trend (AW26)
  const hex = mainHex(item);
  let tr = 0;
  const tc = TRENDS.colors.find((c) => deltaE(c.hex, hex) < 8);
  if (tc) tr += 1;
  if (item.material && TRENDS.materials.includes(item.material)) tr += 0.6;
  if (TRENDS.patterns.includes(item.pattern)) tr += 0.5;
  if (TRENDS.subs.includes(item.sub)) tr += 0.3;
  s += tr * ctx.trendW;

  // palette (matters most near the face)
  if (NEAR_FACE.has(item.cat) || item.sub === 'scarf') {
    const dmin = Math.min(...ctx.paletteHexes.map((p) => deltaE(p, hex)));
    if (dmin < 12) s += 0.9; else if (dmin > 28) s -= 0.3;
    if (ctx.pal.avoid.some((a) => deltaE(a, hex) < 9)) s -= 0.9;
  }

  // rotation
  const ds = daysSince(item.lastWorn);
  if (ds < 2) s -= 2.5; else if (ds < 5) s -= 1.2;
  if (item.fav) s += 0.5;
  if (!item.wornCount) s += 0.25;
  return s;
}

// ---------- whole outfit ----------
export function outfitItems(o) {
  return SLOT_ORDER.map((k) => o.slots[k]).filter(Boolean);
}

export function scoreOutfit(o, ctx) {
  const items = outfitItems(o);
  const reasons = [];
  let s = 0;
  const CORE = new Set(['top', 'bottom', 'dress', 'shoes']);
  for (const it of items) {
    const f = o.fit?.[it.id] ?? pieceFit(it, ctx);
    // optional pieces must earn their place: their upside counts less than their downside
    s += CORE.has(it.cat) ? f : f > 0 ? f * 0.35 : f;
  }

  // warmth
  const body = items.filter((i) => i.cat !== 'bag' && i.cat !== 'acc');
  let warm = body.reduce((a, i) => a + Number(i.warmth ?? 1) * (i.cat === 'shoes' ? 0.5 : 1), 0)
    + (o.slots.acc?.sub === 'scarf' ? 1 : 0);
  // dresses and skirts below 15°C assume opaque tights (AW26 made hosiery a feature, not an afterthought)
  const legsOut = o.slots.dress || ['miniskirt', 'midiskirt', 'maxiskirt'].includes(o.slots.bottom?.sub);
  const tights = legsOut && ctx.temp < 15;
  if (tights) warm += ctx.temp < 5 ? 2.5 : 1.5;
  const need = warmthNeed(ctx.temp);
  const diff = warm - need;
  s -= diff < 0 ? -diff * 1.1 : diff * (ctx.temp > 20 ? 1.4 : 0.6);
  if (Math.abs(diff) < 1.5) reasons.push({ w: 0.8, t: `Warm enough for ${Math.round(ctx.temp)}°C without overheating` });
  if (ctx.rain && o.slots.outer && subInfo('outer', o.slots.outer.sub).rain) reasons.push({ w: 0.9, t: 'Rain-ready coat' });

  // formality coherence (some high-low mixing is good, a ballgown with trainers is not)
  const fs = items.filter((i) => i.cat !== 'acc').map((i) => Number(i.formality));
  const spread = Math.max(...fs) - Math.min(...fs);
  if (spread > 2) s -= (spread - 2) * 1.6;
  else if (spread >= 1 && spread <= 2 && ctx.style.key !== 'minimal') { s += 0.3; }

  // colour harmony on visible clothing
  const vis = items.filter((i) => i.cat !== 'acc' || i.sub === 'scarf');
  const hexes = vis.map(mainHex);
  const chroma = [];
  for (const h of hexes) if (!isNeutral(h)) { const c = lch(h); if (!chroma.some((x) => hueDiff(x.h, c.h) < 32)) chroma.push(c); }
  const st = ctx.style, bold = ctx.bold;
  // tonal = every main piece in one saturated colour family (bag and accessories don't count)
  const mainHues = items.filter((i) => NEAR_FACE.has(i.cat) || i.cat === 'bottom').map((i) => lch(mainHex(i)));
  const tonal = mainHues.length >= 2 && mainHues.every((c) => c.C > 15 && hueDiff(c.h, mainHues[0].h) < 28)
    && Math.max(...mainHues.map((c) => c.L)) - Math.min(...mainHues.map((c) => c.L)) > 10;
  const allDark = hexes.every((h) => lch(h).L < 26);

  if (tonal) { const top = items.filter((i) => NEAR_FACE.has(i.cat) || i.cat === 'bottom').map(mainHex).sort((a, b) => lch(b).C - lch(a).C)[0]; s += st.color === 'tonal' ? 2.6 : 1.6; reasons.push({ w: 1.6, t: `Tonal ${colorName(top)} head to toe, a key AW26 move` }); }
  else if (allDark && hexes.length >= 3) { s += st.color === 'mono' ? 2.4 : st.key === 'minimal' ? 1.4 : 0.6; reasons.push({ w: 1.1, t: 'Dark monochrome: sharp and easy' }); }
  else if (chroma.length === 0) { s += st.color === 'tonal' || st.key === 'minimal' ? 2 : 1; reasons.push({ w: 0.7, t: 'All neutrals: let texture do the work' }); }
  else if (chroma.length === 1) { s += st.color === 'accent' ? 2.4 : 1.8; reasons.push({ w: 1.3, t: `One ${colorName(hexes.find((h) => !isNeutral(h)))} accent on neutrals` }); }
  else if (chroma.length === 2) {
    const d = hueDiff(chroma[0].h, chroma[1].h);
    if (d <= 60) { s += st.color === 'analogous' ? 2 : 1.2; reasons.push({ w: 1, t: 'Neighbouring colours that blend softly' }); }
    else if (d >= 140) { s += st.color === 'block' ? 2.6 : bold >= 1 ? 1 : -0.6; reasons.push({ w: bold >= 1 ? 1.2 : 0.3, t: 'Complementary colour contrast' }); }
    else { s += st.color === 'block' || bold === 2 ? 1.6 : -0.8; if (st.color === 'block' || bold === 2) reasons.push({ w: 1.1, t: 'Colour blocking' }); }
  } else { s += st.color === 'block' && bold >= 1 ? 0.6 : -2.6 + bold * 0.6; }

  // prints
  const prints = vis.filter((i) => i.pattern && i.pattern !== 'solid');
  if (prints.length === 1) { s += 0.8; reasons.push({ w: 0.6, t: `One ${prints[0].pattern === 'check' ? 'check' : prints[0].pattern} print as the focal point` }); }
  else if (prints.length === 2) {
    const kinds = new Set(prints.map((p) => p.pattern));
    const classicMix = kinds.size === 2 && ['chic', 'classic', 'boho'].includes(st.key) && (kinds.has('stripe') || kinds.has('check') || kinds.has('floral'));
    if (classicMix) { s += 0.4; reasons.push({ w: 0.8, t: `${[...kinds].join(' with ')}: a confident print mix` }); }
    else s += st.color === 'block' || bold === 2 ? 0.6 : -1.8;
  }
  else if (prints.length > 2) s -= 3.5;

  // textures (AW26 texture mixing)
  const mats = new Set(items.map((i) => i.material).filter((m) => m && TRENDS.materials.includes(m)));
  if (mats.size >= 2) { s += 0.8 * ctx.trendW; reasons.push({ w: 0.9 * ctx.trendW, t: `Texture mix: ${[...mats].join(' with ')}` }); }

  // palette & signature
  const face = items.filter((i) => NEAR_FACE.has(i.cat)).map(mainHex);
  if (face.length && face.every((h) => ctx.paletteHexes.some((p) => deltaE(p, h) < 14)))
    reasons.push({ w: 1, t: `Colours from your ${ctx.pal.name} palette near the face` });
  const sig = ctx.settings.signature || [];
  if (sig.length && hexes.some((h) => sig.some((g) => deltaE(g, h) < 12))) { s += 0.5; }

  // trend colour mention
  const trendHit = TRENDS.colors.find((c) => hexes.some((h) => !isNeutral(h) && deltaE(c.hex, h) < 8));
  if (trendHit) reasons.push({ w: 0.9 * ctx.trendW + 0.2, t: `${trendHit.name} is one of the AW26 runway colours` });

  // style mention
  const styleHits = items.filter((i) => ctx.style.subs.includes(i.sub) || i.styles?.includes(ctx.style.key)).length;
  if (styleHits >= 2) reasons.push({ w: 0.8, t: `${ctx.style.name} pieces: ${items.filter((i) => ctx.style.subs.includes(i.sub)).slice(0, 2).map((i) => subInfo(i.cat, i.sub).name.toLowerCase()).join(', ') || 'your tagged favourites'}` });

  const unworn = items.find((i) => !i.wornCount && i.cat !== 'acc');
  if (unworn) reasons.push({ w: 0.4, t: `Gets your unworn ${subInfo(unworn.cat, unworn.sub).name.toLowerCase()} out of the closet` });

  if (tights) reasons.push({ w: 0.75, t: ctx.temp < 5 ? 'Add thick opaque tights, ideally in a colour from the look' : 'Add opaque tights; coloured ones are very AW26' });
  const sh = o.slots.shoes, bg = o.slots.bag, bt = o.slots.bottom;
  const legsBare = o.slots.dress || ['miniskirt', 'midiskirt', 'maxiskirt'].includes(bt?.sub);
  if (sh?.sub === 'kneeboots' && !legsBare) s -= 3;
  if (sh?.sub === 'kneeboots' && legsBare) { s += 0.6; reasons.push({ w: 0.7, t: 'Tall boots with a skirt or dress, as on the AW26 runways' }); }
  const leather = (it) => { const c = lch(mainHex(it)); if (c.L < 20 && c.C < 12) return 'black'; if (c.h >= 25 && c.h <= 85 && c.L < 65 && c.C < 45) return 'brown'; return isNeutral(mainHex(it)) ? 'neutral' : 'accent'; };
  if (sh && bg) {
    const a = leather(sh), b = leather(bg);
    if (a === b || b === 'accent') s += 0.8;
    else if ((a === 'black' && b === 'brown') || (a === 'brown' && b === 'black')) s -= 0.5;
  }
  if (sh && bt && leather(sh) === 'black' && ctx.occ.range[1] >= 4) {
    const bc = lch(mainHex(bt));
    if (bc.h >= 40 && bc.h <= 90 && bc.L > 45 && bc.C < 45) s -= 1; // black shoes under camel or beige tailoring
  }
  const mains = items.filter((i) => NEAR_FACE.has(i.cat) || i.cat === 'bottom').map((i) => lch(mainHex(i)));
  if (bold < 2 && mains.some((c) => c.L < 32 && c.C > 12 && c.h > 250 && c.h < 300) && mains.some((c) => c.L < 16)) s -= 0.6;
  if (o.slots.dress && subInfo('dress', o.slots.dress.sub).eve && !ctx.occ.evening && o.slots.layer?.sub === 'blazer') s += 2.5;
  // missing essentials
  if (!o.slots.shoes) s -= 1;
  reasons.sort((a, b) => b.w - a.w);
  return { score: s, reasons: reasons.slice(0, 3).map((r) => r.t), warmth: warm, need };
}

// ---------- sampling ----------
function weightedPick(list, temp = 1.2) {
  if (!list.length) return null;
  const max = Math.max(...list.map((x) => x.fit));
  const ws = list.map((x) => Math.exp((x.fit - max) / temp));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i].item; }
  return list[list.length - 1].item;
}

export function generate(allItems, ctx, { count = 6, pin = null, samples = 1400 } = {}) {
  const items = allItems.filter((i) => !i.archived && !i.away && wearOK(i, ctx));
  const fit = {};
  const by = {};
  for (const it of items) {
    fit[it.id] = pieceFit(it, ctx);
    (by[it.cat] ||= []).push({ item: it, fit: fit[it.id] });
  }
  const has = (c) => (by[c] || []).length > 0;
  if (!(has('dress') || (has('top') && has('bottom')))) return { outfits: [], missing: missingFor(by) };

  const needOuter = ctx.temp < 15 || (ctx.rain && ctx.temp < 21);
  const results = new Map();
  for (let n = 0; n < samples; n++) {
    const slots = {};
    let pinCat = pin?.cat;
    const dressPossible = has('dress') && !(pinCat === 'top' || pinCat === 'bottom') && !ctx.occ.sport;
    const useDress = pinCat === 'dress' || (dressPossible && Math.random() < (has('top') && has('bottom') ? 0.32 : 1));
    if (useDress) {
      slots.dress = pinCat === 'dress' ? pin : weightedPick(by.dress);
      if (slots.dress?.sub === 'suit' && has('top')) {
        const under = by.top.filter((x) => ['shirt', 'tshirt', 'knit', 'turtleneck', 'blouse', 'polo'].includes(x.item.sub));
        slots.top = weightedPick(under.length ? under : by.top);
      }
    } else {
      slots.top = pinCat === 'top' ? pin : weightedPick(by.top);
      slots.bottom = pinCat === 'bottom' ? pin : weightedPick(by.bottom);
    }
    // layer
    if (pinCat === 'layer') slots.layer = pin;
    else if (has('layer')) {
      const topWarm = Number(slots.top?.warmth ?? 0);
      const wantsLayer = (ctx.temp < 17 && Math.random() < 0.55) || (ctx.occ.range[1] >= 4 && Math.random() < 0.45) || Math.random() < 0.15;
      if (wantsLayer && !(slots.dress?.sub === 'suit')) {
        let pool = by.layer;
        if (topWarm >= 3) pool = pool.filter((x) => ['blazer', 'overshirt'].includes(x.item.sub));
        if (slots.top?.sub === 'hoodie') pool = pool.filter((x) => x.item.sub !== 'hoodie');
        if (pool.length) slots.layer = weightedPick(pool);
      }
    }
    // outer
    if (pinCat === 'outer') slots.outer = pin;
    else if (has('outer') && (needOuter || (ctx.temp < 19 && Math.random() < 0.3))) slots.outer = weightedPick(by.outer);
    // shoes, bag, acc
    slots.shoes = pinCat === 'shoes' ? pin : weightedPick(by.shoes || []);
    if (pinCat === 'bag') slots.bag = pin; else if (has('bag') && Math.random() < 0.75) slots.bag = weightedPick(by.bag);
    if (pinCat === 'acc') slots.acc = pin;
    else if (has('acc')) {
      let pool = by.acc.filter((x) => {
        const k = x.item.sub;
        if (k === 'scarf' || k === 'gloves') return ctx.temp < 10;
        if (k === 'hat') return ctx.temp < 8 || ctx.occ.outdoor;
        if (k === 'tie') return ctx.occ.range[1] >= 4 && slots.top && ['shirt'].includes(slots.top.sub);
        return true;
      });
      const tie = pool.find((x) => x.item.sub === 'tie');
      if (tie && Math.random() < 0.8) slots.acc = weightedPick(pool.filter((x) => x.item.sub === 'tie'));
      else if (pool.length && Math.random() < 0.55) slots.acc = weightedPick(pool.filter((x) => x.item.sub !== 'tie' || ctx.occ.range[1] >= 4));
    }
    const key = SLOT_ORDER.map((k) => slots[k]?.id || '-').join('|');
    if (results.has(key)) continue;
    const o = { slots, fit };
    const sc = scoreOutfit(o, ctx);
    results.set(key, { ...o, ...sc, key });
  }

  // diverse top-N
  const all = [...results.values()].sort((a, b) => b.score - a.score);
  const best = all[0]?.score ?? 0;
  const sorted = all.filter((o) => o.score >= Math.max(best - 8, -2));
  const chosen = [];
  const uses = {};
  for (const o of sorted) {
    if (chosen.length >= count) break;
    const ids = outfitItems(o).filter((i) => i.cat !== 'bag' && i.cat !== 'acc').map((i) => i.id);
    if (ids.some((id) => (uses[id] || 0) >= 2 && id !== pin?.id)) continue;
    const extrasIds = outfitItems(o).filter((i) => i.cat === 'bag' || i.cat === 'acc').map((i) => i.id);
    if (extrasIds.some((id) => (uses[id] || 0) >= 3)) continue;
    const tooClose = chosen.some((c) => {
      const cids = new Set(outfitItems(c).filter((i) => i.cat !== 'bag' && i.cat !== 'acc').map((i) => i.id));
      const shared = ids.filter((id) => cids.has(id) && id !== pin?.id).length;
      return shared / Math.max(ids.length, cids.size) > 0.5;
    });
    if (tooClose) continue;
    [...ids, ...extrasIds].forEach((id) => (uses[id] = (uses[id] || 0) + 1));
    chosen.push(o);
  }
  return { outfits: chosen, missing: missingFor(by), thin: chosen.length < count && all.length > chosen.length };
}

function missingFor(by) {
  const m = [];
  if (!(by.top || []).length && !(by.dress || []).length) m.push('tops');
  if (!(by.bottom || []).length && !(by.dress || []).length) m.push('bottoms');
  if (!(by.shoes || []).length) m.push('shoes');
  return m;
}

// alternatives for one slot, ranked by full-outfit score
export function alternatives(outfit, slot, allItems, ctx, limit = 12) {
  const cur = outfit.slots[slot];
  const pool = allItems.filter((i) => i.cat === slot && !i.archived && !i.away && i.id !== cur?.id && wearOK(i, ctx));
  return pool.map((it) => {
    const o = { slots: { ...outfit.slots, [slot]: it }, fit: outfit.fit };
    return { item: it, ...scoreOutfit(o, ctx) };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function rescore(outfit, ctx) {
  return { ...outfit, ...scoreOutfit(outfit, ctx), key: SLOT_ORDER.map((k) => outfit.slots[k]?.id || '-').join('|') };
}

// ---------- wardrobe insights ----------
export function wardrobeGaps(items, settings) {
  const live = items.filter((i) => !i.archived);
  const gaps = [];
  const c = (fn) => live.filter(fn).length;
  if (live.length < 8) return gaps;
  if (!c((i) => i.cat === 'shoes' && i.formality >= 4)) gaps.push('No dressy shoes yet. Meetings, weddings and dinners will struggle.');
  if (!c((i) => i.cat === 'outer' && i.warmth >= 4)) gaps.push('No really warm coat. Winter outfits will fall short.');
  if (!c((i) => i.cat === 'outer' && subInfo('outer', i.sub).rain)) gaps.push('Nothing rain-proof for wet days.');
  if (!c((i) => (i.cat === 'bottom' || i.cat === 'dress') && i.formality >= 4)) gaps.push('No tailored trousers, skirt or dress for formal occasions.');
  const neutralBottoms = c((i) => i.cat === 'bottom' && isNeutral(i.colors?.[0]?.hex || '#808080'));
  if (c((i) => i.cat === 'bottom') >= 3 && neutralBottoms < 2) gaps.push('Few neutral bottoms. They multiply how many tops you can wear.');
  const pal = PALETTES[settings.palette] || PALETTES.trend;
  const ph = [...pal.neutrals, ...pal.accents];
  const off = live.filter((i) => NEAR_FACE.has(i.cat) && !ph.some((p) => deltaE(p, i.colors?.[0]?.hex || '#808080') < 16));
  if (off.length >= 3) gaps.push(`${off.length} tops or layers sit outside your palette. Wear them with a scarf or collar in your colours nearer the face.`);
  return gaps;
}

export function paletteMatch(items, settings) {
  const pal = PALETTES[settings.palette] || PALETTES.trend;
  const ph = [...pal.neutrals, ...pal.accents];
  const live = items.filter((i) => !i.archived && i.colors?.length);
  if (!live.length) return null;
  const inPal = live.filter((i) => ph.some((p) => deltaE(p, i.colors[0].hex) < 16)).length;
  return Math.round((inPal / live.length) * 100);
}
