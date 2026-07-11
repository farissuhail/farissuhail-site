# Analitika Malaya — Landing Page

A self-contained, single-file marketing landing page for **Analitika Malaya**, a narrative-intelligence platform concept. It is distinct from the interactive dashboard mockup (`analitika.html`) — this page *pitches* the product and links out to the dashboard as a live sample.

- **File:** [`analitika-malaya.html`](analitika-malaya.html)
- **Live path (once deployed):** `https://farissuhail.com/analitika-malaya.html`
- **Stack:** Plain HTML + inline CSS + inline vanilla JS. No build step, no dependencies except Google Fonts. Does **not** use the shared `style.css`.

---

## What's on the page

A dark, high-tech, cinematic single page. Sections top to bottom:

| # | Section | Notes |
|---|---------|-------|
| — | **Nav** | Glass sticky bar: brand, section links, language toggle, "Request access" CTA. |
| — | **Hero** | Full-bleed animated cosmic data-network canvas + headline + world-clock HUD + "Data music" toggle. |
| — | **Ticker** | Scrolling marquee of signal categories. |
| 01 | **Thesis** | Short essay on the information environment, with a pull-quote. |
| 02 | **Method** | The three-tier framework: **Strategik → Taktikal → Operasi** (mouse-reactive 3D tilt cards). |
| 03 | **Signal** | Capabilities: Sentiment · Narratives · SHIELD · Geography. |
| 04 | **Charter** | The four non-negotiable ethics principles (see below). |
| 05 | **Sample** | Animated sentiment bars → links to the full `analitika.html` dashboard. |
| — | **Access** | Request-access lead form (Web3Forms). |
| — | **Footer** | Colophon + links. |

---

## The hero: animated cosmic data-network

The centerpiece is a full-viewport `<canvas>` rendering a living constellation of data — built to match a supplied reference image (neon nodes and flowing links in deep space).

- **3D node cloud** — ~80 nodes (46 on mobile) in 5 clusters with a deep z-spread, drawn with perspective projection.
- **Orbit camera** — the scene auto-spins slowly; **drag anywhere on the hero to orbit** the constellation (mouse or touch, with flick inertia). Mouse movement adds parallax on top. A small "⟲ drag to orbit" hint fades out after the first drag; vertical touch scrolling is preserved (`touch-action: pan-y`).
- **Depth cues** — depth fog (far geometry recedes into the dark and cools toward deep blue) and a soft depth-of-field (off-focus nodes get bigger, dimmer halos).
- **Perspective grid floor** — a faint cyan grid plane beneath the constellation, rotating with the scene.
- **Hub HUD** — the six highest-degree nodes (4 on mobile) get rotating dashed HUD rings, two satellites orbiting in true 3D, and live mono telemetry labels (`NX-xx · 61.4`).
- **Harmonic motion** — each node drifts on sine oscillators whose frequencies are tuned to **musical ratios** (0.5, 0.667, 0.75, 1, 1.25, 1.5), so the whole field moves together rather than randomly.
- **Fluid links** — 2–3 nearest-neighbour connections per node, drawn as curved bézier lines whose control points oscillate (they flow like strings). Light **pulses with comet trails** glide along the same curves.
- **Deep space** — drifting nebula gradients, 210 twinkling stars, faint rotating galaxies.
- **Beat driver** — an 84-BPM pulse flares groups of nodes, emits expanding ripples, and makes the wires touching a flaring node **surge bright** for a moment.
- **Palette** — cyan + magenta dominant, with blue / purple / orange / white accents.

The animation **always runs** (it is not disabled under `prefers-reduced-motion` — motion is the point of this hero).

### World-clock HUD
Four corners show live, timezone-accurate clocks, matching the reference image:

| Corner | Clocks |
|--------|--------|
| Top-left | UTC · LND (London) |
| Top-right | SF (Los Angeles) · TYO (Tokyo) |
| Bottom-left | NYC (New York) |
| Bottom-right | MOS (Moscow) |

