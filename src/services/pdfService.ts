import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { GeneratedPdfResult, PageThumbnailInfo, PdfDocumentInfo, PdfGroup } from '../types/pdf';
import { buildPdfFilename, formatBytes } from '../utils/filenameSanitizer';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PDFJS_CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`;
const PDFJS_FONT_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;

function createLoadingTask(data: Uint8Array) {
  return pdfjsLib.getDocument({
    data,
    cMapUrl: PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_FONT_URL,
  });
}

/**
 * Loads a PDF file and returns document info and a PDF.js proxy document for rendering.
 */
export async function loadPdfFile(file: File): Promise<{
  info: PdfDocumentInfo;
  pdfProxy: pdfjsLib.PDFDocumentProxy;
}> {
  const originalBuffer = await file.arrayBuffer();
  const pdfJsBuffer = originalBuffer.slice(0);

  const pdfProxy = await createLoadingTask(new Uint8Array(pdfJsBuffer)).promise;

  const info: PdfDocumentInfo = {
    filename: file.name,
    fileSize: file.size,
    fileSizeBytesFormatted: formatBytes(file.size),
    pageCount: pdfProxy.numPages,
    arrayBuffer: originalBuffer,
    loadedAt: Date.now(),
  };

  return { info, pdfProxy };
}

/**
 * Loads PDF from raw ArrayBuffer (e.g. sample score or stored project)
 */
export async function loadPdfFromArrayBuffer(
  rawBuffer: ArrayBuffer,
  filename = 'documento.pdf'
): Promise<{
  info: PdfDocumentInfo;
  pdfProxy: pdfjsLib.PDFDocumentProxy;
}> {
  const masterBuffer = rawBuffer.slice(0);
  const pdfJsBuffer = rawBuffer.slice(0);

  const pdfProxy = await createLoadingTask(new Uint8Array(pdfJsBuffer)).promise;

  const info: PdfDocumentInfo = {
    filename,
    fileSize: masterBuffer.byteLength,
    fileSizeBytesFormatted: formatBytes(masterBuffer.byteLength),
    pageCount: pdfProxy.numPages,
    arrayBuffer: masterBuffer,
    loadedAt: Date.now(),
  };

  return { info, pdfProxy };
}

function canvasToBlobUrl(canvas: HTMLCanvasElement, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar miniatura da página.'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      'image/jpeg',
      quality
    );
  });
}

export function revokeObjectUrl(url?: string): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function revokeThumbnailUrls(thumbnails: PageThumbnailInfo[]): void {
  for (const thumb of thumbnails) {
    revokeObjectUrl(thumb.dataUrl);
  }
}

export function revokeGeneratedFileUrls(files: GeneratedPdfResult[]): void {
  for (const file of files) {
    revokeObjectUrl(file.url);
  }
}

/**
 * Renders a thumbnail image of a specific page number to a blob URL
 */
export async function renderPageThumbnail(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 0.6
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  textContent: string;
}> {
  const page = await pdfProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  await page.render({
    canvasContext: context,
    viewport,
    transform,
    canvas,
  }).promise;

  const dataUrl = await canvasToBlobUrl(canvas);

  let textContent = '';
  try {
    const textData = await page.getTextContent();
    textContent = textData.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();
  } catch {
    // Text extraction optional
  }

  page.cleanup();
  canvas.width = 0;
  canvas.height = 0;

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height,
    textContent,
  };
}

/**
 * Renders a PDF page directly onto an existing HTML Canvas element with High-DPI support and target scale.
 */
export async function renderPageToCanvas(
  pdfProxy: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<{ width: number; height: number; aspectRatio: number }> {
  const page = await pdfProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  await page.render({
    canvasContext: context,
    viewport,
    transform,
    canvas,
  }).promise;

  page.cleanup();

  return {
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height,
  };
}

/**
 * Splits the original PDF document into separate PDFs for each specified group.
 * Uses pdf-lib to copy original vector streams and dimensions losslessly.
 */
export async function generateGroupPdfs(
  originalArrayBuffer: ArrayBuffer,
  groups: PdfGroup[],
  prefix = '',
  onProgress?: (step: number, total: number, groupName: string) => void
): Promise<GeneratedPdfResult[]> {
  if (!groups || groups.length === 0) {
    throw new Error('Nenhum grupo informado para geração.');
  }

  if (!originalArrayBuffer || originalArrayBuffer.byteLength === 0) {
    throw new Error('O conteúdo do arquivo PDF não está acessível na memória. Por favor, recarregue o arquivo.');
  }

  const bufferCopy = originalArrayBuffer.slice(0);
  const sourcePdf = await PDFDocument.load(bufferCopy, {
    ignoreEncryption: true,
  });

  const totalPagesInDoc = sourcePdf.getPageCount();
  const results: GeneratedPdfResult[] = [];
  const totalGroups = groups.length;

  for (let i = 0; i < totalGroups; i++) {
    const group = groups[i];
    const groupName = group.name.trim() || `Grupo ${i + 1}`;

    if (onProgress) {
      onProgress(i + 1, totalGroups, groupName);
    }

    const zeroBasedIndices = group.pages
      .filter((p) => p >= 1 && p <= totalPagesInDoc)
      .map((p) => p - 1);

    if (zeroBasedIndices.length === 0) {
      continue;
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, zeroBasedIndices);

    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const bytesCopy = new Uint8Array(pdfBytes.byteLength);
    bytesCopy.set(pdfBytes);
    const blob = new Blob([bytesCopy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const filename = buildPdfFilename(groupName, prefix);

    results.push({
      groupId: group.id,
      groupName,
      filename,
      pages: [...group.pages],
      pageCount: zeroBasedIndices.length,
      blob,
      url,
      fileSizeBytes: pdfBytes.byteLength,
      fileSizeFormatted: formatBytes(pdfBytes.byteLength),
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return results;
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
