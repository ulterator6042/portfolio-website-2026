# PORTING_GUIDE.md — case-study porting standard

Single source of truth for porting the Figma case-study decks into this Astro
site. Every porting agent reads this file first and follows it exactly. When in
doubt, **match `GrabCaseStudy.astro`** — it is the certified reference template.

Figma file: `TQPwqmhFIz7SlJjVHpnxjM`
(`https://www.figma.com/design/TQPwqmhFIz7SlJjVHpnxjM/Untitled`)

---

## 0. Golden rules

1. **Fidelity:** reproduce the Figma **desktop** layout closely. You may adapt
   freely for mobile (≤900px) — desktop is the source of truth, mobile just must
   not break.
2. **One accent per project**, wired through frontmatter (see §3). Never hardcode
   a second accent.
3. **DM Sans only.** No other font family. Weights: 800–900 display, 700–800
   headings, 300 body, 200 large lead, 500 eyebrow.
4. **Copy is verbatim from Figma.** You may fix typos and leftover Italian
   (`esploso`→exploded, `Usr`→User, `artrow`→arrow, `Recuperato`→recovered).
   You may NOT rewrite or edit the meaning of the copy.
5. **Heavy diagrams → exported SVG/PNG**, never rebuilt in CSS (see §6).
6. **No "next project" footer** anywhere. (Removed globally.)
7. Every project page includes `<CaseScrollIndicator />` and uses `<CaseVideo>`
   for any video.

---

## 1. Stack & where things live

- **Astro 5** static build (`npm run build`), `@astrojs/mdx`, `sharp` for images.
  Deploys to Cloudflare Pages (`ismatteo.com`).
- One project = one `src/content/projects/<slug>.mdx` (frontmatter + a one-line
  import of its bespoke component).
- Bespoke case-study components live in `src/components/casestudy/`.
- Per-project assets live in `src/assets/<slug>/` (imported, hashed, optimized by
  Astro `<Image>`). Videos live in `public/media/<slug>.mp4` (served as-is).
- The generic route `src/pages/work/[slug].astro` wraps every case study with the
  sticky project rail and injects the accent onto the shell.

---

## 2. Page skeleton (identical order for all four projects)

1. **Hero** — full-bleed. Meta line (`Type — Year` and `Tools: …`) + big DM Sans
   title + one-line subtitle.
2. **"What is X?"** framing block.
3. **Editorial deep-dive rows** — 2-column (accent display heading + text stack),
   alternating. Collapse to 1 column at ≤900px.
4. **Media blocks** — 16:9, `--radius-lg`, caption. Video via `<CaseVideo>`.
5. **Diagram blocks** — exported SVG/PNG (§6).
6. **Closing reflections / outcome.**

No next-project footer.

---

## 3. Tokens (use these — do not hardcode)

Global tokens are in `src/styles/global.css` (`:root`) and `src/config/site.ts`
(mirrored to CSS vars by `Base.astro`). Per-project accent comes from frontmatter.

Type scale / rhythm (from `global.css`):

| Token | Use |
|---|---|
| `--fs-hero` | hero title |
| `--fs-display` | accent section headings |
| `--fs-h3` | sub-headings |
| `--fs-body` | body copy |
| `--fs-small` | captions / meta |
| `--case-max` | inner max-width (1280px) |
| `--case-pad` | inner horizontal padding |
| `--case-gap` | vertical gap between sections |
| `--radius-lg` / `--radius-md` | media / cards |
| `--accent` / `--accent-text` | project accent (injected on shell) |

Accent + theme per project:

| Project | slug | accent | theme (`dark`) |
|---|---|---|---|
| Grab | `grab` | `#e07856` orange | dark |
| Product Photography | `product-photography` | `#e5322d` red | dark |
| Logitech Mind | `mind` | `#8a73e0` purple | light |
| Chlo' | `chlo` | `#2b6cab` blue | light |

Set these in the `.mdx` frontmatter:

```yaml
hideHeader: true      # component renders its own hero
dark: true            # dark shell (Grab, Product Photography) — omit for light
accent: '#8a73e0'
accentText: '#ffffff'
```

Reference the accent in component CSS as `var(--accent)`. Dark projects may keep
local surface vars (`--ink`, `--card`, `--hair`, `--body`) as Grab does, but the
accent is always `var(--accent)`.

---

## 4. Shared components (use, don't reinvent)

- `casestudy/CaseScrollIndicator.astro` — fixed accent scroll bar. Drop one per
  page: `<CaseScrollIndicator />`. Hidden ≤900px. No config.
