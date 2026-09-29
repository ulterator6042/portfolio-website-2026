import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Projects collection — one .mdx per project in src/content/projects/.
 * The MDX body is the scrollable case study (readapted from the Figma decks);
 * this frontmatter is what the home grid + project header read.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Short line under the title on cards + project header.
      summary: z.string(),
      // Must match a category id in src/config/site.ts.
      category: z.enum(['uiux', 'product', 'photography']),
      year: z.number().optional(),
      role: z.string().optional(),
      tools: z.array(z.string()).default([]),
      // Card / header cover image (lives beside the .mdx or in src/assets).
      cover: image().optional(),
      // Lower number = earlier in the grid.
      order: z.number().default(100),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      // Optional: projects whose page is a custom route (e.g. photography
      // gallery) rather than the generic [slug] template.
      externalTemplate: z.string().optional(),
      // Skip the generic ProjectHeader title screen — the MDX body renders its
      // own hero (e.g. the Grab full-bleed case study).
      hideHeader: z.boolean().default(false),
      // Dark-theme the case-study shell (project rail + canvas), e.g. Grab.
      dark: z.boolean().default(false),
    }),
});

export const collections = { projects };