Powered by `Intl.DateTimeFormat` + `setInterval(1s)`.

### "Data music" (generative audio)
A **Data music ♪** toggle in the hero starts an optional generative WebAudio soundscape:

- A soft, detuned sine **ambient pad** chord.
- On every beat, a **C-major-pentatonic** note is triggered in sync with the node flares — the network literally plays itself, harmoniously.

It is **click-gated** (never autoplays — browser policy and good manners) and the button shows animated EQ bars when active.

---

## Bilingual (EN / BM)

Fully bilingual English / Bahasa Melayu. Every visible string exists as paired `.en` / `.bm` elements toggled by `body[data-lang]`. The choice is stored in `localStorage` under the shared **`fs-lang`** key, so it stays consistent with the rest of `farissuhail.com`.

---

## The Charter (the real product stance)

These four principles are shown on the page and are the core of the product's positioning — keep them intact:

1. **Public posts only** — analyses what is already public; no private messages, no scraped accounts.
2. **Aggregate, not individual** — patterns and populations, never profiles of named people; no PII stored.
3. **SHIELD detects, never deploys** — coordination detection exposes manipulation; it cannot run it.
4. **One tool, every party** — the same instrument is offered to all sides; non-partisan by design.

---

## Configuration & customization

| What | Where | Notes |
|------|-------|-------|
| **Web3Forms key** | `<input name="access_key" value="YOUR_WEB3FORMS_KEY">` | ⚠️ Still a **placeholder**. Until set, the form falls back to a `mailto:` to `faris.suhail@yahoo.com`. |
| Form subject | `<input name="subject">` | `[Analitika Malaya] Access request` |
| Node count / motion | JS `NN`, node `ax/ay/az` (amplitude), `fx/fy/fz` (frequency) | Tune drift speed / density. |
| Orbit camera | JS `rotY/rotX` (start angles), `0.05*dt` (auto-spin rate), drag sensitivity `0.0042` / `0.0026` | `rotX` is clamped to [-0.6, 0.42]. |
| Depth fog / DOF | JS `fogOf()` and the `dof` term in the node loop | Focal plane sits at `z ≈ 0.55`. |
| Grid floor | JS `gy` (height), `ge` (extent), `gs` (spacing) | Lines with `z ≥ 2.2` are culled (behind camera). |
| Hub HUD | JS `HN` (hub count), `HUBS[].orb` (satellite radius/speed/tilt) | Hubs = highest-degree nodes. |
| Tempo | JS `BPM = 84` | Beat rate for flares + music notes. |
| Music scale | JS `SCALE` array (MIDI notes) | Currently C major pentatonic, 2 octaves. |
| Palette | JS `PAL` + `PW` (weight) | `PW` biases which colours appear more often. |
| World clocks | `.hud-clocks [data-tz]` markup | `data-tz` = IANA timezone, `data-lab` = short label. |
| Fonts | `<link>` in `<head>` | Space Grotesk (display), Inter (body), JetBrains Mono (labels). |

---

## Status & open items

- [ ] **Set the real Web3Forms `access_key`** (currently placeholder → mailto fallback).
- [ ] **Wire into site nav/footers** (index, reflections, kalam, etc.) if this should be discoverable.
- [ ] **OG / social card** (no `og:image` yet — consider generating one).
- [ ] **Commit & deploy** to GitHub Pages.
- [ ] Optional: pause/play control to respect `prefers-reduced-motion` for accessibility.

---

## Accessibility & performance notes

- The hero animation is intentionally always-on. If accessibility for motion-sensitive users becomes a priority, add a pause toggle (defaults to gentle motion, user can stop).
- The canvas repaints on resize even when idle, so it never goes blank.
- All animation uses `requestAnimationFrame`; audio uses the Web Audio API (feature-detected, wrapped in `try/catch`).

---

*A project by Faris Suhail. All dashboard figures on the linked sample are illustrative/sample data.*
