import { useState, useEffect, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  ExportProgressState,
  GeneratedPdfResult,
  PageThumbnailInfo,
  PdfDocumentInfo,
  PdfGroup,
  StoredProject,
} from '../types/pdf';
import {
  downloadBlob,
  generateGroupPdfs,
  loadPdfFile,
  renderPageThumbnail,
  revokeGeneratedFileUrls,
  revokeThumbnailUrls,
} from '../services/pdfService';
import { sanitizeFilename } from '../utils/filenameSanitizer';
import {
  parseGroupOrganization,
  serializeGroupOrganization,
} from '../utils/groupOrganization';

type PendingLeaveAction = { type: 'load'; file: File } | { type: 'reset' };

const STORAGE_KEY = 'pdf_score_organizer_project';
const LEGACY_STORAGE_KEY = 'pdf_score_organizer_groups';
const THUMBNAIL_BATCH_SIZE = 4;
const GROUP_COLORS = ['indigo', 'blue', 'emerald', 'amber', 'rose', 'purple', 'cyan'];

function createGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'group-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function readStoredProject(): StoredProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProject;
    if (
      typeof parsed.filename === 'string' &&
      typeof parsed.pageCount === 'number' &&
      Array.isArray(parsed.groups)
    ) {
      return parsed;
    }
  } catch {
    // Storage error ignored
  }
  return null;
}

function writeStoredProject(project: StoredProject): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage error ignored
  }
}

function clearStoredProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage error ignored
  }
}

function groupsForDocument(info: PdfDocumentInfo): PdfGroup[] {
  const stored = readStoredProject();
  if (stored && stored.filename === info.filename && stored.pageCount === info.pageCount) {
    return stored.groups;
  }
  return [];
}