- `casestudy/CaseVideo.astro` — lazy, muted, looping video.
  `<CaseVideo src="/media/mind.mp4" caption="Working prototype" />`.
  `src` is a `/public/media/` path. Optional `poster`, `ratio` (default 16/9),
  `class`.

Do **not** re-implement scroll-indicator or video-lazyload logic inline.
The generic `Section` / `Quote` / `Findings` blocks are **retired** — build
bespoke. `Journey.astro` may be reused by Mind where it already works.

---

## 5. Typography rules

- Family: inherited DM Sans (`var(--font-sans)`). Don't set `font-family` on
  elements unless you need a fallback — never reintroduce Inter/JetBrains Mono.
- Weights: hero `800`–`900`; display headings `800`; sub-headings `700`; body
  `300`; large lead `200`; eyebrow/meta `500` uppercase, `0.15em` tracking.

---

## 6. Diagrams & assets

**Heavy/positioned diagrams are exported as flat SVG/PNG, never rebuilt in CSS.**
Specifically:
- **Chlo:** every exploded-assembly view + leader-line callout + concept sketch
  → SVG (vector line art) into `src/assets/chlo/diagrams/`.
- **Mind:** the circular "×25" cycle diagram → SVG. The survey ranking visual may
  be an image or a simple two-column list. Keep the live `Journey.astro` map.
- **Grab:** gesture glyphs already exported to `src/assets/grab/`.

**Asset extraction recipe (run at porting time — URLs are short-lived):**
1. Load the Figma tools: `ToolSearch("select:mcp__plugin_figma_figma__download_assets,mcp__plugin_figma_figma__get_screenshot,mcp__plugin_figma_figma__get_metadata")`.
2. `get_screenshot` on each child frame (see §8 node map) to see the section.
3. `download_assets` on the page node (or a sub-frame) — it returns `export`
   (whole-node render), `rawImages` (source photos), and `svgAssets` (vectors).
   Save photos to `src/assets/<slug>/`, vectors to `src/assets/<slug>/diagrams/`.
4. Use the correct file extension from each asset's `format` field.

Images in markup: always Astro `<Image>` with `widths` + `sizes`; decorative
images get `alt=""`, meaningful ones get real alt text. `sharp` emits WebP/AVIF
at build — don't pre-optimize by hand.

---

## 7. Responsive & a11y

- Single breakpoint at **≤900px**: 2-col rows → 1-col. Hero scales via `clamp()`.
- Scroll indicator auto-hides ≤900px.
- No autoplay-with-sound (videos are muted).
- Every meaningful image/video has a caption or alt text.

---

## 8. Figma node map (top-level child frames per demo page)

Use these with `get_screenshot` / `download_assets`.

**Product Photography demo** — `87:1740`
- `87:1673` Slide/122 (hero) · `87:1427` Frame 142 · `114:714` Frame 169

**Logitech Mind demo** — `87:2190`
- `87:1965` Slide/125 (hero) · `87:2189` Frame 145 · `111:584` Frame 153 ·
  `87:2225` Frame 152 · `114:662` Frame 162 · `114:707` Frame 167 ·
  `114:706` Frame 166

**Chlo' demo** — `114:1129`
- `114:1103` Slide/122 (hero) · `114:1143` Frame 176 · `114:1138` Frame 175 ·
  `114:1136` Frame 174 · `114:1174` Frame 185 · `116:1250` Frame 196 ·
  `116:1283` image 70 · `116:1285` Rectangle 107

**Grab demo** (reference) — `85:1237`
- `87:1377` Slide 16:9 · `111:620` Frame 145 · `85:1202` Frame 119 ·
  `85:1232` Frame 132 · `116:1318` Frame 198 · `116:1350` Frame 205 ·
  `87:1278` Frame 141

---

## 9. Definition of done (per project)

- [ ] Bespoke `<Project>CaseStudy.astro` matching the Figma desktop layout.
- [ ] `.mdx` frontmatter: title, summary, category, year, role, tools, cover,
      order, `hideHeader: true`, `dark` (if dark), `accent`, `accentText`.
- [ ] Uses `--accent` + type-scale tokens; no hardcoded second accent, no Inter.
- [ ] `<CaseScrollIndicator />` present; videos via `<CaseVideo>`.
- [ ] Heavy diagrams exported as SVG/PNG, placed in `src/assets/<slug>/`.
- [ ] Copy verbatim (typos fixed only).
- [ ] Responsive at ≤900px; no next-project footer.
- [ ] `npm run build` passes.
