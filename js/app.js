import { db, loadSettings, saveSettings, clearSettings, uid, storageEstimate, requestPersist } from './db.js';
import { CATEGORIES, SUBS, subInfo, PATTERNS, MATERIALS, SEASONS, FORMALITY_LABELS, WARMTH_LABELS, STYLES, styleByKey, OCCASIONS, occasionByKey, PALETTES, seasonFromQuiz, TRENDS } from './data.js';
import { extractColors, colorName, lch, isNeutral, deltaE } from './color.js';
import { makeContext, generate, alternatives, rescore, outfitItems, SLOT_ORDER, SLOT_NAMES, slotLabel, wardrobeGaps, paletteMatch } from './engine.js';
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
import { sampleItems, garmentSVG, svgBlob } from './samples.js';
import { AI_PROVIDERS, generateLookImage, buildPrompt } from './ai.js';

// ---------------- state ----------------
const S = {
  settings: loadSettings(),
  items: [],
  looks: [],
  tab: 'style',
  cat: 'all',
  looksView: 'saved',
  occasion: null,
  styleKey: null,
  temp: null,
  rain: false,
  pin: null,
  results: [],
  missing: [],
  queue: [],          // ids of new pieces still to describe
  ob: null,           // onboarding state
  me: null,           // user photo blob for AI try-on
};
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urls = new Map();
function urlFor(item) {
  if (!item?.img) return '';
  const k = item.id + ':' + (item.imgVer || 0);
  if (!urls.has(k)) urls.set(k, URL.createObjectURL(item.img));
  return urls.get(k);
}
const save = () => saveSettings(S.settings);
const itemById = (id) => S.items.find((i) => i.id === id);
const live = () => S.items.filter((i) => !i.archived);

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}

// ---------------- boot ----------------
async function boot() {
  S.items = (await db.all('items')).sort((a, b) => b.created - a.created);
  S.looks = (await db.all('looks')).sort((a, b) => b.created - a.created);
  S.me = await db.getMeta('me').catch(() => null);
  S.queue = S.items.filter((i) => i.needsTags).map((i) => i.id);
  S.temp = S.settings.lastTemp ?? 10;
  S.occasion = defaultOccasion();
  S.styleKey = S.settings.styles[0];
  if (!S.settings.onboarded) { S.ob = { step: 0, a: { wear: S.settings.wear, styles: [], lifestyle: 'mixed', boldness: 1, trendiness: 1, undertone: null, depth: null, contrast: null, chroma: null } }; renderOnboarding(); }
  if (!S.items.length) S.tab = 'wardrobe';
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
function defaultOccasion() {
  const d = new Date().getDay();
  const weekend = d === 0 || d === 6;
  if (weekend) return 'weekend';
  return { office: 'office', mixed: 'office', casual: 'weekend', creative: 'brunch' }[S.settings.lifestyle] || 'office';
}

// ---------------- rendering ----------------
function render() {
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === S.tab ? 'page' : 'false'));
  const el = $('#screen');
  const d = new Date();
  const meta = { style: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), wardrobe: `${live().length} pieces`, looks: '', profile: '' }[S.tab];
  el.innerHTML = `<header class="top"><span class="wordmark">Atelier</span><span class="small">${esc(meta)}</span></header>` + { style: viewStyle, wardrobe: viewWardrobe, looks: viewLooks, profile: viewProfile }[S.tab]();
}

function swatch(hex, style = '') {
  if (lch(hex).L > 86) return `<div class="lw" style="${style}"><div class="swatch" style="--c:${hex}"></div></div>`;
  return `<div class="swatch" style="--c:${hex};${style}"></div>`;
}

// ---------- Style me ----------
function viewStyle() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const n = live().length;
  const myStyles = S.settings.styles;
  const others = STYLES.filter((s) => !myStyles.includes(s.key));
  const pin = S.pin && itemById(S.pin);
  return `
  <h1>What are you dressing for?</h1>
  ${n < 4 ? `<div class="notice">Add at least a few tops, bottoms and shoes to your wardrobe first. Or <button class="linkish" data-act="load-samples">try the sample wardrobe</button>.</div>` : ''}
  <span class="label">Occasion</span>
  <div class="chips">${OCCASIONS.map((o) => `<button class="chip" data-act="occ" data-k="${o.key}" aria-pressed="${S.occasion === o.key}">${esc(o.name)}</button>`).join('')}</div>
  <span class="label">Weather</span>
  <div class="weather">
    <div class="temp" role="group" aria-label="Temperature">
      <button data-act="temp" data-d="-1" aria-label="Colder">−</button>
      <output>${Math.round(S.temp)}°C</output>
      <button data-act="temp" data-d="1" aria-label="Warmer">+</button>
    </div>
    <button class="chip" data-act="rain" aria-pressed="${S.rain}">Rain</button>
    <button class="chip" data-act="forecast">Use today’s forecast</button>
  </div>
  <span class="label">Style</span>
  <div class="chips scroll">
    ${myStyles.map((k) => `<button class="chip" data-act="style" data-k="${k}" aria-pressed="${S.styleKey === k}">${esc(styleByKey(k).name)}</button>`).join('')}
    ${others.map((s) => `<button class="chip" data-act="style" data-k="${s.key}" aria-pressed="${S.styleKey === s.key}">${esc(s.name)}</button>`).join('')}
  </div>
  ${pin ? `<div class="pin"><img src="${urlFor(pin)}" alt=""><div class="grow">Every look is built around this ${esc(subInfo(pin.cat, pin.sub).name.toLowerCase())}.</div><button class="iconbtn" data-act="unpin" aria-label="Stop building around this piece"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>` : ''}
  <button class="btn primary block cta" data-act="go" ${n < 2 ? 'disabled' : ''}>${S.results.length ? 'Show new outfits' : 'Create outfits'}</button>
  ${S.missing.length && n >= 2 ? `<div class="notice">Outfits will be incomplete until you add ${S.missing.join(' and ')}.</div>` : ''}
  ${S.results.length ? `
    <div class="results-head"><h2>${esc(occasionByKey(S.occasion).name)}</h2><span class="small">${S.results.length} looks</span></div>
    <p class="small" style="margin:6px 0 0">${S.thin ? `Only ${S.results.length} strong ${S.results.length === 1 ? 'look' : 'looks'} with what you own for this. ` : ''}Swipe through. Tap a piece to swap it.</p>
    <div class="looks">${S.results.map((o, i) => lookCard(o, i)).join('')}</div>` : S.ran ? `<div class="notice">No complete outfit found for this. Add more pieces in the right formality, or try another style.</div>` : ''}
  `;
}

function lookName(o) {
  const items = outfitItems(o).filter((i) => i.cat !== 'acc' && i.cat !== 'bag');
  const weight = { outer: 3, dress: 3, top: 2, layer: 2, bottom: 2, shoes: 1 };
  const byColor = [];
  for (const it of items) {
    const h = it.colors?.[0]?.hex || '#808080';
    const name = colorName(h);
    const f = byColor.find((x) => x.name === name);
    if (f) f.w += weight[it.cat] || 1; else byColor.push({ name, w: weight[it.cat] || 1, chroma: !isNeutral(h) });
  }
  byColor.sort((a, b) => (b.chroma - a.chroma) || (b.w - a.w));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  if (byColor.length === 1) return `All ${byColor[0].name}`;
  return `${cap(byColor[0].name)} with ${byColor[1].name}`;
}

function outfitStrip(o) {
  const items = outfitItems(o).filter((i) => i.cat !== 'acc' || i.sub === 'scarf');
  const w = { outer: 3, dress: 4, top: 3, layer: 2, bottom: 3, shoes: 1, bag: 1, acc: 1 };
  return `<div class="strip" aria-hidden="true">${items.map((i) => swatch(i.colors?.[0]?.hex || '#888', `--share:${w[i.cat]}`)).join('')}</div>`;
}

