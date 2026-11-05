// Optional AI look preview. Runs only when the user asks. The request goes straight from this
// browser to the provider with the user's own API key; nothing passes through any other server.
import { subInfo } from './data.js';
import { colorName } from './color.js';
import { outfitItems } from './engine.js';

export const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-2.5-flash-image',
    models: ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-nano-banana-2.1'],
  },
  openai: {
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-image-1',
    models: ['gpt-image-1', 'gpt-image-1.5', 'gpt-image-2'],
  },
};

export function describeItem(it) {
  const s = subInfo(it.cat, it.sub);
  const col = it.colors?.[0] ? colorName(it.colors[0].hex) : '';
  const second = it.colors?.[1] && it.colors[1].share > 0.2 ? ` and ${colorName(it.colors[1].hex)}` : '';
  const pat = it.pattern && it.pattern !== 'solid' ? ` ${it.pattern === 'check' ? 'checked' : it.pattern}` : '';
  const mat = it.material ? ` ${it.material}` : '';
  return `${col}${second}${pat}${mat} ${s.name.toLowerCase()}`.trim();
}

export function buildPrompt(outfit, settings, occasionName, withPhoto) {
  const who = settings.wear === 'w' ? 'a woman' : settings.wear === 'm' ? 'a man' : 'a person';
  const pieces = outfitItems(outfit).map(describeItem);
  return [
    withPhoto
      ? `The first image shows me. Create a full-length photo of this same person (keep face, hair, skin tone and body shape) wearing the exact garments shown in the other images.`
      : `Create a full-length fashion photo of ${who} wearing the exact garments shown in the reference images.`,
    `The outfit: ${pieces.join('; ')}.`,
    `Keep each garment's true colour, pattern, fabric and shape. Head to toe, shoes visible, natural standing pose.`,
    `Setting: ${occasionName.toLowerCase()} mood, soft daylight, clean minimal background, editorial street-style photography, portrait orientation.`,
    `No text, no logos added, no extra garments.`,
  ].join('\n');
}

const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
const toBlob = (b64s, mime = 'image/png') => { const bin = atob(b64s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };

// downscale references to keep requests small
async function shrink(blob, max = 768) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
}

function findImage(node) {
  if (!node || typeof node !== 'object') return null;
  const inl = node.inlineData || node.inline_data;
  if (inl?.data) return { data: inl.data, mime: inl.mimeType || inl.mime_type || 'image/png' };
  if (typeof node.data === 'string' && node.data.length > 1000 && /image/.test(node.mime_type || node.mimeType || node.type || 'image')) return { data: node.data, mime: node.mime_type || node.mimeType || 'image/png' };
  if (typeof node.b64_json === 'string') return { data: node.b64_json, mime: 'image/png' };
  for (const v of Array.isArray(node) ? node : Object.values(node)) { const f = findImage(v); if (f) return f; }
  return null;
}

async function errText(r) {
  try { const j = await r.json(); return j.error?.message || JSON.stringify(j).slice(0, 300); } catch { return `HTTP ${r.status}`; }
}

export async function generateLookImage({ outfit, settings, occasionName, imageBlobs, personBlob }) {
  const ai = settings.ai || {};
  if (!ai.key) throw new Error('Add an API key in Profile → AI look preview first.');
  const provider = AI_PROVIDERS[ai.provider] ? ai.provider : 'gemini';
  const model = (ai.model || AI_PROVIDERS[provider].defaultModel).trim();
  const withPhoto = !!(ai.usePhoto && personBlob);
  const prompt = buildPrompt(outfit, settings, occasionName, withPhoto);
  const refs = await Promise.all([...(withPhoto ? [personBlob] : []), ...imageBlobs].map((b) => shrink(b)));

  if (provider === 'gemini') {
    const parts = [{ text: prompt }];
    for (const r of refs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: await b64(r) } });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.key },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '3:4' } } }),
    });
    if (!r.ok && (r.status === 404 || r.status === 400)) {
      // newer models may only be served through the Interactions API
      const input = [{ type: 'text', text: prompt }];
      for (const ref of refs) input.push({ type: 'image', mime_type: 'image/jpeg', data: await b64(ref) });
      const r2 = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.key },
        body: JSON.stringify({ model, input, response_format: { type: 'image', aspect_ratio: '3:4' } }),
      });
      if (r2.ok) r = r2; else throw new Error(`Gemini: ${await errText(r)}`);
    } else if (!r.ok) throw new Error(`Gemini: ${await errText(r)}`);
    const j = await r.json();
    const img = findImage(j);
    if (!img) throw new Error('Gemini returned no image. Try again, or try another model in settings.');
    return { blob: toBlob(img.data, img.mime), prompt };
  }

  // OpenAI
  let r;
  if (refs.length) {
    const fd = new FormData();
    fd.append('model', model); fd.append('prompt', prompt); fd.append('size', '1024x1536'); fd.append('n', '1');
    refs.forEach((b, i) => fd.append('image[]', new File([b], `ref${i}.jpg`, { type: 'image/jpeg' })));
    r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${ai.key}` }, body: fd });
  } else {
    r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: `Bearer ${ai.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: '1024x1536', n: 1 }),
    });
  }
  if (!r.ok) throw new Error(`OpenAI: ${await errText(r)}`);
  const j = await r.json();
  const img = findImage(j);
  if (!img) throw new Error('OpenAI returned no image.');
  return { blob: toBlob(img.data, img.mime), prompt };
}
