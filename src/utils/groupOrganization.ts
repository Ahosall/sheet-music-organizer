import { PdfGroup } from '../types/pdf';
import { formatPageRange, parsePageRangeString } from './pageRangeParser';

export interface GroupOrganizationSnapshot {
  filename: string;
  pageCount: number;
  groups: Pick<PdfGroup, 'name' | 'pages'>[];
  generatedAt?: string;
}

export function serializeGroupOrganization(snapshot: GroupOrganizationSnapshot): string {
  const date = snapshot.generatedAt || new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    '# Organização de grupos',
    '# Gerado pelo Organizador de Partituras',
    `# Arquivo: ${snapshot.filename}`,
    `# Páginas: ${snapshot.pageCount}`,
    `# Grupos: ${snapshot.groups.length}`,
    `# Data: ${date}`,
    '',
  ];

  for (const group of snapshot.groups) {
    const name = group.name.trim() || 'Sem nome';
    const pages =
      group.pages.length > 0
        ? formatPageRange(group.pages).replace(/[–—]/g, '-')
        : '';
    lines.push(pages ? `${name}: ${pages}` : `${name}:`);
  }

  lines.push('');
  return lines.join('\n');
}

export function parseGroupOrganization(
  text: string
): { groups: { name: string; pages: number[] }[]; error?: string } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const groups: { name: string; pages: number[] }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(.+?):\s*(.*)$/);
    if (!match) {
      return {
        groups: [],
        error: `Linha não reconhecida: "${line}". Use o formato Nome: 1-3, 5`,
      };
    }

    const name = match[1].trim() || 'Sem nome';
    const pagesText = match[2].trim();
    if (!pagesText) continue;

    const parsed = parsePageRangeString(pagesText);
    if (parsed.error) {
      return { groups: [], error: `${name}: ${parsed.error}` };
    }

    groups.push({ name, pages: parsed.pages });
  }

  if (groups.length === 0) {
    return { groups: [], error: 'Nenhum grupo encontrado no arquivo.' };
  }

  return { groups };
}
