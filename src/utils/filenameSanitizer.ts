/**
 * Sanitizes a string to make it safe for filenames across Windows, macOS, and Linux.
 */
export function sanitizeFilename(name: string, fallback = 'documento'): string {
  if (!name) return fallback;

  // Remove invalid filename characters: / \ : * ? " < > |
  let sanitized = name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .trim();

  // Remove trailing dots or spaces which cause issues in Windows
  sanitized = sanitized.replace(/[. ]+$/, '');

  if (!sanitized) return fallback;

  // Truncate to reasonable length (max 180 chars to leave room for prefix & extension)
  if (sanitized.length > 180) {
    sanitized = sanitized.substring(0, 180).trim();
  }

  return sanitized;
}

/**
 * Builds the final PDF filename with optional prefix
 */
export function buildPdfFilename(groupName: string, prefix?: string): string {
  const cleanName = sanitizeFilename(groupName.trim() || 'Partitura');
  const cleanPrefix = prefix ? sanitizeFilename(prefix.trim()) : '';

  if (cleanPrefix) {
    return `${cleanPrefix} - ${cleanName}.pdf`;
  }
  return `${cleanName}.pdf`;
}

/**
 * Formats byte size into human readable string (KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