function boardHTML(o, idx, interactive = true) {
  const sl = o.slots;
  const main = ['outer', 'dress', 'top', 'layer', 'bottom', 'shoes'].filter((k) => sl[k]);
  let left = main[0];
  if (left === 'outer' && main.length <= 2) left = main[0];
  const right = main.filter((k) => k !== left);
  const btn = (k, small = false) => {
    const it = sl[k];
    const attrs = interactive ? `data-act="swap" data-i="${idx}" data-slot="${k}"` : 'tabindex="-1"';
    return `<button class="piece" ${attrs} aria-label="${esc(slotLabel(k, it))}: ${esc(colorName(it.colors?.[0]?.hex || '#888'))} ${esc(subInfo(it.cat, it.sub).name)}${interactive ? '. Tap to swap' : ''}"><img src="${urlFor(it)}" alt="" loading="lazy">${small ? '' : `<span class="tag">${esc(slotLabel(k, it))}</span>`}</button>`;
  };
  const extras = ['bag', 'acc'].filter((k) => sl[k]);
  const rows = right.map((k) => (k === 'shoes' ? '0.75fr' : '1fr')).join(' ');
  return `<div class="board">
    <div class="col left">${left ? btn(left) : ''}${extras.length ? `<div class="extras">${extras.map((k) => btn(k, true)).join('')}</div>` : ''}</div>
    <div class="col" style="grid-template-rows:${rows || '1fr'}">${right.map((k) => btn(k)).join('')}</div>
  </div>`;
}

function lookCard(o, i) {
  const owned = (c) => live().some((it) => it.cat === c);
  const addable = ['layer', 'outer', 'bag', 'acc'].filter((k) => !o.slots[k] && owned(k));
  return `<article class="look" aria-label="Look ${i + 1}">
    ${boardHTML(o, i)}
    <div class="look-body">
    <div class="look-top"><h3 class="look-name">${esc(lookName(o))}</h3><span class="count">${String(i + 1).padStart(2, '0')} / ${String(S.results.length).padStart(2, '0')}</span></div>
    ${outfitStrip(o)}
    <ul class="reasons">${o.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${addable.length ? `<div class="adds">${addable.map((k) => `<button class="chip" data-act="swap" data-i="${i}" data-slot="${k}">Add ${esc(SLOT_NAMES[k].toLowerCase())}</button>`).join('')}</div>` : ''}
    <div class="look-actions">
      <button class="btn primary" data-act="wear" data-i="${i}">Wear today</button>
      <button class="btn" data-act="save-look" data-i="${i}">Save</button>
      <button class="btn quiet wide" data-act="ai" data-i="${i}">Picture it with AI</button>
    </div>
    </div>
  </article>`;
}

// ---------- Wardrobe ----------
function viewWardrobe() {
  const items = live();
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, items.filter((i) => i.cat === c.key).length]));
  const gone = S.items.filter((i) => i.archived);
  const away = items.filter((i) => i.away);
  const list = S.cat === 'gone' ? gone : S.cat === 'away' ? away : S.cat === 'all' ? items : items.filter((i) => i.cat === S.cat);
  const hasSamples = items.some((i) => i.sample);
  if (!items.length) return `
    <h1>Wardrobe</h1>
    <div class="empty">
      <div class="art" aria-hidden="true">${['#4A2E22', '#6D1F2F', '#F0EEE9', '#1F4D3A'].map((c) => swatch(c)).join('')}</div>
      <h2 style="margin-top:0">Start with what you own</h2>
      <p class="lede">Photograph each piece flat or on a hanger, against a plain wall or floor. Atelier reads the colours; you tell it what the piece is in a few taps.</p>
      <div class="stack">
        <button class="btn primary block" data-act="pick" data-in="in-camera">Take a photo</button>
        <button class="btn block" data-act="pick" data-in="in-photos">Choose photos</button>
        <button class="btn quiet block" data-act="add">More ways to add, including a folder</button>
      </div>
      <p class="small" style="margin-top:22px">Want to see how it works first? <button class="linkish" data-act="load-samples">Load a sample wardrobe</button>. You can remove it any time.</p>
    </div>`;
  return `
  <div class="head"><h1>Wardrobe</h1>
    <button class="btn primary sm" data-act="add">Add clothes</button></div>
  ${S.queue.length ? `<div class="banner"><span>${S.queue.length} new ${S.queue.length === 1 ? 'piece needs' : 'pieces need'} describing</span><button class="btn sm" data-act="tag-next">Describe</button></div>` : ''}
  <div class="chips scroll" style="margin-top:16px">
    <button class="chip" data-act="cat" data-k="all" aria-pressed="${S.cat === 'all'}">All <span class="n">${items.length}</span></button>
    ${CATEGORIES.filter((c) => counts[c.key]).map((c) => `<button class="chip" data-act="cat" data-k="${c.key}" aria-pressed="${S.cat === c.key}">${esc(c.name)} <span class="n">${counts[c.key]}</span></button>`).join('')}
    ${away.length ? `<button class="chip" data-act="cat" data-k="away" aria-pressed="${S.cat === 'away'}">Away <span class="n">${away.length}</span></button>` : ''}
    ${gone.length ? `<button class="chip" data-act="cat" data-k="gone" aria-pressed="${S.cat === 'gone'}">No longer owned <span class="n">${gone.length}</span></button>` : ''}
  </div>
  ${away.length ? `<div class="notice row" style="justify-content:space-between"><span>${away.length} piece${away.length > 1 ? 's are' : ' is'} in the laundry or away</span><button class="btn sm" data-act="back-all">All back</button></div>` : ''}
  <div class="grid">${list.map((it) => `
    <button class="tile" data-act="edit" data-id="${it.id}" aria-label="${esc(it.name || colorName(it.colors?.[0]?.hex || '#888') + ' ' + subInfo(it.cat, it.sub).name)}">
      <img src="${urlFor(it)}" alt="" loading="lazy">
      <span class="dots">${(it.colors || []).slice(0, 3).map((c) => `<i style="background:${c.hex}"></i>`).join('')}</span>
      ${it.fav ? '<span class="fav" aria-hidden="true"></span>' : ''}
      ${it.needsTags ? '<span class="todo">Describe</span>' : it.away ? '<span class="todo">Away</span>' : it.archived ? '<span class="todo">No longer owned</span>' : ''}
    </button>`).join('')}
  </div>
  ${hasSamples ? `<p class="small" style="margin-top:18px">Sample pieces are illustrations. <button class="linkish" data-act="clear-samples">Remove samples</button></p>` : ''}`;
}

