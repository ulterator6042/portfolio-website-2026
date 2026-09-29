import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** URL for a project — respects a custom `externalTemplate` route
 *  (e.g. the photography gallery lives at /work/photography, not [slug]). */
export function projectHref(p: Project): string {
  return p.data.externalTemplate ?? `/work/${p.id}`;
}

/** All non-draft projects, sorted by `order` then title. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => !data.draft);
  return all.sort(
    (a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
}
