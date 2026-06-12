# Faris Suhail · Mobile App Developer — Website

Static marketing site for **farissuhail.com**. Vanilla HTML/CSS/JS, no build step, deployed by drag-and-drop to Netlify.

---

## TL;DR for the developer

```bash
# 1. Run locally (any static server works)
python -m http.server 8000
# then open http://localhost:8000

# 2. Deploy to production
# Drag the entire faris-website/ folder onto:
#   https://app.netlify.com/projects/wondrous-daifuku-936d85/deploys
```

That's the entire workflow. No npm, no webpack, no build. Edit a file → drop the folder onto Netlify → live in ~20 seconds.

---

## Tech stack

| Layer | What | Why |
|---|---|---|
| Markup | Hand-written HTML5 | No framework lock-in, ~95KB total |
| Styles | Vanilla CSS with custom properties | Easy to read/edit, no preprocessor |
| Interactivity | Vanilla JS (no jQuery, no React) | Tiny — just lang toggle + form submit + reveal-on-scroll |
| Fonts | Google Fonts — Inter, JetBrains Mono, Cormorant Garamond | Loaded via `<link>` in `<head>` |
| Hosting | Netlify (drag-and-drop deploys, free tier) | Auto HTTPS, CDN, free forms |
| Domain | farissuhail.com — registered at Squarespace | Manage at https://account.squarespace.com |
| Email | Google Workspace — `tech@farissuhail.com` | Active Workspace subscription |
| Form | Netlify Forms (no backend) | See `<form data-netlify="true">` in index.html |

**No build pipeline. No package.json. No node_modules.** Just files served as-is.

---

## File structure

```
faris-website/
├── index.html             # Homepage — main marketing page
├── al-baqarah.html        # Quran reflection subpage (green accent theme)
├── reflections.html       # ⚠ NOT YET CREATED — referenced as "All reflections" link
├── style.css              # Main stylesheet (used by both pages)
├── al-baqarah.css         # Page-specific styles for reflection (overrides --accent to green)
├── script.js              # JS: language toggle, form submit, scroll reveal
├── favicon.svg            # Browser tab icon (orange "FS")
├── README.md              # This file
└── assets/
    ├── work-pomengo-hero.jpg     # PomenGo marketing banner (wide featured card)
    ├── work-taska2u.jpg          # Taska2U mobile screens
    ├── work-tekong.jpg           # TEKONG marine app screens
    ├── work-pomengo-mobile.jpg   # PomenGo mobile screens
    ├── work-amazingg.jpg         # Amazing G repair-cost summary
    └── og-al-baqarah.png         # ⚠ NOT YET CREATED — OG image referenced in al-baqarah.html
```

**Missing files referenced in code:**
- `reflections.html` — referenced from `al-baqarah.html` (back button "← All reflections"). Either create an index page for reflections, or change that link back to `index.html`.
- `assets/og-al-baqarah.png` — referenced in Open Graph meta tags on `al-baqarah.html` for social sharing previews. Needs to be a 1200×630 image. Until created, WhatsApp/LinkedIn previews will show no image.

---

## Page anatomy

### `index.html` — Homepage sections (in scroll order)

1. **Nav** — `FARISSUHAIL` wordmark, nav links, EN/BM language toggle, "Get a quote" CTA
2. **Hero** — headline + subtitle + animated phone mockup with fake SME app dashboard
3. **Marquee** — scrolling tech stack tags (`iOS`, `Android`, `React Native`, etc.)
4. **`#services`** — 4 standard service cards + 1 wide "Quran sharing, ayahlysis & collab" card
5. **`#work`** — Wide featured PomenGo card + 2×2 grid of 4 standard project cards
6. **`#pricing`** — Starter (RM 8k) / Standard (RM 18k, popular) / Pro (RM 35k)
7. **`#process`** — 4-step "Idea → Design → Build → Launch" timeline
8. **`#why`** — 3 differentiator cards (direct, SME-focused, fixed quote)
9. **Use cases** — 6 industry chips (restaurants, salons, retail, etc.)
10. **FAQ** — 6 expandable Q&A items
11. **`#contact`** — Netlify Form with name/email/business/message fields
12. **Footer** — brand, services links, contact, Reflections link (Al-Baqarah)