// ---------- Looks ----------
function viewLooks() {
  const saved = S.looks.filter((l) => l.saved);
  const worn = S.looks.filter((l) => l.wornOn).sort((a, b) => (b.wornOn > a.wornOn ? 1 : -1));
  const list = S.looksView === 'saved' ? saved : worn;
  return `
  <h1>Looks</h1>
  <div class="seg" role="group" aria-label="Show">
    <button data-act="looks-view" data-k="saved" aria-pressed="${S.looksView === 'saved'}">Saved ${saved.length}</button>
    <button data-act="looks-view" data-k="worn" aria-pressed="${S.looksView === 'worn'}">Worn ${worn.length}</button>
  </div>
  ${!list.length ? `<p class="lede" style="margin-top:20px">${S.looksView === 'saved' ? 'Looks you save from Style me appear here, ready for the next time you need them.' : 'Tap “Wear today” on a look and it is logged here. Atelier uses this to rotate your clothes.'}</p>` : ''}
  <div>${list.map((l) => savedRow(l)).join('')}</div>`;
}
function savedRow(l) {
  const items = l.itemIds.map(itemById).filter(Boolean);
  const occ = occasionByKey(l.occasion);
  const date = new Date(l.wornOn || l.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const missing = l.itemIds.length - items.length;
  const thumb = l.aiImg
    ? `<div class="mini ai"><img src="${aiUrl(l)}" alt="AI picture of this look" style="height:120px"></div>`
    : `<div class="mini">${items.filter((i) => i.cat !== 'acc' && i.cat !== 'bag').slice(0, 4).map((i) => `<img src="${urlFor(i)}" alt="">`).join('')}</div>`;
  return `<div class="saved">${thumb}
    <div class="meta"><span class="look-name">${esc(l.name)}</span>
      <span class="small">${esc(occ.name)}, ${esc(date)}${missing ? `. ${missing} piece${missing > 1 ? 's' : ''} no longer in your wardrobe` : ''}</span>
      <div class="row">
        <button class="btn sm" data-act="open-look" data-id="${l.id}">Open</button>
        ${S.looksView === 'saved' ? `<button class="btn sm quiet" data-act="wear-saved" data-id="${l.id}">Wear today</button>` : ''}
        <button class="btn sm quiet" data-act="del-look" data-id="${l.id}" aria-label="Delete look">Delete</button>
      </div></div></div>`;
}
const aiUrls = new Map();
function aiUrl(l) { if (!aiUrls.has(l.id)) aiUrls.set(l.id, URL.createObjectURL(l.aiImg)); return aiUrls.get(l.id); }

// ---------- Profile ----------
function viewProfile() {
  const st = S.settings;
  const pal = PALETTES[st.palette] || PALETTES.trend;
  const match = paletteMatch(S.items, st);
  const gaps = wardrobeGaps(S.items, st);
  const ai = st.ai || {};
  const prov = AI_PROVIDERS[ai.provider] || AI_PROVIDERS.gemini;
  const sw = (hex) => `<button class="sw" data-act="sig" data-hex="${hex}" aria-pressed="${st.signature.includes(hex)}" aria-label="${esc(colorName(hex))}${st.signature.includes(hex) ? ', pinned' : ''}">${swatch(hex)}<span>${esc(colorName(hex))}</span></button>`;
  return `
  <h1>Palette &amp; me</h1>
  <h2>Your colours</h2>
  <p class="kicker" style="margin-top:6px">${esc(pal.name)}${pal.metal ? `, best with ${esc(pal.metal.toLowerCase())} jewellery` : ''}</p>
  <p class="lede">${esc(pal.about)}</p>
  <span class="label">Neutrals: the base of most outfits</span>
  <div class="swatchbook">${pal.neutrals.map(sw).join('')}</div>
  <span class="label">Accents: wear these near your face</span>
  <div class="swatchbook">${pal.accents.map(sw).join('')}</div>
  ${pal.avoid.length ? `<span class="label">Keep away from your face</span><div class="swatchbook avoid">${pal.avoid.map((h) => `<div class="sw">${swatch(h)}<span>${esc(colorName(h))}</span></div>`).join('')}</div>` : ''}
  <p class="small" style="margin-top:12px">Tap up to five swatches to pin them as your signature colours. Outfits that use them get a lift.</p>
  <div class="row" style="margin-top:12px">
    <label class="field" style="flex:1;margin:0"><span class="sr">Colour season</span>
      <select data-change="palette">${Object.entries(PALETTES).map(([k, p]) => `<option value="${k}" ${k === st.palette ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <button class="btn sm" data-act="retake-colour">Retake colour quiz</button>
  </div>

  <h2>Your wardrobe</h2>
  <div class="card">
    ${match == null ? '<p class="small" style="margin:0">Add clothes to see how they fit your palette.</p>' : `<div class="row" style="align-items:flex-end"><span class="stat">${match}%</span><span class="small" style="padding-bottom:4px">of your pieces sit inside your palette</span></div>`}
    ${gaps.length ? `<span class="label">Worth adding</span><ul class="gaps">${gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
  </div>

  <h2>Your style</h2>
  <p class="small">The first one is your default. Tap to add or remove, up to three.</p>
  <div class="chips" style="margin-top:10px">${STYLES.map((s) => { const i = st.styles.indexOf(s.key); return `<button class="chip" data-act="my-style" data-k="${s.key}" aria-pressed="${i >= 0}">${i >= 0 ? `<span class="n">${i + 1}</span>` : ''}${esc(s.name)}</button>`; }).join('')}</div>
  <div class="row" style="margin-top:14px">
    <label class="field" style="flex:1;margin:0">Colour and print<select data-change="boldness">${['Keep it quiet', 'A touch', 'Bring it on'].map((t, i) => `<option value="${i}" ${st.boldness === i ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="field" style="flex:1;margin:0">Trends<select data-change="trendiness">${['Timeless first', 'Some', 'Love them'].map((t, i) => `<option value="${i}" ${st.trendiness === i ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div>
  <label class="field">Clothes I wear<select data-change="wear">${[['w', 'Womenswear'], ['m', 'Menswear'], ['all', 'Both']].map(([k, t]) => `<option value="${k}" ${st.wear === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  <p style="margin-top:14px"><button class="linkish" data-act="restart-ob">Retake the whole style quiz</button></p>

  <h2>This season</h2>
  <div class="card">
    <h3>${esc(TRENDS.season)}</h3>
    <div class="strip" style="margin-top:12px">${TRENDS.colors.map((c) => swatch(c.hex)).join('')}</div>
    <p class="small" style="margin:0">${TRENDS.colors.map((c) => esc(c.name)).join(', ')}</p>
    <ul class="trend-notes">${TRENDS.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    <p class="small">Drawn from the Fall/Winter 2026 runway reports. Outfits get a small boost for these, scaled by your trend setting.</p>
  </div>

  <h2>AI look preview</h2>
  <div class="card">
    <p class="small" style="margin-top:0">Optional. When you ask for it, the photos of the chosen pieces and a short description are sent from this phone straight to the provider below, using your own API key. Nothing is sent otherwise.</p>
    <label class="field">Provider<select data-change="ai-provider">${Object.entries(AI_PROVIDERS).map(([k, p]) => `<option value="${k}" ${ai.provider === k ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="field">API key <a class="small" href="${prov.keyUrl}" target="_blank" rel="noopener">get one</a><input type="password" autocomplete="off" data-change="ai-key" value="${esc(ai.key || '')}" placeholder="Stored only on this device"></label>
    <label class="field">Model<input type="text" list="models" data-change="ai-model" value="${esc(ai.model || '')}" placeholder="${esc(prov.defaultModel)}"><datalist id="models">${prov.models.map((m) => `<option value="${m}">`).join('')}</datalist></label>
    <div class="toggle" style="margin-top:10px"><span>Show the looks on me, using my photo</span><input type="checkbox" data-change="ai-photo" ${ai.usePhoto ? 'checked' : ''}></div>
    ${ai.usePhoto ? `<div class="row" style="margin-top:6px">${S.me ? `<img src="${URL.createObjectURL(S.me)}" alt="Your photo" style="width:60px;height:80px;object-fit:cover;border-radius:6px">` : ''}<button class="btn sm" data-act="pick" data-in="in-me">${S.me ? 'Replace photo' : 'Add a full-length photo'}</button>${S.me ? '<button class="btn sm quiet" data-act="del-me">Remove</button>' : ''}</div>` : ''}
  </div>

  <h2>Your data</h2>
  <div class="card">
    <p class="small" style="margin-top:0" id="usage">Everything stays in this browser on this device.</p>
    <div class="row">
      <button class="btn sm" data-act="export">Export backup</button>
      <button class="btn sm" data-act="pick" data-in="in-backup">Import backup</button>
      <button class="btn sm danger" data-act="wipe">Erase everything</button>
    </div>
  </div>
  <p class="small" style="margin-top:24px;text-align:center">Atelier keeps no account and no server copy. Export a backup before clearing your browser data.</p>`;
}

// ---------------- sheets ----------------
function openSheet(html, { onClose } = {}) {
  const root = $('#sheet-root');
  S.returnFocus = document.activeElement;
  root.innerHTML = `<div class="scrim" data-act="close-sheet-scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  const h = $('.sheet h2', root); if (h) { h.id = 'sheet-title'; $('.sheet', root).setAttribute('aria-labelledby', 'sheet-title'); }
  S.onSheetClose = onClose;
  setTimeout(() => ($('.sheet [autofocus]', root) || $('.sheet button', root))?.focus(), 50);
}
function closeSheet() {
  $('#sheet-root').innerHTML = '';
  if (S.returnFocus?.isConnected) S.returnFocus.focus();
  const cb = S.onSheetClose; S.onSheetClose = null; cb && cb();
}

function sheetAdd() {
  const linked = S.folderLinked;
  openSheet(`
  <div class="sheet-head"><h2 style="margin:0">Add clothes</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="option-list">
    <button class="option" data-act="pick" data-in="in-camera"><div><b>Take a photo</b><span class="small">One piece per photo, plain background, good daylight.</span></div></button>
    <button class="option" data-act="pick" data-in="in-photos"><div><b>Choose photos</b><span class="small">Select many at once from your gallery.</span></div></button>
    ${IS_MOBILE ? `<div class="notice" style="margin:0"><b style="font-weight:500">Keeping a wardrobe album?</b> Choose photos, open the album and select all. Only photos that are not already in your wardrobe are added, so you can re-import the album whenever you add new clothes.</div>`
    : `<button class="option" data-act="pick" data-in="in-folder"><div><b>Import a whole folder</b><span class="small">Every image in the folder. Run it again later: only new photos are added.</span></div></button>`}
    ${'showDirectoryPicker' in window && !IS_MOBILE ? `<button class="option" data-act="link-folder"><div><b>${linked ? 'Check linked folder for new photos' : 'Link a folder'}</b><span class="small">Originals stay where they are. Each check adds new photos and offers to retire pieces whose photos you deleted.</span></div></button>` : ''}
  </div>
  <p class="small" style="margin-top:16px">Photos are shrunk and kept in this browser’s storage. Originals are never changed.</p>`);
}

// item editor (new or existing)
function sheetEditor(id) {
  const it = itemById(id);
  if (!it) return;
  const d = S.edit = { ...it, colors: (it.colors || []).map((c) => ({ ...c })), seasons: [...(it.seasons || [])], styles: [...(it.styles || [])] };
  d.touched = { f: !it.needsTags, w: !it.needsTags };
  if (it.needsTags && !d.cat && S.lastCat) d.cat = S.lastCat;
  renderEditor();
}
function renderEditor() {
  const d = S.edit;
  const subs = (SUBS[d.cat] || []).filter((s) => !s.wear || S.settings.wear === 'all' || s.wear === S.settings.wear);
  const isNew = d.needsTags;
  const left = S.queue.filter((x) => x !== d.id).length;
  const html = `
  <div class="sheet-head"><h2 style="margin:0">${isNew ? 'Describe this piece' : 'Edit piece'}</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="editor-photo"><img src="${urlFor(d)}" alt="">
    <div><span class="label" style="margin-top:0">Colours we found</span>
      <div class="colors">${d.colors.map((c, i) => `<div><label aria-label="Change colour ${i + 1}">${swatch(c.hex)}<input type="color" value="${c.hex.toLowerCase()}" data-change="ed-color" data-i="${i}"></label><div class="cname">${esc(colorName(c.hex))}</div>${d.colors.length > 1 ? `<button class="x" data-act="ed-color-del" data-i="${i}" aria-label="Remove colour">×</button>` : ''}</div>`).join('')}
        ${d.colors.length < 3 ? `<label class="chip" style="min-height:44px">+ Add<input type="color" value="#808080" data-change="ed-color-add" style="position:absolute;opacity:0;inset:0"></label>` : ''}
      </div>
      <p class="small" style="margin:6px 0 0">Tap a swatch to correct it.</p></div>
  </div>
  ${isNew && S.lastTag ? `<button class="chip" data-act="ed-same" style="margin-top:18px">Same as previous: ${esc(subInfo(S.lastTag.cat, S.lastTag.sub).name.toLowerCase())}</button>` : ''}
  <span class="label">What is it?</span>
  <div class="chips">${CATEGORIES.map((c) => `<button class="chip" data-act="ed-cat" data-k="${c.key}" aria-pressed="${d.cat === c.key}">${esc(c.name)}</button>`).join('')}</div>
  ${d.cat ? `<span class="label">Type</span><div class="chips">${subs.map((s) => `<button class="chip" data-act="ed-sub" data-k="${s.key}" aria-pressed="${d.sub === s.key}">${esc(s.name)}</button>`).join('')}</div>` : ''}
  ${d.sub ? `
  <details class="more" ${isNew ? '' : 'open'}><summary>${isNew ? 'More details: pattern, fabric, dressiness, warmth' : 'Details'}</summary>
  <span class="label">Pattern</span>
  <div class="chips">${PATTERNS.map((p) => `<button class="chip" data-act="ed-pat" data-k="${p.key}" aria-pressed="${(d.pattern || 'solid') === p.key}">${esc(p.name)}</button>`).join('')}</div>
  <span class="label">Fabric <span class="small">(optional)</span></span>
  <div class="chips">${MATERIALS.map((m) => `<button class="chip" data-act="ed-mat" data-k="${m}" aria-pressed="${d.material === m}">${m}</button>`).join('')}</div>
  <label class="label" for="ed-f">How dressy? <span class="tape-value">${FORMALITY_LABELS[d.formality]}</span></label>
  <input id="ed-f" class="tape" type="range" min="1" max="5" step="1" value="${d.formality}" data-change="ed-f">
  <label class="label" for="ed-w">How warm? <span class="tape-value">${WARMTH_LABELS[d.warmth]}</span></label>
  <input id="ed-w" class="tape" type="range" min="0" max="5" step="1" value="${d.warmth}" data-change="ed-w">
  <span class="label">Seasons <span class="small">(none selected means all year)</span></span>
  <div class="chips">${SEASONS.map((s) => `<button class="chip" data-act="ed-season" data-k="${s.key}" aria-pressed="${d.seasons.includes(s.key)}">${s.name}</button>`).join('')}</div>
  <span class="label">Feels like <span class="small">(optional)</span></span>
  <div class="chips">${STYLES.map((s) => `<button class="chip" data-act="ed-style" data-k="${s.key}" aria-pressed="${d.styles.includes(s.key)}">${esc(s.name)}</button>`).join('')}</div>
  <label class="field">Name <span class="small">(optional)</span><input type="text" data-change="ed-name" value="${esc(d.name || '')}" placeholder="${esc(colorName(d.colors[0]?.hex || '#888') + ' ' + subInfo(d.cat, d.sub).name.toLowerCase())}"></label>
  <div class="toggle" style="margin-top:8px"><span>Favourite piece</span><input type="checkbox" data-change="ed-fav" ${d.fav ? 'checked' : ''}></div>
  </details>
  ${!isNew ? `<span class="label">Status</span>
  <div class="chips">${[['in', 'In my wardrobe'], ['away', 'In the laundry or away'], ['gone', 'No longer own']].map(([k, t]) => `<button class="chip" data-act="ed-status" data-k="${k}" aria-pressed="${(d.archived ? 'gone' : d.away ? 'away' : 'in') === k}">${t}</button>`).join('')}</div>
  <p class="small" style="margin:8px 0 0">Pieces that are away sit out of outfits until you bring them back. Pieces you no longer own stay in your past looks.</p>
  <p class="small">Worn ${d.wornCount || 0} time${d.wornCount === 1 ? '' : 's'}${d.lastWorn ? `, last on ${new Date(d.lastWorn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}.</p>
  <div class="row" style="margin-top:12px"><button class="btn sm" data-act="ed-pin">Build outfits around it</button><button class="btn sm quiet" data-act="pick" data-in="in-replace">Replace photo</button><button class="btn sm danger" data-act="ed-del">Delete</button></div>` : ''}
  ` : ''}
  <div class="sheet-foot">
    ${isNew ? `<button class="btn quiet" data-act="ed-skip">${left ? 'Later' : 'Close'}</button>` : ''}
    <button class="btn primary" data-act="ed-save" ${d.cat && d.sub ? '' : 'disabled'}>${isNew && left ? `Save, next (${left})` : 'Save'}</button>
  </div>`;
  const sheet = $('.sheet');
  if (sheet && S.editorOpen) { const open = $('.sheet details.more')?.open; const y = sheet.scrollTop; sheet.innerHTML = `<div class="grab"></div>${html}`; if (open) $('.sheet details.more').open = true; sheet.scrollTop = y; }
  else { openSheet(html, { onClose: () => { S.editorOpen = false; S.edit = null; } }); S.editorOpen = true; }
}

async function saveEditor() {
  const d = S.edit;
  const it = itemById(d.id);
  Object.assign(it, { archived: !!d.archived, away: !!d.away, img: d.img, fp: d.fp, imgVer: d.imgVer, cat: d.cat, sub: d.sub, colors: d.colors, pattern: d.pattern || 'solid', material: d.material || null, formality: Number(d.formality), warmth: Number(d.warmth), seasons: d.seasons, styles: d.styles, name: d.name || '', fav: !!d.fav, needsTags: false, manual: true });
  await db.put('items', it);
  if (d.needsTags) S.lastTag = { cat: it.cat, sub: it.sub, pattern: it.pattern, material: it.material, formality: it.formality, warmth: it.warmth, seasons: it.seasons, styles: it.styles };
  S.queue = S.queue.filter((x) => x !== d.id);
  S.results = [];
  S.editorOpen = false; S.edit = null;
  if (S.queue.length) { S.editorOpen = false; closeSheet(); render(); sheetEditor(S.queue[0]); }
  else { closeSheet(); render(); toast('Saved'); }
}

// swap sheet
function sheetSwap(i, slot) {
  const o = S.results[i];
  const ctx = currentCtx();
  const alts = alternatives(o, slot, S.items, ctx);
  const cur = o.slots[slot];
  const optional = ['layer', 'outer', 'bag', 'acc'].includes(slot);
  openSheet(`
  <div class="sheet-head"><h2 style="margin:0">${cur ? 'Swap' : 'Add'} ${esc(SLOT_NAMES[slot].toLowerCase())}</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  ${!alts.length ? '<p class="lede">Nothing else in your wardrobe fits here yet.</p>' : `<p class="small">Best matches for this look come first.</p>`}
  <div class="alts">${alts.map((a, k) => `<button class="alt ${k === 0 ? 'best' : ''}" data-act="do-swap" data-i="${i}" data-slot="${slot}" data-id="${a.item.id}"><img src="${urlFor(a.item)}" alt=""><span>${esc(colorName(a.item.colors?.[0]?.hex || '#888'))} ${esc(subInfo(a.item.cat, a.item.sub).name.toLowerCase())}</span></button>`).join('')}</div>
  ${cur && optional ? `<div class="sheet-foot"><button class="btn" data-act="do-swap" data-i="${i}" data-slot="${slot}" data-id="">Remove ${esc(SLOT_NAMES[slot].toLowerCase())} from this look</button></div>` : ''}`);
}

// AI sheet
function sheetAI(outfit, lookId = null) {
  const st = S.settings;
  const occName = occasionByKey(S.occasion).name;
  const hasKey = !!st.ai?.key;
  S.aiTarget = { outfit, lookId };
  openSheet(`
  <div class="sheet-head"><h2 style="margin:0">Picture this look</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  ${hasKey ? `
    <p class="small">Sends ${outfitItems(outfit).length} piece photos${st.ai.usePhoto && S.me ? ' and your photo' : ''} to ${esc(AI_PROVIDERS[st.ai.provider]?.name || 'Gemini')}. AI pictures are a guide: colours and fit can drift.</p>
    <div id="ai-out" style="margin:14px 0"></div>
    <details><summary class="small">What will be sent</summary><div class="prompt">${esc(buildPrompt(outfit, st, occName, !!(st.ai.usePhoto && S.me)))}</div></details>
    <div class="sheet-foot"><button class="btn primary" data-act="ai-run" id="ai-run">Create picture</button></div>`
  : `<p class="lede">To picture looks with AI, add your own Google Gemini or OpenAI API key in Palette &amp; me. It stays on this device and is only used when you tap Create picture.</p>
     <div class="sheet-foot"><button class="btn primary" data-act="goto-ai-settings">Set up AI preview</button></div>`}`);
}

async function runAI() {
  const { outfit, lookId } = S.aiTarget;
  const out = $('#ai-out'), btn = $('#ai-run');
  btn.disabled = true; btn.textContent = 'Creating…';
  out.innerHTML = `<div class="row"><div class="spinner"></div><span class="small">This usually takes 10 to 30 seconds.</span></div>`;
  try {
    const items = outfitItems(outfit);
    const blobs = await Promise.all(items.map(async (i) => (i.img.type === 'image/svg+xml' ? rasterize(i.img) : i.img)));
    const { blob } = await generateLookImage({ outfit, settings: S.settings, occasionName: occasionByKey(S.occasion).name, imageBlobs: blobs, personBlob: S.me });
    S.aiTarget.blob = blob;
    out.innerHTML = `<img class="ai-out" src="${URL.createObjectURL(blob)}" alt="AI picture of the look">`;
    const foot = $('.sheet-foot');
    foot.innerHTML = `<a class="btn" download="atelier-look.png" href="${URL.createObjectURL(blob)}">Download</a><button class="btn primary" data-act="ai-keep">${lookId ? 'Keep with look' : 'Save look with picture'}</button>`;
  } catch (e) {
    out.innerHTML = `<div class="notice">${esc(e.message || String(e))}</div>`;
    btn.disabled = false; btn.textContent = 'Try again';
  }
}
async function rasterize(svgBlobIn) {
  const img = new Image();
  img.src = URL.createObjectURL(svgBlobIn);
  await img.decode();
  const c = document.createElement('canvas'); c.width = 400; c.height = 480;
  c.getContext('2d').drawImage(img, 0, 0, 400, 480);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

function sheetLook(id) {
  const l = S.looks.find((x) => x.id === id);
  if (!l) return;
  const slots = {};
  for (const iid of l.itemIds) { const it = itemById(iid); if (it) slots[it.cat === 'dress' ? 'dress' : it.cat] = it; }
  const o = { slots };
  openSheet(`
  <div class="sheet-head"><h2 class="look-name" style="margin:0">${esc(l.name)}</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <p class="small">${esc(occasionByKey(l.occasion).name)}${l.style ? `, ${esc(styleByKey(l.style).name)}` : ''}</p>
  ${l.aiImg ? `<img class="ai-out" src="${aiUrl(l)}" alt="AI picture of this look" style="margin-bottom:12px">` : ''}
  ${boardHTML(o, 0, false)}
  ${outfitStrip(o)}
  ${l.reasons?.length ? `<ul class="reasons">${l.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
  <div class="sheet-foot"><button class="btn" data-act="ai-saved" data-id="${l.id}">Picture it with AI</button><button class="btn primary" data-act="wear-saved" data-id="${l.id}">Wear today</button></div>`);
}

// ---------------- onboarding ----------------
const OB_STEPS = 6;
function renderOnboarding() {
  const root = $('#onboarding-root');
  if (!S.ob) { root.innerHTML = ''; return; }
  const { step, a } = S.ob;
  const prog = `<header class="top"><span class="wordmark">Atelier</span><div class="ob-progress" aria-label="Step ${step + 1} of ${OB_STEPS}">${Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div></header>`;
  const opt = (field, val, title, sub = '') => `<button class="option" data-act="ob-set" data-f="${field}" data-v="${val}" aria-pressed="${a[field] === val}"><div><b>${title}</b>${sub ? `<span class="small">${sub}</span>` : ''}</div></button>`;
  const qchips = (field, list) => `<div class="chips">${list.map(([v, t]) => `<button class="chip" data-act="ob-set" data-f="${field}" data-v="${v}" aria-pressed="${a[field] === v}">${t}</button>`).join('')}</div>`;
  let body = '', next = 'Continue', canNext = true, back = step > 0;
  if (step === 0) {
    body = `<h1 class="ob-hero">Your wardrobe,<em>edited.</em></h1>
      <p class="lede">Photograph what you already own. Atelier learns your style and your colours, then composes outfits for whatever the day holds.</p>
      <p class="small">Takes about a minute. Everything stays on this device.</p>
      <div class="ob-swatches" aria-hidden="true">${['#000000', '#4A2E22', '#6D1F2F', '#B9874D', '#F0EEE9'].map((c) => swatch(c)).join('')}</div>`;
    next = 'Begin';
  } else if (step === 1) {
    body = `<h1>Whose wardrobe is this?</h1><p class="lede">This decides which garment types we offer. You can change it later.</p>
      <div class="option-list">${opt('wear', 'w', 'Womenswear')}${opt('wear', 'm', 'Menswear')}${opt('wear', 'all', 'Both, or it varies')}</div>`;
  } else if (step === 2) {
    body = `<h1>Which styles feel like you?</h1><p class="lede">Choose up to three. Your first choice becomes the default for every outfit.</p>
      <div class="option-list">${STYLES.map((s) => { const i = a.styles.indexOf(s.key); return `<button class="option" data-act="ob-style" data-k="${s.key}" aria-pressed="${i >= 0}"><span class="rank" aria-hidden="true">${i >= 0 ? i + 1 : ''}</span><div><b>${esc(s.name)}</b><span class="small">${esc(s.blurb)}</span><div class="mini-strip">${s.swatch.map((c) => swatch(c)).join('')}</div></div></button>`; }).join('')}</div>`;
    canNext = a.styles.length > 0;
  } else if (step === 3) {
    body = `<h1>How do you live in your clothes?</h1>
      <div class="q"><h3>A typical week</h3>${qchips('lifestyle', [['office', 'Mostly office'], ['mixed', 'A mix'], ['casual', 'Mostly casual'], ['creative', 'Creative, flexible']])}</div>
      <div class="q"><h3>Colour and print</h3><p class="small">How adventurous should outfits be?</p>${qchips('boldness', [[0, 'Keep it quiet'], [1, 'A touch'], [2, 'Bring it on']])}</div>
      <div class="q"><h3>Trends</h3><p class="small">How much should this season’s runways steer suggestions?</p>${qchips('trendiness', [[0, 'Timeless first'], [1, 'Some'], [2, 'Love them']])}</div>`;
  } else if (step === 4) {
    body = `<h1>Find your colours</h1><p class="lede">Four questions to place you in one of twelve colour seasons. Look in a mirror in daylight, without make-up if you can.</p>
      <div class="q"><h3>Your undertone</h3><p class="small">Veins on your inner wrist look blue or purple (cool), green or olive (warm), or hard to tell (neutral). Silver jewellery flatters cool, gold flatters warm.</p>${qchips('undertone', [['cool', 'Cool'], ['warm', 'Warm'], ['neutral', 'Neutral']])}</div>
      <div class="q"><h3>Overall depth</h3><p class="small">Your hair, skin and eyes taken together.</p>${qchips('depth', [['light', 'Light'], ['medium', 'Medium'], ['deep', 'Deep']])}</div>
      <div class="q"><h3>Contrast</h3><p class="small">The difference between your hair and your skin.</p>${qchips('contrast', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}</div>
      <div class="q"><h3>Your eyes</h3><p class="small">Clear and sparkling, or soft and blended?</p>${qchips('chroma', [['bright', 'Clear, bright'], ['medium', 'In between'], ['soft', 'Soft, muted']])}</div>
      <div class="q"><h3>Near your face</h3><p class="small">Hold each against your face. Which makes your skin look clearer?</p>${qchips('drape', [['cool', 'Pure white and black'], ['warm', 'Cream and chocolate'], ['unsure', 'Not sure']])}</div>`;
    canNext = a.undertone && a.depth && a.contrast && a.chroma;
    next = 'See my palette';
  } else if (step === 5) {
    const key = a.palette || (a.undertone ? seasonFromQuiz(a) : 'trend');
    a.palette = key;
    const p = PALETTES[key];
    body = `<p class="kicker">Your palette</p><h1>${esc(p.name)}</h1><p class="lede">${esc(p.about)}</p>
      <span class="label">Neutrals</span><div class="swatchbook">${p.neutrals.map((h) => `<div class="sw">${swatch(h)}<span>${esc(colorName(h))}</span></div>`).join('')}</div>
      <span class="label">Accents</span><div class="swatchbook">${p.accents.map((h) => `<div class="sw">${swatch(h)}<span>${esc(colorName(h))}</span></div>`).join('')}</div>
      <label class="field" style="margin-top:22px">Not quite right? Pick another<select data-change="ob-palette">${Object.entries(PALETTES).map(([k, pp]) => `<option value="${k}" ${k === key ? 'selected' : ''}>${esc(pp.name)}</option>`).join('')}</select></label>`;
    next = 'Start';
  }
  root.innerHTML = `<div class="ob" role="dialog" aria-modal="true" aria-label="Set up"><div class="ob-inner">${prog}${body}</div>
    <div class="ob-foot"><div>
      ${back ? '<button class="btn quiet" data-act="ob-back">Back</button>' : ''}
      ${step === 4 ? '<button class="btn quiet" data-act="ob-skip-colour">Skip</button>' : ''}
      <button class="btn primary" data-act="ob-next" ${canNext ? '' : 'disabled'}>${next}</button>
    </div></div></div>`;
}
function finishOnboarding() {
  const a = S.ob.a;
  Object.assign(S.settings, {
    onboarded: true, wear: a.wear, styles: a.styles.length ? a.styles : ['smart'], lifestyle: a.lifestyle,
    boldness: Number(a.boldness), trendiness: Number(a.trendiness), palette: a.palette || 'trend',
    colorQuiz: a.undertone ? { undertone: a.undertone, depth: a.depth, contrast: a.contrast, chroma: a.chroma, drape: a.drape } : S.settings.colorQuiz,
  });
  save();
  S.styleKey = S.settings.styles[0];
  S.occasion = defaultOccasion();
  S.ob = null; renderOnboarding();
  S.tab = live().length ? 'style' : 'wardrobe';
  S.results = [];
  render();
  requestPersist();
}

// ---------------- photos ----------------
async function processFile(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const max = 900, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const colors = extractColors(c);
  const fp = fingerprint(c);
  const img = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.84));
  return { img, fp, colors: colors.map((x) => ({ hex: x.hex, share: Math.round(x.share * 100) / 100 })) };
}
// 64-bit difference hash: the same photo picked again gives the same (or nearly the same) value
function fingerprint(src) {
  const c = document.createElement('canvas'); c.width = 9; c.height = 8;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, 9, 8);
  const d = x.getImageData(0, 0, 9, 8).data;
  const g = (i) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  let bits = '';
  for (let y = 0; y < 8; y++) for (let k = 0; k < 8; k++) bits += g(y * 9 + k) > g(y * 9 + k + 1) ? '1' : '0';
  return bits;
}
const hamming = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
function findDuplicate(fp, hex, fileKey) {
  return S.items.find((i) => (fileKey && i.fileKey === fileKey) || (i.fp && hamming(i.fp, fp) <= 2 && deltaE(i.colors?.[0]?.hex || '#808080', hex) < 8));
}

async function addFiles(files, source = 'photo', extra = () => ({})) {
  const list = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(f.name));
  if (!list.length) { toast('No photos found there'); return; }
  toast(`Reading ${list.length} photo${list.length > 1 ? 's' : ''}…`, 60000);
  let ok = 0, fail = 0, dup = 0;
  for (const f of list) {
    try {
      const fileKey = `${f.name}:${f.size}:${f.lastModified}`;
      if (S.items.some((i) => i.fileKey === fileKey)) { dup++; continue; }
      const { img, colors, fp } = await processFile(f);
      if (findDuplicate(fp, colors[0]?.hex || '#808080', null)) { dup++; continue; }
      const it = { id: uid(), created: Date.now(), img, fp, fileKey, colors, cat: null, sub: null, pattern: 'solid', material: null, formality: 2, warmth: 1, seasons: [], styles: [], fav: false, wornCount: 0, lastWorn: null, needsTags: true, source, fileName: f.name, ...extra(f) };
      await db.put('items', it);
      S.items.unshift(it); S.queue.push(it.id); ok++;
    } catch (e) { console.warn(e); fail++; }
  }
  const parts = [`Added ${ok} new piece${ok === 1 ? '' : 's'}`];
  if (dup) parts.push(`${dup} already in your wardrobe`);
  if (fail) parts.push(`${fail} could not be read (convert HEIC to JPEG)`);
  toast(parts.join('. '), 4000);
  closeSheet();
  S.tab = 'wardrobe'; render();
  if (S.queue.length) sheetEditor(S.queue[0]);
}

async function linkFolder() {
  try {
    let handle = await db.getMeta('folder');
    if (!handle) {
      handle = await window.showDirectoryPicker({ id: 'atelier-wardrobe', mode: 'read' });
      await db.setMeta('folder', handle);
    } else if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
      if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') { toast('Folder access was not granted'); return; }
    }
    S.folderLinked = true;
    const seen = new Set((await db.getMeta('folderSeen')) || []);
    const files = [];
    async function walk(dir, depth, path) {
      for await (const entry of dir.values()) {
        if (entry.kind === 'file' && /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(entry.name)) {
          const f = await entry.getFile();
          const key = `${path}${f.name}:${f.size}:${f.lastModified}`;
          if (!seen.has(key)) { files.push({ f, key, path: path + f.name }); }
        } else if (entry.kind === 'directory' && depth < 2) await walk(entry, depth + 1, path + entry.name + '/');
      }
    }
    const present = new Set();
    const walkAll = async (dir, depth, path) => { for await (const e of dir.values()) { if (e.kind === 'file') present.add(path + e.name); else if (depth < 2) await walkAll(e, depth + 1, path + e.name + '/'); } };
    await walk(handle, 0, '');
    await walkAll(handle, 0, '');
    const gone = live().filter((i) => i.source === 'folder' && i.path && !present.has(i.path));
    if (gone.length && confirm(`${gone.length} photo${gone.length > 1 ? 's were' : ' was'} removed from the folder. Mark ${gone.length > 1 ? 'those pieces' : 'that piece'} as no longer owned?`)) {
      for (const i of gone) { i.archived = true; i.away = false; await db.put('items', i); }
      render();
    }
    if (!files.length) { toast(gone.length ? 'Wardrobe updated' : 'No new photos in the linked folder'); closeSheet(); return; }
    const map = new Map(files.map((x) => [x.f, x]));
    await addFiles(files.map((x) => x.f), 'folder', (f) => ({ path: map.get(f)?.path }));
    files.forEach((x) => seen.add(x.key));
    await db.setMeta('folderSeen', [...seen]);
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not open that folder');
  }
}

// ---------------- actions ----------------
function currentCtx() {
  return makeContext({ settings: S.settings, occasion: S.occasion, styleKey: S.styleKey, temp: S.temp, rain: S.rain });
}
function runEngine() {
  const ctx = currentCtx();
  const pin = S.pin ? itemById(S.pin) : null;
  const { outfits, missing, thin } = generate(S.items, ctx, { pin });
  S.results = outfits; S.missing = missing; S.thin = thin; S.ran = true;
  render();
  requestAnimationFrame(() => $('.looks')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

async function logWear(itemIds, extra) {
  const today = new Date().toISOString().slice(0, 10);
  for (const id of itemIds) {
    const it = itemById(id); if (!it) continue;
    it.lastWorn = new Date().toISOString(); it.wornCount = (it.wornCount || 0) + 1;
    await db.put('items', it);
  }
  const look = { id: uid(), created: Date.now(), wornOn: today, saved: false, ...extra, itemIds };
  await db.put('looks', look); S.looks.unshift(look);
}
async function saveLook(o, opts = {}) {
  const look = { id: uid(), created: Date.now(), saved: true, name: lookName(o), occasion: S.occasion, style: S.styleKey, reasons: o.reasons, itemIds: outfitItems(o).map((i) => i.id), ...opts };
  await db.put('looks', look); S.looks.unshift(look);
  return look;
}

const handlers = {
  tab: (el) => { S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  occ: (el) => { S.occasion = el.dataset.k; S.results = []; S.ran = false; render(); },
  style: (el) => { S.styleKey = el.dataset.k; S.results = []; S.ran = false; render(); },
  temp: (el) => { S.temp = Math.max(-15, Math.min(40, Math.round(S.temp / 2) * 2 + Number(el.dataset.d) * 2)); S.settings.lastTemp = S.temp; save(); S.results = []; S.ran = false; render(); $('[data-act=temp][data-d="' + el.dataset.d + '"]')?.focus(); },
  rain: () => { S.rain = !S.rain; S.results = []; S.ran = false; render(); },
  forecast: async () => {
    if (!navigator.geolocation) { toast('Location is not available in this browser'); return; }
    toast('Checking the forecast…', 10000);
    navigator.geolocation.getCurrentPosition(async (p) => {
      try {
        const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude.toFixed(2)}&longitude=${p.coords.longitude.toFixed(2)}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`;
        const j = await (await fetch(u)).json();
        const hi = j.daily.temperature_2m_max[0], lo = j.daily.temperature_2m_min[0], pr = j.daily.precipitation_probability_max[0];
        S.temp = Math.round(lo + (hi - lo) * 0.6); S.rain = pr >= 50; S.settings.lastTemp = S.temp; save(); S.results = [];
        render(); toast(`Today ${Math.round(lo)} to ${Math.round(hi)}°C, ${pr}% chance of rain`);
      } catch { toast('Could not reach the forecast service'); }
    }, () => toast('Location permission was declined'), { timeout: 10000, maximumAge: 3600e3 });
  },
  go: runEngine,
  unpin: () => { S.pin = null; S.results = []; render(); },
  swap: (el) => sheetSwap(Number(el.dataset.i), el.dataset.slot),
  'do-swap': (el) => {
    const i = Number(el.dataset.i), slot = el.dataset.slot;
    const o = S.results[i];
    const slots = { ...o.slots };
    if (el.dataset.id) slots[slot] = itemById(el.dataset.id); else delete slots[slot];
    S.results[i] = rescore({ slots, fit: o.fit }, currentCtx());
    closeSheet(); render();
    requestAnimationFrame(() => document.querySelectorAll('.look')[i]?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  },
  wear: async (el) => { const o = S.results[Number(el.dataset.i)]; await logWear(outfitItems(o).map((x) => x.id), { name: lookName(o), occasion: S.occasion, style: S.styleKey, reasons: o.reasons }); toast('Logged as worn today. Enjoy it.'); },
  'save-look': async (el) => { await saveLook(S.results[Number(el.dataset.i)]); toast('Saved to Looks'); },
  ai: (el) => sheetAI(S.results[Number(el.dataset.i)]),
  'ai-run': runAI,
  'ai-keep': async () => {
    const t = S.aiTarget;
    if (t.lookId) { const l = S.looks.find((x) => x.id === t.lookId); l.aiImg = t.blob; aiUrls.delete(l.id); await db.put('looks', l); }
    else await saveLook(t.outfit, { aiImg: t.blob });
    closeSheet(); toast('Saved to Looks'); if (S.tab === 'looks') render();
  },
  'ai-saved': (el) => { const l = S.looks.find((x) => x.id === el.dataset.id); const slots = {}; l.itemIds.map(itemById).filter(Boolean).forEach((it) => (slots[it.cat] = it)); sheetAI({ slots }, l.id); },
  'goto-ai-settings': () => { closeSheet(); S.tab = 'profile'; render(); setTimeout(() => $('[data-change="ai-key"]')?.scrollIntoView({ block: 'center' }), 50); },

  cat: (el) => { S.cat = el.dataset.k; render(); },
  add: sheetAdd,
  pick: (el) => { const inp = $('#' + el.dataset.in); inp.value = ''; inp.click(); },
  'link-folder': linkFolder,
  'tag-next': () => S.queue.length && sheetEditor(S.queue[0]),
  edit: (el) => sheetEditor(el.dataset.id),
  'load-samples': async () => {
    const items = sampleItems(S.settings.wear);
    for (const it of items) if (!itemById(it.id)) { S.items.push(it); await db.put('items', it); }
    S.items.sort((a, b) => b.created - a.created);
    S.results = []; render(); toast(`Loaded ${items.length} sample pieces`);
  },
  'clear-samples': async () => { for (const i of S.items.filter((x) => x.sample)) await db.del('items', i.id); S.items = S.items.filter((i) => !i.sample); S.results = []; render(); toast('Samples removed'); },

  'ed-cat': (el) => { const d = S.edit; d.cat = el.dataset.k; d.sub = null; S.lastCat = d.cat; renderEditor(); },
  'ed-sub': (el) => { const d = S.edit; d.sub = el.dataset.k; const s = subInfo(d.cat, d.sub); if (!d.touched.f) d.formality = s.f; if (!d.touched.w) d.warmth = s.w; renderEditor(); },
  'ed-pat': (el) => { S.edit.pattern = el.dataset.k; renderEditor(); },
  'ed-mat': (el) => { S.edit.material = S.edit.material === el.dataset.k ? null : el.dataset.k; renderEditor(); },
  'ed-season': (el) => { const a = S.edit.seasons, k = el.dataset.k; a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k); renderEditor(); },
  'ed-style': (el) => { const a = S.edit.styles, k = el.dataset.k; a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k); renderEditor(); },
  'ed-color-del': (el) => { S.edit.colors.splice(Number(el.dataset.i), 1); renderEditor(); },
  'ed-save': saveEditor,
  'ed-status': (el) => { const k = el.dataset.k; S.edit.archived = k === 'gone'; S.edit.away = k === 'away'; renderEditor(); },
  'back-all': async () => { for (const i of S.items.filter((x) => x.away)) { i.away = false; await db.put('items', i); } S.results = []; render(); toast('Everything is back in rotation'); },
  'ed-skip': () => {
    const id = S.edit.id; S.queue = S.queue.filter((x) => x !== id).concat(id);
    S.editorOpen = false; closeSheet(); render();
    if (S.queue.length > 1) sheetEditor(S.queue[0]);
  },
  'ed-same': () => { const p = S.lastTag; if (!p) return; Object.assign(S.edit, { cat: p.cat, sub: p.sub, pattern: p.pattern, material: p.material, formality: p.formality, warmth: p.warmth, seasons: [...p.seasons], styles: [...p.styles] }); S.edit.touched = { f: true, w: true }; renderEditor(); },
  'ed-del': async () => {
    if (!confirm('Delete this piece from your wardrobe?')) return;
    const id = S.edit.id; const it = itemById(id);
    await db.del('items', id);
    S.items = S.items.filter((i) => i.id !== id); S.queue = S.queue.filter((x) => x !== id); S.results = [];
    S.editorOpen = false; closeSheet(); render(); toast('Deleted');
  },
  'ed-pin': () => { S.pin = S.edit.id; S.editorOpen = false; closeSheet(); S.tab = 'style'; S.results = []; render(); runEngine(); },

  'looks-view': (el) => { S.looksView = el.dataset.k; render(); },
  'open-look': (el) => sheetLook(el.dataset.id),
  'wear-saved': async (el) => { const l = S.looks.find((x) => x.id === el.dataset.id); await logWear(l.itemIds, { name: l.name, occasion: l.occasion, style: l.style, reasons: l.reasons }); closeSheet(); render(); toast('Logged as worn today'); },
  'del-look': async (el) => { if (!confirm('Delete this look?')) return; await db.del('looks', el.dataset.id); S.looks = S.looks.filter((l) => l.id !== el.dataset.id); render(); },

  sig: (el) => { const a = S.settings.signature, h = el.dataset.hex; if (a.includes(h)) a.splice(a.indexOf(h), 1); else { if (a.length >= 5) { toast('Up to five signature colours'); return; } a.push(h); } save(); render(); },
  'my-style': (el) => { const a = S.settings.styles, k = el.dataset.k; if (a.includes(k)) { if (a.length === 1) { toast('Keep at least one style'); return; } a.splice(a.indexOf(k), 1); } else { if (a.length >= 3) a.pop(); a.push(k); } save(); S.styleKey = a[0]; S.results = []; render(); },
  'retake-colour': () => { S.ob = { step: 4, a: { ...S.settings, styles: [...S.settings.styles], ...(S.settings.colorQuiz || {}), palette: null } }; renderOnboarding(); },
  'restart-ob': () => { S.ob = { step: 1, a: { ...S.settings, styles: [...S.settings.styles], ...(S.settings.colorQuiz || {}), palette: null } }; renderOnboarding(); },
  'del-me': async () => { await db.delMeta('me'); S.me = null; render(); },
  export: exportBackup,
  wipe: async () => {
    if (!confirm('Erase all clothes, looks and settings from this device? This cannot be undone.')) return;
    await db.clear('items'); await db.clear('looks'); await db.delMeta('folder'); await db.delMeta('folderSeen'); await db.delMeta('me');
    clearSettings(); location.reload();
  },

  'ob-next': () => { if (S.ob.step === 4 && S.ob.a.undertone) S.ob.a.palette = null; if (S.ob.step >= OB_STEPS - 1) finishOnboarding(); else { S.ob.step++; renderOnboarding(); $('.ob').scrollTop = 0; } },
  'ob-back': () => { S.ob.step--; renderOnboarding(); },
  'ob-skip-colour': () => { Object.assign(S.ob.a, { undertone: null, palette: 'trend' }); S.ob.step = 5; renderOnboarding(); },
  'ob-set': (el) => { const f = el.dataset.f; let v = el.dataset.v; if (['boldness', 'trendiness'].includes(f)) v = Number(v); S.ob.a[f] = v; renderOnboarding(); },
  'ob-style': (el) => { const a = S.ob.a.styles, k = el.dataset.k; if (a.includes(k)) a.splice(a.indexOf(k), 1); else if (a.length < 3) a.push(k); else toast('Up to three. Tap one to remove it.'); renderOnboarding(); },

  'close-sheet': () => { S.editorOpen = false; closeSheet(); },
  'close-sheet-scrim': (el, ev) => { if (ev.target === el) { S.editorOpen = false; closeSheet(); } },
};

const changes = {
  palette: (el) => { S.settings.palette = el.value; save(); S.results = []; render(); },
  boldness: (el) => { S.settings.boldness = Number(el.value); save(); S.results = []; },
  trendiness: (el) => { S.settings.trendiness = Number(el.value); save(); S.results = []; },
  wear: (el) => { S.settings.wear = el.value; save(); S.results = []; },
  'ai-provider': (el) => { S.settings.ai = { ...S.settings.ai, provider: el.value, model: '' }; save(); render(); },
  'ai-key': (el) => { S.settings.ai = { ...S.settings.ai, key: el.value.trim() }; save(); },
  'ai-model': (el) => { S.settings.ai = { ...S.settings.ai, model: el.value.trim() }; save(); },
  'ai-photo': (el) => { S.settings.ai = { ...S.settings.ai, usePhoto: el.checked }; save(); render(); },
  'ob-palette': (el) => { S.ob.a.palette = el.value; renderOnboarding(); },
  'ed-color': (el) => { S.edit.colors[Number(el.dataset.i)].hex = el.value.toUpperCase(); renderEditor(); },
  'ed-color-add': (el) => { S.edit.colors.push({ hex: el.value.toUpperCase(), share: 0.2 }); renderEditor(); },
  'ed-f': (el) => { S.edit.formality = Number(el.value); S.edit.touched.f = true; el.previousElementSibling.querySelector('.tape-value').textContent = FORMALITY_LABELS[el.value]; },
  'ed-w': (el) => { S.edit.warmth = Number(el.value); S.edit.touched.w = true; el.previousElementSibling.querySelector('.tape-value').textContent = WARMTH_LABELS[el.value]; },
  'ed-name': (el) => { S.edit.name = el.value; },
  'ed-fav': (el) => { S.edit.fav = el.checked; },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const h = handlers[el.dataset.act];
  if (h) { if (el.tagName === 'A') return; ev.preventDefault(); h(el, ev); }
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (el && (el.type === 'range')) changes[el.dataset.change]?.(el);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (el && el.type !== 'range') changes[el.dataset.change]?.(el);
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && $('#sheet-root').innerHTML) { S.editorOpen = false; closeSheet(); } });

$('#in-camera').addEventListener('change', (e) => addFiles(e.target.files));
$('#in-photos').addEventListener('change', (e) => addFiles(e.target.files));
$('#in-folder').addEventListener('change', (e) => addFiles(e.target.files, 'folder', (f) => ({ path: f.webkitRelativePath || f.name })));
$('#in-replace').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f || !S.edit) return;
  try { const { img, colors, fp } = await processFile(f); Object.assign(S.edit, { img, colors, fp, imgVer: (S.edit.imgVer || 0) + 1 }); renderEditor(); toast('New photo ready. Save to keep it.'); }
  catch { toast('Could not read that photo'); }
});
$('#in-me').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; const { img } = await processFile(f); await db.setMeta('me', img); S.me = img; render(); toast('Photo saved on this device'); });
$('#in-backup').addEventListener('change', (e) => e.target.files[0] && importBackup(e.target.files[0]));

// ---------------- backup ----------------
const toDataURL = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
const fromDataURL = async (u) => (await fetch(u)).blob();
async function exportBackup() {
  toast('Preparing backup…', 20000);
  const items = await Promise.all(S.items.filter((i) => !i.sample).map(async (i) => ({ ...i, img: i.img ? await toDataURL(i.img) : null })));
  const looks = await Promise.all(S.looks.map(async (l) => ({ ...l, aiImg: l.aiImg ? await toDataURL(l.aiImg) : null })));
  const settings = { ...S.settings, ai: { ...S.settings.ai, key: '' } };
  const blob = new Blob([JSON.stringify({ app: 'atelier', version: 1, exported: new Date().toISOString(), settings, items, looks })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `atelier-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Backup downloaded. Your API key is not included.');
}
async function importBackup(file) {
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== 'atelier') throw new Error('Not an Atelier backup');
    if (!confirm(`Import ${j.items.length} pieces and ${j.looks.length} looks? Pieces with the same id are replaced.`)) return;
    for (const i of j.items) { if (i.img) i.img = await fromDataURL(i.img); await db.put('items', i); }
    for (const l of j.looks) { if (l.aiImg) l.aiImg = await fromDataURL(l.aiImg); else delete l.aiImg; await db.put('looks', l); }
    S.settings = { ...S.settings, ...j.settings, ai: S.settings.ai, onboarded: true }; save();
    location.reload();
  } catch (e) { toast('Could not import: ' + e.message); }
}

// storage usage line on profile
async function updateUsage() {
  const u = $('#usage'); if (!u) return;
  const e = await storageEstimate();
  if (e?.usage != null) u.textContent = `Everything stays in this browser on this device. Using ${(e.usage / 1048576).toFixed(1)} MB${e.quota ? ` of about ${Math.round(e.quota / 1048576 / 1024 * 10) / 10} GB available` : ''}.`;
}
new MutationObserver(() => updateUsage()).observe($('#screen'), { childList: true });

boot().then(async () => { S.folderLinked = !!(await db.getMeta('folder').catch(() => null)); });
