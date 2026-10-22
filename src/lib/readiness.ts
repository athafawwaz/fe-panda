import type { AppFolder, ApplicationItem, AppChangeSection } from "./api";

// Mirrors backend/internal/service/tools.go coreInitialCategories / coreChangeCategories.
export const REQUIRED_INITIAL = ["PRD", "FSD", "UAT", "BAST"];
export const REQUIRED_CHANGE = ["PRD", "UAT", "BAST"];

export interface SectionGap {
  folder: AppFolder;
  app: ApplicationItem;
  section: AppChangeSection;
  missing: string[];
}

export function sectionMissing(section: AppChangeSection): string[] {
  const have = new Set((section.documents ?? []).map((d) => d.doc_category));
  const required = section.is_initial_release ? REQUIRED_INITIAL : REQUIRED_CHANGE;
  return required.filter((c) => !have.has(c));
}

export function readiness(folders: AppFolder[]) {
  const gaps: SectionGap[] = [];
  let sections = 0;
  for (const folder of folders)
    for (const app of folder.applications ?? [])
      for (const section of app.sections ?? []) {
        sections++;
        const missing = sectionMissing(section);
        if (missing.length) gaps.push({ folder, app, section, missing });
      }
  return { sections, complete: sections - gaps.length, gaps };
}
