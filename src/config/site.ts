/**
 * ─────────────────────────────────────────────────────────────────────────
 *  MASTER CONFIG  ·  the single source of truth for the whole site
 * ─────────────────────────────────────────────────────────────────────────
 *  Everything global lives here: identity, SEO, navigation, socials, design
 *  tokens, project categories, and feature flags. Change the site's identity
 *  or look from this one file — pages read from it, they don't hardcode.
 *
 *  Per-project content does NOT live here — that's src/content/projects/*.mdx.
 *  This file defines the *categories* those projects slot into and the global
 *  chrome around them.
 */

/* ── Identity & SEO ─────────────────────────────────────────────────────── */
export const site = {
  name: 'Matteo Isabella',
  shortName: 'ismatteo',
  domain: 'ismatteo.com',
  url: 'https://ismatteo.com',
  tagline: 'Designer & creative technologist',
  // Longer intro used on the home hero + meta description.
  intro:
    'Design and creative technology — interaction, product, and photography. Selected work below.',
  description:
    'Portfolio of Matteo Isabella — interaction design, product design, and photography.',
  locale: 'en',
  // Default social-share image (place file in public/, path is site-root-relative).
  ogImage: '/og-default.jpg',
  favicon: '/favicon.svg',
} as const;

/* ── Navigation ─────────────────────────────────────────────────────────── */
export const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/about' },
  { label: 'Photography', href: '/work/photography' },
] as const;

/* ── Socials / contact ──────────────────────────────────────────────────── */
export const socials = [
  { label: 'Email', href: 'mailto:matteo.isabella@gmail.com' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/', external: true },
  { label: 'Instagram', href: 'https://www.instagram.com/', external: true },
] as const;

/* ── Design tokens ──────────────────────────────────────────────────────── */
/**
 * These are mirrored into CSS custom properties by src/layouts/Base.astro,
 * so restyling the entire site is a matter of editing the values here.
 * The default palette is drawn from the Figma decks: near-black canvas,
 * off-white text, a single red accent.
 */
export const theme = {
  color: {
    bg: '#ffffff',
    surface: '#f0f0f0', // thumbnail / card placeholder grey
    text: '#111111',
    muted: '#6b6b6b',
    border: '#e6e6e6',
    accent: '#e5322d', // red — hover underline + accents
    accentText: '#ffffff',
    headerBg: '#1d1d1d', // dark top bar
    headerText: '#cfcfcf', // muted off-white name in the bar
  },
  font: {
    // DM Sans is the single site typeface (used bold/extra-light per the brand
    // spec). `mono` is retired — it points at the same stack so any legacy
    // reference still renders DM Sans. See PORTING_GUIDE.md.
    sans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  radius: { sm: '6px', md: '12px', lg: '20px' },
  space: { page: '6vw', max: '1200px' },
} as const;

/* ── Categories ─────────────────────────────────────────────────────────── */
/**
 * The taxonomy projects are filtered by on the home grid. `id` must match the
 * `category` field in each project's frontmatter. Mirrors the Figma zones
 * (UI/UX, Product) plus Photography for the merged gallery.
 */
export const categories = [
  { id: 'uiux', label: 'UI / UX' },
  { id: 'product', label: 'Product Design' },
  { id: 'photography', label: 'Photography' },
] as const;

export type CategoryId = (typeof categories)[number]['id'];

/* ── Feature flags ──────────────────────────────────────────────────────── */
export const features = {
  interactiveHero: false, // playful pixel-trail / grid effects from the old site
  contactForm: false, // static mailto for now
  showCategoryFilter: true,
} as const;

/* Convenience: the source Figma file the case studies are adapted from. */
export const figma = {
  fileKey: 'TQPwqmhFIz7SlJjVHpnxjM',
  url: 'https://www.figma.com/design/TQPwqmhFIz7SlJjVHpnxjM/Untitled',
} as const;
