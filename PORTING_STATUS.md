# Porting status — case-study pages

Handoff snapshot of the Figma → Astro case-study porting effort. Read this + `PORTING_GUIDE.md`
to resume. Branch: **`port/case-studies`**.

Figma source: `TQPwqmhFIz7SlJjVHpnxjM` (https://www.figma.com/design/TQPwqmhFIz7SlJjVHpnxjM/Untitled)

---

## Where things stand

All four case studies are ported to a shared standard and building clean (`npm run build`, 8 pages).
Talaris is intentionally a placeholder.

| Project | Route | Theme / accent | Status |
|---|---|---|---|
| Grab | `/work/grab` | dark · `#e07856` orange | Ported + re-ported to current Figma |
| Chlo' | `/work/chlo` | light · `#6c6ac4` periwinkle | Ported + refined |
| Logitech Mind | `/work/mind` | light · `#8a73e0` purple | Rebuilt (hero, priority, journey map) |
| Product Photography | `/work/product-photography` | dark · `#e5322d` red | Re-ported (hero + closing) |
| Talaris | `/work/talaris` | — | **Under construction** placeholder + "Soon" badge |

---

## Stack & run

- **Astro 5** static site, `@astrojs/mdx`, `sharp` (build-time image optim → WebP/AVIF).
  Deploys to Cloudflare Pages (`ismatteo.com`).
- `npm run dev` → http://localhost:4321/ · `npm run build` → `dist/`.
- **Gotcha:** the Astro dev server caches processed images. After swapping an image
  asset, if the old one still shows, **restart the dev server + clear caches**:
  `rm -rf node_modules/.vite .astro/data-store.json dist` then `npm run dev`, and hard-refresh
  (Ctrl+Shift+R). This bit us twice — it's a cache issue, not a code issue.

---

## The standard (see `PORTING_GUIDE.md` for the full spec)

- **One `.mdx` per project** in `src/content/projects/` (frontmatter + one-line import of a
  bespoke `*CaseStudy.astro` in `src/components/casestudy/`).
- **Typography:** DM Sans only (Inter + JetBrains Mono removed). Weights 200/300 body,
  700–900 display, 500 eyebrow.
- **Per-project accent** via frontmatter (`accent`, `accentText`) → `--accent` on the case
  shell in `src/pages/work/[slug].astro`.
- **Shared tokens** in `src/styles/global.css`: `--fs-hero/display/h3/body/small`,
  `--case-max/pad/gap`, `--radius-*`.
- **Shared components:** `CaseScrollIndicator.astro` (accent scroll bar, on every project page)
  and `CaseVideo.astro` (lazy, muted, looping video). Retired generic blocks
  (Section/Quote/Findings/Figure/TwoUp) were deleted.
- **No footer** anywhere; **no next-project** footer. Native scrollbar hidden on case pages
  (custom indicator only).
- **Copy** is verbatim from the deck — typos/Italian fixed only.

---

## Per-project notes

### Grab (`GrabCaseStudy.astro`) — reference template
- Re-ported to current Figma `85:1237`: added "What is Grab?", swapped video/gesture row
  order, restructured pipeline into a 2×2 stage-card grid + "Real time pipeline" heading.
- Hand glyphs are **SVG** (`icon-open-palm.svg`, `icon-grab.svg`, `dot.svg`) — crisp at any size.
- Third demo glyph is a **white hand-pointer cursor** (`cursor.svg`). ⚠️ **Recreated** — the
  Figma node `116:1294` still reads as the old orange arrow on the MCP, so if a pixel-exact
  match matters, replace `src/assets/grab/cursor.svg` with the real export.
- Video: `public/media/grab.mp4` (compressed 47 MB → 16.5 MB).

### Chlo' (`ChloCaseStudy.astro`)
- Accent corrected to periwinkle `#6c6ac4` (first attempt `#2b6cab` was wrong — sampled the
  pool photo). ⚠️ **Confirm the exact hex** against Figma if it still looks slightly off.
- Page background is off-white `#e9e9f1` **on purpose** — it matches the baked background of
  the exported figure/render images so they blend (no grey-box seam). This is why Chlo's
  images "have a background colour" — it's intentional.
- Section spacing tightened (`gap: clamp(2.5rem,5vw,5rem)`).
- The exploded/callout render diagrams are **flat exported PNGs** (leader lines baked in),
  capped in width so they fit one screen. Two of them (LEDs pod, material-thickness assembly)
  have a **soft contact shadow composited in** so the objects don't float.
- Frontmatter year/role/tools were read from the deck — verify accuracy.

### Logitech Mind (`MindCaseStudy.astro`) — rebuilt
- **Hero** rebuilt as a grid: meta top-left, TU Delft × Logitech marks top-right, big
  "logitech**Mind**" bottom-left, laptop right. Purple→lavender gradient background.
- **Laptop** uses the **transparent** raw mockup (old export had a baked grey box).
- **Marks** logo keyed to transparent + padded (old export had a grey plate).
- **Cycle diagram** (`cycle.png`) background keyed to transparent (was a grey box).
- **Priority to constraints**: gradient rail + hug-content pills with arrows.
- **User journey map**: bespoke With/Without chart built from scratch — phase timeline,
  emotion-tagged cards, and momentum bars (heights/colours from Figma `87:2060`). Replaced
  the generic component. Scrolls horizontally on narrow screens.
- Video: `public/media/mind.mp4` (compressed 35 MB → 3.6 MB), no caption.
- Outcome cards aligned to Figma copy; em dash removed from "Ghost interface".

### Product Photography (`ProductPhotographyCaseStudy.astro`) — re-ported
- Hero uses the real Figma hero render, bleeding to the right edge.
- Closing shows the **two distinct goggle renders** side by side + caption (previously reused
  the hero render + wrong "IL RENDER" slide).
- 2×2 photo grid unchanged.

### Talaris
- `TalarisCaseStudy.astro` placeholder ("under construction"); `wip: true` frontmatter drives
  a "Soon" badge on the home menu + project rail.

---

## Asset techniques used (for future edits)
- **Transparent cutouts:** prefer Figma `download_assets` **rawImages** (often already
  transparent) over the node `export` (which can bake the node's background fill).
- **Background keying:** luminance ramp to alpha for line-art/logos on a flat light bg;
  for opaque renders, composite effects directly into the PNG (e.g. contact shadows).
- **Video:** ffmpeg `-vf scale=…1080p -c:v libx264 -crf 24 -movflags +faststart -an` into
  `public/media/`.

---

## Open items / next phase
- [ ] Confirm exact **Chlo accent hex** and **Grab cursor** shape against Figma.
- [ ] Verify Mind **hero title vs laptop** fit and **journey-map momentum bar** values read right.
- [ ] Decide on **animations/interactions** (deferred — current port is static).
- [ ] Build out **Talaris** when ready.
- [ ] Merge `port/case-studies` and wire up **Cloudflare Pages** deployment.

---

## Commit history (this effort)
```
b7fa5bd Product Photography: re-port hero + closing with correct Figma renders
7254ffe Mind: pad marks logo with transparent margin so logos never clip at edge
e617607 Fix baked backgrounds: key out cycle diagram bg; drop orphaned Grab PNG icons
72e17d9 Mind: use transparent laptop mockup in hero (drop baked grey background)
7bd6945 Mind: rebuild hero, priority graph, journey map; fixes
911641c Chlo: tighten section spacing; ground the two floating renders with soft contact shadows
1acfe91 Grab: white hand cursor glyph; Chlo: accent, bg, step alignment, smaller renderings
c8fb760 Grab: import high-res SVG hand glyphs; remove em dash in pipeline
51495e4 Remove footer site-wide; hide native scrollbar on case pages
d60861a Phase 1: port all four case studies to the shared standard
7e5d697 Phase 0: standardize case-study porting system
3dfdd23 Snapshot before case-study porting standardization
```
