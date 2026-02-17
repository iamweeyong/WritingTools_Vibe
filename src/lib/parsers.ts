export function extractWikiLinks(body: string): string[] {
  const matches = body.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return matches.map((m) => m.slice(2, -2).trim()).filter(Boolean);
}

export function sceneCompile(slugline: string, body: string): string {
  return [slugline.trim(), body.trim()].filter(Boolean).join('\n');
}
