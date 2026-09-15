# 5710 McCommas Blvd #101 — Single-Property Website

Production site for **5710 McCommas Blvd, Unit 101, Dallas, TX 75206** (MLS 21312626),
listed by **Mysti Stewart**, Mysti Stewart Group, Compass RE Texas, LLC.

Static HTML/CSS/JS with one Netlify serverless function for the AI concierge.
No framework, no build step, no runtime dependencies.

---

## Layout

```
public/                     ← the deploy root (Netlify `publish`)
  index.html                single page, all sections
  404.html
  favicon.svg  robots.txt  sitemap.xml
  assets/css/styles.css
  assets/js/main.js         nav, gallery, lightbox, tax estimator, map, form, analytics
  assets/js/concierge.js    chat widget front-end
  assets/img/hero/          hero at 900 / 1400 / 2048 w, WebP + JPEG
  assets/img/gallery/       29 photos, 1800w full + 800w thumb, WebP + JPEG
  assets/img/og-card.jpg    1200 × 630 social card
netlify/functions/
  concierge.mjs             Anthropic Messages API proxy + knowledge base
data/property.json          verified facts, source of truth — NOT deployed
netlify.toml                publish/functions/headers config
```

`data/` sits outside `public/`, so internal working notes are never served.

---

## Local development

```bash
cd public && python3 -m http.server 8899        # static only; concierge shows its fallback
# or, with functions:
npx netlify-cli dev
```

---

## Deploy

1. Connect this repo to Netlify. `netlify.toml` supplies everything:
   publish `public`, no build command, functions in `netlify/functions`.
2. Set the environment variable **`ANTHROPIC_API_KEY`** (Site configuration →
   Environment variables), then redeploy — env vars do not reach a site that is
   already built. Without it the concierge returns HTTP 503 and the widget shows
   its "call Mysti" fallback; the rest of the page is unaffected.
   Optional: `CONCIERGE_MODEL` to change the model without editing code.
3. The contact form uses **Netlify Forms** (`name="showing-request"`). It is
   detected automatically at deploy. Add notification recipients under
   Forms → Settings → Form notifications.

### Required before launch

> The production-domain reminder used to live as an HTML comment in `index.html`.
> It was removed so nothing internal ships in the page source — it lives here now.


Search and replace the placeholder domain `5710-mccommas-blvd-101.netlify.app`
with the real production domain in:

- `public/index.html` — canonical link, all `og:`/`twitter:` tags, and the four
  `@id`/`url`/`image` fields in the JSON-LD block
- `public/robots.txt` — the `Sitemap:` line
- `public/sitemap.xml` — the `<loc>` value

```bash
grep -rn '5710-mccommas-blvd-101.netlify.app' public/
```

---

## Analytics

No measurement IDs were supplied for this property, so **nothing is loaded and no
events are sent**. The event layer is built and wired; it activates the moment IDs
are added at the top of `public/assets/js/main.js`:

```js
var ANALYTICS = { ga4: '', googleAds: '', adsLabels: {}, metaPixel: '' };
```

Never paste in another property's IDs. Events already instrumented:
`cta_showing`, `cta_ask`, `cta_gallery`, `contact_call`, `contact_email`,
`gallery_open`, `gallery_filter`,
`tax_estimator_used`, `map_viewed`, `map_open_external`, `ai_open`, `ai_question`, `ai_answer`,
`ai_error`, `form_submit_attempt`, `form_submit_success`, `form_submit_error`.

All fire on real visitor actions. Nothing fires on page load. Add Google Ads
conversion labels to `adsLabels` keyed by event name.

---

## AI concierge

`POST /.netlify/functions/concierge` → `{ answer }`
`GET  /.netlify/functions/concierge` → health check

### If the concierge isn't answering

Open `https://<your-site>/.netlify/functions/concierge` in a browser. The GET
health check tells you the state of the deploy without exposing the key:

| Response | Meaning | Fix |
|---|---|---|
| `{"ok":true,...}` | Function deployed, key set | Ask a question and read the `code` in the console |
| `{"ok":false,"apiKeyConfigured":false}` | Function deployed, **no key** | Set `ANTHROPIC_API_KEY` in Netlify → Site configuration → Environment variables, then **redeploy** |
| `{"ok":false,"apiKeyLooksValid":false}` | A value is set but it isn't an Anthropic key | Create one at console.anthropic.com → Settings → API keys. A Claude Pro/Max subscription does **not** include API access |
| `"apiKeyHadQuotesOrWhitespace":true` | Key works but was pasted with quotes/newline | Stripped automatically; tidy the stored value anyway |
| A 404 HTML page | Functions were not deployed | Check `netlify.toml` is at the repo root and the deploy log shows the function bundling |

Ask a question with the browser console open (F12). Every failure logs
`[concierge] request failed — <code>: <detail>`, and setup problems also print
on the page itself. Codes: `not_configured`, `bad_api_key`, `model_unavailable`,
`malformed_key`, `key_forbidden`, `no_credit`, `not_deployed`,
`bad_request_upstream`, `upstream_rate_limited`, `refusal`, `empty_response`,
`network_error`, `timeout`.

