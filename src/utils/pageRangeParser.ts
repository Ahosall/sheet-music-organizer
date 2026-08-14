/**
 * Parses page range string such as "1-3, 7, 10-12, 15" into a sorted array of unique numbers.
 */
export function parsePageRangeString(
  input: string,
  maxPages?: number
): { pages: number[]; error?: string } {
  if (!input || !input.trim()) {
    return { pages: [], error: 'Por favor, informe ao menos uma página.' };
  }

  const cleaned = input.trim();
  const segments = cleaned.split(/[,;\s]+/).filter(Boolean);
  const pageSet = new Set<number>();

  for (const segment of segments) {
    // Check if it's a range like "1-3" or "1..3" or "1 to 3"
    const rangeMatch = segment.match(/^(\d+)(?:-|–|—|\.\.)(\d+)$/);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);

      if (isNaN(start) || isNaN(end)) {
        return { pages: [], error: `Intervalo inválido: "${segment}".` };
      }

      if (start <= 0 || end <= 0) {
        return { pages: [], error: `As páginas devem ser maiores que 0: "${segment}".` };
      }

      const min = Math.min(start, end);
      const max = Math.max(start, end);

      if (max - min > 5000) {
        return { pages: [], error: `Intervalo muito grande: "${segment}".` };
      }

      for (let p = min; p <= max; p++) {
        if (maxPages && p > maxPages) {
          return {
            pages: [],
            error: `Página ${p} não existe no documento (máximo: ${maxPages} páginas).`,
          };
        }
        pageSet.add(p);
      }
    } else {
      // Single page number like "7"
      const pageNum = parseInt(segment, 10);

      if (isNaN(pageNum) || !/^\d+$/.test(segment)) {
        return {
          pages: [],
          error: `Valor de página não reconhecido: "${segment}". Use números ou intervalos como 1-3.`,
        };
      }

      if (pageNum <= 0) {
        return { pages: [], error: `Página inválida: ${pageNum}. Os números devem iniciar em 1.` };
      }

      if (maxPages && pageNum > maxPages) {
        return {
          pages: [],
          error: `Página ${pageNum} não existe no documento (máximo: ${maxPages} páginas).`,
        };
      }

      pageSet.add(pageNum);
    }
  }

  const pages = Array.from(pageSet).sort((a, b) => a - b);

  if (pages.length === 0) {
    return { pages: [], error: 'Nenhuma página válida encontrada.' };
  }

  return { pages };
}

/**
 * Formats an array of page numbers into a compact human-friendly range string.
 * Example: [1, 2, 3, 7, 10, 11, 12] => "1–3, 7, 10–12"
 */
export function formatPageRange(pages: number[]): string {
  if (!pages || pages.length === 0) return 'Nenhuma página';

  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const ranges: string[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (start === prev) {
        ranges.push(`${start}`);
      } else if (prev === start + 1) {
        ranges.push(`${start}, ${prev}`);
      } else {
        ranges.push(`${start}–${prev}`);
      }
      start = current;
      prev = current;
    }
  }

  if (start === prev) {
    ranges.push(`${start}`);
  } else if (prev === start + 1) {
    ranges.push(`${start}, ${prev}`);
  } else {
    ranges.push(`${start}–${prev}`);
  }

  return ranges.join(', ');
}

/**
 * Computes all unassigned page numbers from 1 to totalPages given existing groups.
 */
export function getUnassignedPages(
  totalPages: number,
  groups: { pages: number[] }[]
): number[] {
  const used = new Set<number>();
  for (const g of groups) {
    for (const p of g.pages) {
      used.add(p);
    }
  }

  const unassigned: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!used.has(p)) {
      unassigned.push(p);
    }
  }
  return unassigned;
}

/**
 * Finds which groups currently use each page number.
 * Returns a map of pageNumber -> array of group info
 */
export function getPageToGroupsMap(
  groups: { id: string; name: string; pages: number[]; colorTag?: string }[]
): Map<number, { id: string; name: string; colorTag?: string }[]> {
  const map = new Map<number, { id: string; name: string; colorTag?: string }[]>();

  for (const group of groups) {
    for (const page of group.pages) {
      const existing = map.get(page) || [];
      existing.push({
        id: group.id,
        name: group.name,
        colorTag: group.colorTag,
      });
      map.set(page, existing);
    }
  }

  return map;
}

/**
 * Computes overlap between new requested pages and existing groups.
 */
export function findPageConflicts(
  targetPages: number[],
  groups: { id: string; name: string; pages: number[] }[],
  ignoreGroupId?: string
): { page: number; existingGroupName: string }[] {
  const conflicts: { page: number; existingGroupName: string }[] = [];

  for (const group of groups) {
    if (ignoreGroupId && group.id === ignoreGroupId) continue;
    const groupSet = new Set(group.pages);
    for (const page of targetPages) {
      if (groupSet.has(page)) {
        conflicts.push({
          page,
          existingGroupName: group.name,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Suggests next sequential interval based on the highest used page.
 * Returns null when every page already belongs to a group.
 */
export function suggestNextInterval(
  totalPages: number,
  groups: { pages: number[] }[],
  defaultSpan = 3
): { start: number; end: number } | null {
  const used = new Set<number>();
  let highest = 0;
  for (const g of groups) {
    for (const p of g.pages) {
      used.add(p);
      if (p > highest) highest = p;
    }
  }

  let allPagesGrouped = totalPages > 0;
  for (let page = 1; page <= totalPages; page++) {
    if (!used.has(page)) {
      allPagesGrouped = false;
      break;
    }
  }
  if (allPagesGrouped) return null;

  const nextStart = highest > 0 ? highest + 1 : 1;
  const nextEnd = Math.min(totalPages, nextStart + defaultSpan - 1);

  if (nextStart > totalPages) {
    return { start: 1, end: Math.min(totalPages, defaultSpan) };
  }

  return { start: nextStart, end: nextEnd };
}
