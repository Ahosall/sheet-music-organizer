import JSZip from 'jszip';
import { GeneratedPdfResult } from '../types/pdf';
import { sanitizeFilename } from '../utils/filenameSanitizer';
import { downloadBlob } from './pdfService';

export function buildZipEntryPath(
  file: Pick<GeneratedPdfResult, 'filename' | 'groupName'>,
  separateByFolder: boolean
): string {
  if (!separateByFolder) return file.filename;
  const folder = sanitizeFilename(file.groupName.trim() || 'Grupo');
  return `${folder}/${file.filename}`;
}

/**
 * Bundles multiple generated PDF files into a single ZIP archive
 */
export async function createAndDownloadZip(
  files: GeneratedPdfResult[],
  zipFilename = 'partituras-organizadas.zip',
  onProgress?: (percent: number) => void,
  options?: { separateByFolder?: boolean }
): Promise<{ blob: Blob; filename: string }> {
  if (!files || files.length === 0) {
    throw new Error('Nenhum arquivo para incluir no ZIP.');
  }

  const zip = new JSZip();
  const separateByFolder = Boolean(options?.separateByFolder);

  // Track unique paths inside the ZIP to prevent overwriting if 2 groups have identical names
  const usedPaths = new Map<string, number>();

  for (const file of files) {
    const folder = separateByFolder
      ? `${sanitizeFilename(file.groupName.trim() || 'Grupo')}/`
      : '';
    let finalName = file.filename;
    let entryPath = `${folder}${finalName}`;

    if (usedPaths.has(entryPath)) {
      const count = usedPaths.get(entryPath)! + 1;
      usedPaths.set(entryPath, count);
      const baseName = finalName.replace(/\.pdf$/i, '');
      finalName = `${baseName} (${count}).pdf`;
      entryPath = `${folder}${finalName}`;
    } else {
      usedPaths.set(entryPath, 1);
    }

    zip.file(entryPath, file.blob);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const cleanZipName = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;

  // Trigger download
  downloadBlob(zipBlob, cleanZipName);

  return {
    blob: zipBlob,
    filename: cleanZipName,
  };
}
