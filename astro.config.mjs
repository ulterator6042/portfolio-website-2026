import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Portfolio served from the custom domain root (CNAME: ismatteo.com).
// For now we only build/run locally; the site URL stays set so canonical
// links + OG tags are correct once deployed to Cloudflare Pages.
export default defineConfig({
  site: 'https://ismatteo.com',
  base: '/',
  integrations: [mdx()],
  image: {
    // sharp runs at build time; large photography originals allowed.
  },
});
