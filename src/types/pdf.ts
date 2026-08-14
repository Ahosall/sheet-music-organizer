export interface PdfGroup {
  id: string;
  name: string;
  pages: number[]; // 1-indexed page numbers (e.g., [1, 2, 3])
  colorTag?: string;
  notes?: string;
  createdAt: number;
}

export interface PdfDocumentInfo {
  filename: string;
  fileSize: number;
  fileSizeBytesFormatted: string;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
  loadedAt: number;
}

export interface PageThumbnailInfo {
  pageNumber: number; // 1-indexed
  dataUrl?: string;
  width: number;
  height: number;
  aspectRatio: number;
  textContent?: string;
  isLoading: boolean;
  error?: string;
}

export interface GeneratedPdfResult {
  groupId: string;
  groupName: string;
  filename: string;
  pages: number[];
  pageCount: number;
  blob: Blob;
  url: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
}

export interface ExportProgressState {
  isExporting: boolean;
  currentStep: number;
  totalSteps: number;
  currentGroupName: string;
  percent: number;
  error?: string;
  isComplete: boolean;
}

export interface StoredProject {
  filename: string;
  pageCount: number;
  groups: PdfGroup[];
}
