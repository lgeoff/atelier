// Local-only storage. Settings → localStorage. Photos and records → IndexedDB (the browser's
// local database; localStorage alone caps out around 5 MB, which is ~20 photos).

const DB_NAME = 'atelier';
const DB_VER = 1;
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('looks')) db.createObjectStore('looks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => (out = v));
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const db = {
  all: (store) => tx(store, 'readonly', (s) => req(s.getAll())),
  get: (store, id) => tx(store, 'readonly', (s) => req(s.get(id))),
  put: (store, obj) => tx(store, 'readwrite', (s) => req(s.put(obj))),
  del: (store, id) => tx(store, 'readwrite', (s) => req(s.delete(id))),
  clear: (store) => tx(store, 'readwrite', (s) => req(s.clear())),
  getMeta: (k) => tx('meta', 'readonly', (s) => req(s.get(k))),
  setMeta: (k, v) => tx('meta', 'readwrite', (s) => req(s.put(v, k))),
  delMeta: (k) => tx('meta', 'readwrite', (s) => req(s.delete(k))),
};

const SKEY = 'atelier.settings.v1';
export const DEFAULT_SETTINGS = {
  onboarded: false,
  wear: 'all',            // 'w' | 'm' | 'all'
  styles: ['smart'],      // first = default style
  lifestyle: 'mixed',
  boldness: 1,            // 0 quiet · 1 a touch · 2 bring it on
  trendiness: 1,          // 0 timeless · 1 some · 2 love trends
  colorQuiz: null,
  palette: 'trend',
  signature: [],          // hexes the user pinned as their go-to colours
  ai: { provider: 'gemini', key: '', model: '', usePhoto: false },
  lastTemp: 10,
};
export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} }
export function clearSettings() { try { localStorage.removeItem(SKEY); } catch {} }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return e;
}
export async function requestPersist() {
  try { if (navigator.storage?.persist) return await navigator.storage.persist(); } catch {}
  return false;
}
