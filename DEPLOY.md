# Deploying farissuhail.com on GitHub Pages (free)

Static site (HTML/CSS/JS, no build step). Hosted on **GitHub Pages** — free, no
credit-pausing, and it keeps your **Squarespace DNS** so your Google Workspace
email (`tech@farissuhail.com`, `MX → smtp.google.com`) is never touched.

The contact form uses **Web3Forms** (host-agnostic) — see step 6.

> Upload the **contents of this `faris-website/` folder** to the repo root
> (index.html must be at the top level, not inside a subfolder).

Files already prepared for you:
- `CNAME` — holds `farissuhail.com` so GitHub keeps the custom domain.
- `.nojekyll` — serves files as-is (skips Jekyll processing).

---

## 1. Create the repo & upload the site
1. On GitHub: **New repository** → name it (e.g. `farissuhail-site`) → **Public** → Create.
2. On the repo page: **Add file → Upload files**.
3. Drag in **everything inside `faris-website/`** (index.html, the .css/.js files,
   `assets/`, `favicon.svg`, `CNAME`, `.nojekyll`, etc.) → **Commit changes**.

## 2. Turn on GitHub Pages
1. Repo → **Settings → Pages**.
2. **Source:** Deploy from a branch → **Branch:** `main` → **Folder:** `/ (root)` → Save.
3. First build takes ~1 min; it'll show a `https://<username>.github.io/...` URL.

## 3. Set the custom domain
1. Still in **Settings → Pages → Custom domain**, enter `farissuhail.com` → Save.
   (The `CNAME` file already does this, but entering it triggers GitHub's DNS check.)

## 4. Point Squarespace DNS at GitHub  (email stays safe — only A/CNAME for the site change)
In Squarespace: **Settings → Domains → farissuhail.com → DNS settings**.

**Remove** the current apex record:
- the existing `A  @ → 75.2.60.5` (the old Netlify pointer)

**Add** these (leave all MX / Google records exactly as they are):

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<username>.github.io` |

Optional (IPv6, nice to have):

| Type | Host | Value |
|------|------|-------|
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |

> Replace `<username>` with your GitHub username.

## 5. Enable HTTPS
Back in **Settings → Pages**, wait until "DNS check successful" (minutes to a couple
hours), then tick **Enforce HTTPS**. GitHub issues the certificate automatically.

## 6. Activate the contact form (Web3Forms)
1. Get a free access key at https://web3forms.com — register with `tech@farissuhail.com`.
2. In `index.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.
3. Commit. Submissions now email `tech@farissuhail.com`. (Until the key is set, the
   form falls back to opening the visitor's email client, so it never looks broken.)

## 7. After it's live: refresh the share cards
OG images use absolute URLs (`https://farissuhail.com/assets/og-*.png`), so previews
appear once live. Force a re-scrape:
- Facebook/WhatsApp: https://developers.facebook.com/tools/debug/ → URL → **Scrape Again**
- LinkedIn: https://www.linkedin.com/post-inspector/

Pages with cards: `/` (og-home.png), `/reflections.html`, `/al-baqarah.html`.

---

## Updating the site later
Edit files in the repo (web UI or `git push`) → GitHub Pages redeploys automatically.

## Updating OG cards
From the repo root that contains `make_og.py` (needs Python + Pillow):
```
python make_og.py
```
Then re-upload the changed PNGs in `assets/`.

## Note / limitation
GitHub Pages doesn't support custom HTTP headers (no caching/security-header config).
That's fine for this site; revisit only if you later need CSP or fine-grained caching.
