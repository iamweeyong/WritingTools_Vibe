import type { Note } from './types';

export function extractWikiLinks(body: string): string[] {
  const matches = body.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return matches.map((m) => m.slice(2, -2).trim()).filter(Boolean);
}

export function sceneCompile(slugline: string, body: string): string {
  return [slugline.trim(), body.trim()].filter(Boolean).join('\n');
}

/**
 * MOC 본문의 ## 헤딩 아래에 있는 [[링크]]를 섹션별로 매핑
 */
export function mapNotesToSections(
  mocBody: string,
  linkedNotes: Note[],
): Map<string, Note[]> {
  const lines = mocBody.split('\n');
  const sections = new Map<string, Note[]>();
  let currentSection = 'general';

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1]
        .trim()
        .toLowerCase()
        .replace(/[\s/]+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }
    const links = extractWikiLinks(line);
    for (const linkTitle of links) {
      const note = linkedNotes.find((n) => n.title === linkTitle);
      if (note) {
        if (!sections.has(currentSection)) sections.set(currentSection, []);
        sections.get(currentSection)!.push(note);
      }
    }
  }
  return sections;
}