export function usePdfOrganizer() {
  const [docInfo, setDocInfo] = useState<PdfDocumentInfo | null>(null);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnailInfo[]>([]);
  const [groups, setGroups] = useState<PdfGroup[]>([]);
  const [selectedViewerPages, setSelectedViewerPages] = useState<number[]>([]);
  const [editingGroup, setEditingGroup] = useState<PdfGroup | null>(null);
  const [previewGroup, setPreviewGroup] = useState<PdfGroup | null>(null);
  const [inspectPageNumber, setInspectPageNumber] = useState<number | null>(null);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressState>({
    isExporting: false,
    currentStep: 0,
    totalSteps: 0,
    currentGroupName: '',
    percent: 0,
    isComplete: false,
  });
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedPdfResult[]>([]);
  const [pendingLeaveAction, setPendingLeaveAction] = useState<PendingLeaveAction | null>(
    null
  );

  const cancelRenderingRef = useRef(false);
  const renderGenerationRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const pdfProxyRef = useRef<PDFDocumentProxy | null>(null);
  const thumbnailsRef = useRef<PageThumbnailInfo[]>([]);
  const generatedFilesRef = useRef<GeneratedPdfResult[]>([]);

  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  useEffect(() => {
    generatedFilesRef.current = generatedFiles;
  }, [generatedFiles]);

  const destroyPdfProxy = useCallback((proxy: PDFDocumentProxy | null) => {
    if (!proxy) return;
    try {
      void proxy.cleanup();
      void proxy.loadingTask.destroy();
    } catch {
      // Already destroyed
    }
  }, []);

  const resetViewerState = useCallback(() => {
    cancelRenderingRef.current = true;
    renderGenerationRef.current += 1;
    revokeThumbnailUrls(thumbnailsRef.current);
    revokeGeneratedFileUrls(generatedFilesRef.current);
    destroyPdfProxy(pdfProxyRef.current);
    pdfProxyRef.current = null;
    thumbnailsRef.current = [];
    generatedFilesRef.current = [];
    setThumbnails([]);
    setGeneratedFiles([]);
  }, [destroyPdfProxy]);

  useEffect(() => {
    if (!docInfo) return;
    writeStoredProject({
      filename: docInfo.filename,
      pageCount: docInfo.pageCount,
      groups,
    });
  }, [groups, docInfo]);

  const renderAllThumbnails = useCallback(async (proxy: PDFDocumentProxy) => {
    cancelRenderingRef.current = false;
    const renderId = ++renderGenerationRef.current;
    const numPages = proxy.numPages;

    const initialThumbnails: PageThumbnailInfo[] = Array.from({ length: numPages }, (_, i) => ({
      pageNumber: i + 1,
      width: 200,
      height: 280,
      aspectRatio: 1 / 1.414,
      isLoading: true,
    }));
    setThumbnails(initialThumbnails);

    for (let start = 1; start <= numPages; start += THUMBNAIL_BATCH_SIZE) {
      if (cancelRenderingRef.current || renderGenerationRef.current !== renderId) break;

      const end = Math.min(start + THUMBNAIL_BATCH_SIZE - 1, numPages);
      const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      const settled = await Promise.allSettled(
        pageNumbers.map((pageNumber) => renderPageThumbnail(proxy, pageNumber, 0.55))
      );

      if (cancelRenderingRef.current || renderGenerationRef.current !== renderId) {
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            revokeObjectUrlSafe(result.value.dataUrl);
          }
        }
        break;
      }

      setThumbnails((prev) => {
        const next = [...prev];
        settled.forEach((result, index) => {
          const pageNumber = pageNumbers[index];
          const slot = next.findIndex((item) => item.pageNumber === pageNumber);
          if (slot < 0) return;

          if (result.status === 'fulfilled') {
            revokeObjectUrlSafe(next[slot].dataUrl);
            next[slot] = {
              ...next[slot],
              dataUrl: result.value.dataUrl,
              width: result.value.width,
              height: result.value.height,
              aspectRatio: result.value.aspectRatio,
              textContent: result.value.textContent,
              isLoading: false,
              error: undefined,
            };
          } else {
            console.warn(`Error rendering thumbnail for page ${pageNumber}:`, result.reason);
            next[slot] = { ...next[slot], isLoading: false, error: 'Falha ao renderizar' };
          }
        });
        return next;
      });
    }
  }, []);

  const applyLoadedDocument = useCallback(
    (info: PdfDocumentInfo, proxy: PDFDocumentProxy, nextGroups: PdfGroup[]) => {
      resetViewerState();
      pdfProxyRef.current = proxy;
      setDocInfo(info);
      setPdfProxy(proxy);
      setGroups(nextGroups);
      setSelectedViewerPages([]);
      setEditingGroup(null);
      setPreviewGroup(null);
      setInspectPageNumber(null);
      setGeneratedFiles([]);
      setErrorMessage(null);
      void renderAllThumbnails(proxy);
    },
    [renderAllThumbnails, resetViewerState]
  );

  const loadSelectedFile = useCallback(
    async (file: File) => {
      const loadId = ++loadGenerationRef.current;
      setIsLoadingPdf(true);
      setErrorMessage(null);

      try {
        const { info, pdfProxy: proxy } = await loadPdfFile(file);
        if (loadGenerationRef.current !== loadId) {
          destroyPdfProxy(proxy);
          return;
        }
        applyLoadedDocument(info, proxy, groupsForDocument(info));
        setIsLoadingPdf(false);
      } catch (err) {
        if (loadGenerationRef.current !== loadId) return;
        console.error('PDF load error:', err);
        setIsLoadingPdf(false);
        setErrorMessage(
          'Não foi possível abrir o PDF. Verifique se o arquivo está corrompido ou protegido por senha.'
        );
      }
    },
    [applyLoadedDocument, destroyPdfProxy]
  );

  const resetProject = useCallback(() => {
    resetViewerState();
    setDocInfo(null);
    setPdfProxy(null);
    setThumbnails([]);
    setGroups([]);
    setSelectedViewerPages([]);
    setEditingGroup(null);
    setPreviewGroup(null);
    setInspectPageNumber(null);
    setGeneratedFiles([]);
    setErrorMessage(null);
    clearStoredProject();
  }, [resetViewerState]);

  const handleExportGroups = useCallback(() => {
    if (!docInfo || groups.length === 0) return;

    const text = serializeGroupOrganization({
      filename: docInfo.filename,
      pageCount: docInfo.pageCount,
      groups,
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const stem = docInfo.filename.replace(/\.pdf$/i, '').trim() || 'partituras';
    downloadBlob(blob, `${sanitizeFilename(stem)}-grupos.txt`);
  }, [docInfo, groups]);

  const proceedWithLeave = useCallback(
    (action: PendingLeaveAction) => {
      setPendingLeaveAction(null);
      if (action.type === 'load') {
        void loadSelectedFile(action.file);
        return;
      }
      resetProject();
    },
    [loadSelectedFile, resetProject]
  );

  const handleFileSelected = (file: File) => {
    if (groups.length > 0 && docInfo) {
      setPendingLeaveAction({ type: 'load', file });
      return;
    }
    void loadSelectedFile(file);
  };

  const handleResetProject = () => {
    if (groups.length > 0) {
      setPendingLeaveAction({ type: 'reset' });
      return;
    }

    if (docInfo) {
      const confirmReset = window.confirm(
        'Deseja realmente limpar o projeto atual?'
      );
      if (!confirmReset) return;
    }

    resetProject();
  };

  const handleConfirmSaveAndLeave = () => {
    if (!pendingLeaveAction) return;
    handleExportGroups();
    proceedWithLeave(pendingLeaveAction);
  };

  const handleSkipSaveAndLeave = () => {
    if (!pendingLeaveAction) return;
    proceedWithLeave(pendingLeaveAction);
  };

  const handleCancelLeave = () => {
    setPendingLeaveAction(null);
  };

  const handleImportGroups = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseGroupOrganization(text);
      if (parsed.error) {
        alert(parsed.error);
        return;
      }

      const totalPages = docInfo?.pageCount;
      let imported = parsed.groups;
      if (totalPages) {
        imported = imported
          .map((group) => ({
            ...group,
            pages: group.pages.filter((page) => page <= totalPages),
          }))
          .filter((group) => group.pages.length > 0);

        if (imported.length === 0) {
          alert('Nenhum grupo do arquivo se aplica a este PDF.');
          return;
        }
      }

      if (groups.length > 0) {
        const confirmed = window.confirm(
          `Isso substituirá os ${groups.length} grupos atuais pelos ${imported.length} grupos do arquivo. Continuar?`
        );
        if (!confirmed) return;
      }

      setGroups(
        imported.map((group, index) => ({
          id: createGroupId(),
          name: group.name,
          pages: group.pages,
          colorTag: GROUP_COLORS[index % GROUP_COLORS.length],
          createdAt: Date.now(),
        }))
      );
      setEditingGroup(null);
    } catch {
      alert('Não foi possível ler o arquivo.');
    }
  };

  const handleSaveGroup = (groupData: { name: string; pages: number[] }) => {
    if (editingGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: groupData.name, pages: groupData.pages }
            : g
        )
      );
      setEditingGroup(null);
    } else {
      const newGroup: PdfGroup = {
        id: createGroupId(),
        name: groupData.name,
        pages: groupData.pages,
        colorTag: GROUP_COLORS[groups.length % GROUP_COLORS.length],
        createdAt: Date.now(),
      };
      setGroups((prev) => [...prev, newGroup]);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (editingGroup?.id === groupId) {
      setEditingGroup(null);
    }
  };

  const handleDuplicateGroup = (group: PdfGroup) => {
    const duplicated: PdfGroup = {
      id: createGroupId(),
      name: `${group.name} (Cópia)`,
      pages: [...group.pages],
      colorTag: group.colorTag,
      createdAt: Date.now(),
    };
    setGroups((prev) => [...prev, duplicated]);
  };

  const handleMoveGroup = (index: number, direction: 'up' | 'down') => {
    setGroups((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSortByFirstPage = () => {
    setGroups((prev) => {
      return [...prev].sort((a, b) => {
        const minA = a.pages.length > 0 ? Math.min(...a.pages) : 0;
        const minB = b.pages.length > 0 ? Math.min(...b.pages) : 0;
        return minA - minB;
      });
    });
  };

  const handleClearAllGroups = () => {
    if (window.confirm('Tem certeza que deseja remover todos os grupos criados?')) {
      setGroups([]);
      setEditingGroup(null);
    }
  };

  const handleGeneratePdfs = async (prefix: string) => {
    if (!docInfo || groups.length === 0) return;

    revokeGeneratedFileUrls(generatedFilesRef.current);
    setGeneratedFiles([]);

    setIsExporting(true);
    setExportProgress({
      isExporting: true,
      currentStep: 0,
      totalSteps: groups.length,
      currentGroupName: groups[0]?.name || '',
      percent: 0,
      isComplete: false,
    });

    try {
      const results = await generateGroupPdfs(
        docInfo.arrayBuffer,
        groups,
        prefix,
        (step, total, groupName) => {
          setExportProgress({
            isExporting: true,
            currentStep: step,
            totalSteps: total,
            currentGroupName: groupName,
            percent: Math.round((step / total) * 100),
            isComplete: step === total,
          });
        }
      );

      setGeneratedFiles(results);
      setIsExporting(false);
    } catch (err) {
      console.error('Error generating PDFs:', err);
      setIsExporting(false);
      alert('Erro ao gerar PDFs: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'a' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        if (thumbnails.length > 0) {
          e.preventDefault();
          setSelectedViewerPages(thumbnails.map((t) => t.pageNumber));
        }
      }

      if (e.key === 'Escape') {
        if (inspectPageNumber !== null) {
          setInspectPageNumber(null);
        } else if (previewGroup !== null) {
          setPreviewGroup(null);
        } else if (selectedViewerPages.length > 0) {
          setSelectedViewerPages([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [thumbnails, inspectPageNumber, previewGroup, selectedViewerPages]);

  useEffect(() => {
    return () => {
      resetViewerState();
    };
  }, [resetViewerState]);

  return {
    docInfo,
    pdfProxy,
    thumbnails,
    groups,
    selectedViewerPages,
    editingGroup,
    previewGroup,
    inspectPageNumber,
    isLoadingPdf,
    errorMessage,
    isExporting,
    exportProgress,
    generatedFiles,
    setSelectedViewerPages,
    setEditingGroup,
    setPreviewGroup,
    setInspectPageNumber,
    pendingLeaveAction,
    handleFileSelected,
    handleResetProject,
    handleExportGroups,
    handleImportGroups,
    handleConfirmSaveAndLeave,
    handleSkipSaveAndLeave,
    handleCancelLeave,
    handleSaveGroup,
    handleDeleteGroup,
    handleDuplicateGroup,
    handleMoveGroup,
    handleSortByFirstPage,
    handleClearAllGroups,
    handleGeneratePdfs,
  };
}

function revokeObjectUrlSafe(url?: string): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