Setting an env var in Netlify does **not** apply to the running site until you
redeploy (Deploys → Trigger deploy → Clear cache and deploy site).

### Details

The API key stays server-side. The knowledge base is a curated extract of the
MLS and DCAD records, organised by document class inside the function — not a raw
text dump. It deliberately excludes owner identity, keybox details, private agent
remarks and the agent-only showing line.

Model: `claude-opus-5` (override per-deploy with `CONCIERGE_MODEL` — `claude-sonnet-5`
is a cheaper option), `max_tokens` 4000, `output_config.effort: low`, last 8 turns
of history.

**Do not add `temperature`, `top_p` or `top_k`.** Sampling parameters were removed
on the Claude 5 family and return a 400 — sending `temperature` is what broke every
request on the first deploy. Thinking is adaptive and on by default, and thinking
tokens count toward `max_tokens`, which is why the cap is 4000 rather than a few
hundred. If the account rejects `output_config`, the function retries once with a
minimal body so visitors still get an answer.
Guardrails: answer only from the record, qualify material facts, flag MLS/DCAD
conflicts, never guarantee taxes or school attendance, never claim an unlisted
amenity, fair-housing and privacy rules.

---

## Cache busting

`tools/stamp-assets.mjs` appends an 8-character content hash to every
`/assets/css/*` and `/assets/js/*` reference in the HTML. Netlify runs it on
every deploy (`command` in `netlify.toml`), so a changed stylesheet gets a new
URL and a returning visitor never sees fresh HTML paired with a stale
stylesheet. Unchanged files keep their hash and stay cached.

It has no dependencies and is safe to run by hand: `node tools/stamp-assets.mjs`.

**Images are still cached for a year and are not stamped.** If you replace a
photo, give the new file a different name, or the old one will keep serving.

## Map

The map is embedded directly and carries `loading="lazy"`, so it appears without a
click but costs nothing until the reader nears the Location section. It uses Google's
keyless `maps?q=...&output=embed` endpoint, which is unofficial — an "Open in Google
Maps" link sits beneath it so the section still works if that endpoint ever changes.
To move to the supported Maps Embed API, swap the iframe `src` for
`https://www.google.com/maps/embed/v1/place?key=<KEY>&q=<address>`.

## Editing content

| What | Where |
|---|---|
| Any verified property fact | `data/property.json`, then mirror into the page and the function KB |
| Feature highlights (8) | `HIGHLIGHTS` in `public/assets/js/main.js` |
| Gallery photos, order, captions, categories | `PHOTOS` and `CATS` in `public/assets/js/main.js` |
| Neighborhood destinations | `PLACES` in `public/assets/js/main.js` |
| Property detail tables, costs, schools, disclaimers | `public/index.html` |
| Agent card (photo, name, licence, brokerage) | `.agent` block in `public/index.html` |
| Concierge knowledge | `KB` in `netlify/functions/concierge.mjs` |

`data/property.json` is the reference record. It is not read at runtime, so any
fact change must be applied in the page and the function KB as well.

---

## Brand mark

The parallelogram from the Mysti Stewart Group logo is inlined as an SVG
polygon (`.mark`) in the nav and the footer, and used alone in `favicon.svg`.
It was traced from the supplied artwork and matches it to 0.24px mean edge
error; `viewBox="0 0 52 204"`, points `52,0 52,179 0,204 0,25`. Because it is
inline it costs no extra request and takes its colour from CSS, so it can be
recoloured per surface. A standalone copy sits at
`public/assets/img/logo/mark.svg`.

The wordmark is set in the site's own label type rather than as an image, so
it stays crisp and selectable. Original artwork and a transparent-background
PNG of the full lockup are archived in `assets-source/`.

## Brand

| Token | Value |
|---|---|
| Primary brand (decorative only) | `#a4b7a2` sage — 2.13:1, never used for text |
| Sage as text | `#60785d` — 4.84:1 on white |
| Property accent | `#245d61` deep teal — 7.46:1 on white |
| Ink / soft / faint | `#16191a` / `#4f5754` / `#6a7370` |
| Display font | Averta PE → Avenir Next → system sans |
| Body font | Minion Pro → Iowan Old Style → Palatino → Georgia |

Averta PE and Minion Pro are licensed fonts and are **not** bundled. The stack
names them first, so adding the licensed webfonts via `@font-face` makes them take
effect with no other change. Until then the fallbacks render.

---

## Verified against

- NTREIS MLS #21312626, Agent Full report, prepared 09/14/2026
- Dallas Central Appraisal District, account #00C27110000300101, retrieved 04/28/2026

Every tax figure reconciles: $490,000 × 2.22671% = $10,910.88, matching both the
DCAD total and the MLS unexempt figure, and the five jurisdiction amounts sum to
the same number.