### `al-baqarah.html` — Quran reflection subpage

- 25-section scroll narrative based on a PowerPoint deck about Surah Al-Baqarah
- Uses `al-baqarah.css` which **overrides `--accent` to neon green** (`#00ff85`) on this page only — keeps the portfolio orange separate from the dakwah identity
- Open Graph + Twitter card meta tags included for social sharing
- Back-button currently points to `reflections.html` (which doesn't exist yet)

---

## Bilingual content (EN ⇄ BM)

The site has a language toggle that swaps every translatable element. Pattern:

```html
<span data-en="Get a quote" data-bm="Dapatkan sebut harga">Get a quote</span>
```

`script.js` toggles between English and Bahasa Malaysia by reading the `data-en` and `data-bm` attributes and updating `textContent`.

**Rules:**
- Every user-visible text element must have both `data-en` AND `data-bm` attributes
- The initial content inside the tag should match `data-en` (so non-JS users see English)
- For mixed content (text + inline link), wrap each piece in its own `<span>` with `data-en`/`data-bm` — `textContent` replacement wipes child nodes

**To translate new content**, add both attributes:

```html
<h3 data-en="New section title" data-bm="Tajuk bahagian baharu">New section title</h3>
```

---

## Theming — CSS variables

`style.css` defines these at `:root`:

```css
--accent: #ff5e3a            /* Orange — main brand */
--accent-2: #ffb84d           /* Gold — gradient end */
--accent-grad: linear-gradient(135deg, #ff5e3a 0%, #ffb84d 100%);
--bg: #0a0a0f                /* Page background */
--surface: #16161f            /* Card background */
--text: #f1f1f5              /* Primary text */
--text-dim: #a4a4b5          /* Secondary text */
--text-mute: #6e6e80         /* Tertiary text */
--border: rgba(255,255,255,0.08)
--radius: 18px
--maxw: 1240px               /* Max content width */
```

**`al-baqarah.css` overrides `--accent` / `--accent-2` to green** for that page only. If you want to change the brand colors site-wide, edit `style.css`. If you want to change just the reflection page, edit `al-baqarah.css`.

---

## Common edits — quick reference

### Change the email address
Search across all files for `tech@farissuhail.com` (case-sensitive). Currently appears in:
- `index.html` (3 places: contact form mailto, footer link, footer text)
- `script.js` (4 places: mailto fallback, success/error messages)

### Update pricing
`index.html` → `<section id="pricing">` → three `<article class="price-card">` blocks. Edit `.price-value`, `.price-timeline`, and `.price-features` `<li>` items. Bilingual — update both `data-en` and `data-bm`.

### Add a new project to "Apps I've shipped"
`index.html` → `<section id="work">` → copy an existing `<article class="work-card">` and:
1. Update `<img src>` to point to a new file in `assets/`
2. Update `data-cover` attribute for the gradient fallback (`pomengo`, `taska`, `tekong`, etc.)
3. Update `<h3>`, `<p>`, `.work-tags`, and `.work-cover-corner` text (in both languages)
4. Wide featured card has `class="work-card-wide"` — only use one of these per grid

### Change a phone-mockup detail in the hero
`index.html` → `.phone-screen` div. Inner content is hand-coded HTML/CSS — no real data.

### Update the "Available May 2026" badge
`index.html` → search for `Available for new projects` — appears in the `.hero-tag` element.

### Add a new bilingual page like al-baqarah
1. Duplicate `al-baqarah.html` and `al-baqarah.css`
2. Update the `<head>` meta tags + Open Graph URL/image
3. Change `--accent` in the new CSS if you want a different theme color
4. Link to the new page from `index.html` footer under "Reflections"

---

## Forms — Netlify Forms (no backend)

The contact form uses Netlify's built-in form handler. **How it works:**

1. The `<form>` has `data-netlify="true"` and a hidden `<input name="form-name">`
2. On deploy, Netlify scans the HTML and detects the form
3. Submissions appear in Netlify dashboard → Forms tab
4. Email notifications can be configured at: Netlify → site → Forms → contact → Settings & usage → Form notifications

**Important:** if you change the `name` attribute on the `<form>`, also update the hidden `form-name` input value to match, otherwise Netlify won't accept the submission.

**Form submission flow** (in `script.js`):
- On `farissuhail.com` (production): submits via `fetch()` to Netlify's collector, shows in-page success
- On any other host (local dev, staging): falls back to opening the user's mail client via `mailto:`

To switch to a different form provider (Formspree, Web3Forms, etc.):
- Remove `data-netlify="true"` and the hidden `form-name` input
- Change the `<form action="...">` to the provider URL
- In `script.js`, set `isNetlify = false` to disable the AJAX submit

---

## Deploy workflow

### Manual (recommended — drag and drop)
1. Make edits locally, test by opening `index.html` in a browser
2. Open Netlify dashboard: https://app.netlify.com/projects/wondrous-daifuku-936d85
3. Scroll to **Production deploys**
4. Drag the entire `faris-website` folder onto the drop zone
5. Wait ~20s, status changes from *Building* → *Published*
6. Live at `https://farissuhail.com` (hard-refresh with Ctrl+F5 to clear cache)

### Via Netlify CLI (alternative, if you prefer scripting)
```bash
npm install -g netlify-cli
netlify login
netlify link               # link this folder to the existing project
netlify deploy --prod --dir=.
```

### Via GitHub (recommended for ongoing work)
For a more conventional workflow, push this folder to a GitHub repo and connect it to the Netlify project. Then `git push` triggers auto-deploy. That's outside the current setup but worth migrating to if there will be a lot of changes.

---

## Domain & email infrastructure

| Service | Provider | Where to manage |
|---|---|---|
| Domain `farissuhail.com` | Squarespace (registrar) | https://account.squarespace.com/domains/managed/farissuhail.com |
| DNS | Squarespace (custom records) | Same as above → DNS settings |
| Hosting | Netlify | https://app.netlify.com |
| Email `tech@farissuhail.com` | Google Workspace | https://admin.google.com |
| SSL | Let's Encrypt (auto-renewed by Netlify) | Nothing to manage |

### Current DNS records (do not break these)
- **A** `@` → `75.2.60.5` (points apex to Netlify)
- **CNAME** `www` → `wondrous-daifuku-936d85.netlify.app` (points www to Netlify)
- **MX** `@` → `smtp.google.com` priority 1 (Google Workspace email)
- **TXT** `google._domainkey` → DKIM (Google Workspace)
- **TXT** `@` → `v=spf1 include:_spf.google.com ~all` (SPF)

If you point this domain elsewhere, **keep the MX and TXT records** or email will break.

---

## Known TODOs / nice-to-haves

1. **Create `reflections.html`** — index page listing all reflections, referenced from `al-baqarah.html` back button.
2. **Create `assets/og-al-baqarah.png`** — 1200×630 social share image for the Al-Baqarah page (LinkedIn/WhatsApp previews currently show no image).
3. **Add an About + photo section** to homepage — backs up the "direct & personal" pitch.
4. **Migrate to Git/GitHub** — current workflow is drag-and-drop; a repo would enable version history and PR review.
5. **Add analytics** — Plausible or Cloudflare Analytics (privacy-friendly, easy install).
6. **Update the "Available May 2026" badge** before it goes stale.

---

## Contact for this codebase

- **Owner:** Faris Suhail (`tech@farissuhail.com`)
- **Live URL:** https://farissuhail.com
- **Netlify project:** `wondrous-daifuku-936d85`

When making changes, please:
- Keep the bilingual (EN/BM) attribute pattern
- Don't break the data-netlify form attributes
- Preserve the green accent on `al-baqarah.html` (it's intentional brand separation)
- Hard-refresh after every deploy (Ctrl+F5) to see changes — Netlify edge cache can be aggressive
