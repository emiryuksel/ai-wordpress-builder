import {
  allocateUniqueSlug as allocateSlug,
  buildInitialProjectSlug,
  slugifyBrandName,
} from "@/lib/slug";
import { listProjects } from "@/lib/project-store";

export { buildInitialProjectSlug, slugifyBrandName };

export async function collectTakenSlugs(): Promise<Set<string>> {
  const projects = await listProjects();
  return new Set(
    projects
      .map((project) => project.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );
}

export async function allocateUniqueSlugFromBrand(
  brandName: string,
  excludeSlug?: string,
): Promise<string> {
  const taken = await collectTakenSlugs();
  return allocateSlug(brandName, taken, excludeSlug);
}
