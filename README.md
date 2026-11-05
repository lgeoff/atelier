# Atelier

Outfits from the clothes you already own. A mobile web app: photograph your wardrobe, take a short style and colour quiz, then get head-to-toe outfits for any occasion, scored for your style, your colour season, the weather and the Autumn/Winter 2026 trends.

Everything runs in the browser. There is no server and no account.

## Deploy on GitHub Pages

1. Create a new repository on GitHub, for example `atelier`.
2. Upload every file and folder in this directory to the repository root (keep `.nojekyll`).
   With git:
   ```bash
   git init && git add . && git commit -m "Atelier"
   git branch -M main
   git remote add origin https://github.com/<you>/atelier.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`** → Save.
4. After a minute the app is live at `https://<you>.github.io/atelier/`.
5. On your phone, open that address and use **Add to Home Screen** (Safari share menu, or Chrome menu). It then opens full screen and works offline.

To try it locally: `python3 -m http.server` in this folder, then open `http://localhost:8000`.

## Where your data lives

| What | Where |
|---|---|
| Settings, quiz answers, palette, API key | `localStorage` |
| Photos (shrunk to 900 px JPEG), pieces, looks, AI pictures | IndexedDB, the browser's built-in local database |

Photos go in IndexedDB rather than `localStorage` because `localStorage` is capped at about 5 MB, roughly 20 photos. Both stay on the device.

Data belongs to one browser on one device. Use **Palette & me → Export backup** to move it or keep a copy (the API key is left out of backups). On iPhone, Safari may clear site data for sites you haven't opened in weeks; adding the app to the Home Screen avoids that.

## Adding clothes

- **Take a photo / Choose photos**: works everywhere.
- **Import a whole folder**: copies every image in a folder (desktop browsers and most Android browsers).
- **Link a folder** (Chrome and Edge on desktop): keeps your originals in place. Atelier reads the folder and picks up new photos when you tap "Check linked folder". Browsers do not allow a web page to read files by path, so this is the closest thing to referencing local files.

Tips: one piece per photo, flat or on a hanger, against a plain background, in daylight. The app ignores the background when it reads the colour; tap a swatch to correct it.

## AI look preview (optional)

Only runs when you tap **Picture it with AI**. Add your own key in **Palette & me**:

- Google Gemini: key from aistudio.google.com/apikey. Default model `gemini-2.5-flash-image`; newer ones can be typed in the Model field.
- OpenAI: key from platform.openai.com/api-keys. Default model `gpt-image-1`.

The photos of the chosen pieces (and, if you turn it on, a full-length photo of you) go directly from your browser to that provider. Model names change often; if one is retired, pick another in the Model field.

## How outfits are chosen

`js/engine.js` samples about 1,400 combinations from your wardrobe and scores each one:

- **Occasion**: every piece has a formality from 1 (lounge) to 5 (formal); each occasion has a target range. Evening pieces are penalised by day.
- **Weather**: pieces have a warmth from 0 to 5; the total must match the temperature. Dresses and skirts below 15 °C assume tights. Rain favours rain-proof coats and avoids suede.
- **Colour**: tonal and monochrome looks, one accent on neutrals, neighbouring colours, complementary contrast and colour blocking are scored according to your style and how bold you want to be. Pieces worn near the face are checked against your colour season.
- **Prints and texture**: one print is a focal point; three is too many. Mixed textures (velvet, suede, leather, lace) earn an AW26 bonus.
- **Style**: each style favours certain garment types, fabrics and prints.
- **Rotation**: pieces worn in the last few days are pushed back; unworn pieces get a nudge.

The six best looks that differ enough from one another are shown. Tap any piece to swap it.

Trend and palette data live in `js/data.js` and can be edited.

## Files

```
index.html            app shell
styles.css            design system
sw.js                 offline cache
manifest.webmanifest  install as an app
js/app.js             interface
js/engine.js          outfit scoring
js/data.js            garments, styles, occasions, 12 colour seasons, AW26 trends
js/color.js           colour maths and colour reading from photos
js/ai.js              optional AI picture
js/samples.js         illustrated sample wardrobe
js/db.js              local storage
```
