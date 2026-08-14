import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageThumbnailInfo, PdfGroup } from "../types/pdf";
import { formatPageRange } from "../utils/pageRangeParser";
import { renderPageToCanvas } from "../services/pdfService";

interface GroupPreviewModalProps {
  group: PdfGroup | null;
  thumbnails: PageThumbnailInfo[];
  pdfProxy?: PDFDocumentProxy | null;
  onClose: () => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

export const GroupPreviewModal: React.FC<GroupPreviewModalProps> = ({
  group,
  thumbnails,
  pdfProxy,
  onClose,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const groupPageNumbers = group?.pages || [];
  const currentPageNumber =
    groupPageNumbers[currentPageIndex] || groupPageNumbers[0];

  // Reset zoom & pan when page index changes
  useEffect(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [currentPageIndex]);

  // Render high-res canvas when pdfProxy and currentPageNumber are available
  useEffect(() => {
    if (!pdfProxy || !currentPageNumber || !canvasRef.current) return;

    const canvas = canvasRef.current;
    renderPageToCanvas(pdfProxy, currentPageNumber, canvas, 1.8).catch(
      (err) => {
        console.warn("Group preview canvas render fallback:", err);
      },
    );
  }, [pdfProxy, currentPageNumber]);

  if (!group) return null;

  const thumbnailMap = new Map<number, PageThumbnailInfo>();
  thumbnails.forEach((t) => thumbnailMap.set(t.pageNumber, t));
  const currentThumbnail = thumbnailMap.get(currentPageNumber);

  const handlePrev = () => {
    setCurrentPageIndex((prev) =>
      prev > 0 ? prev - 1 : groupPageNumbers.length - 1,
    );
  };

  const handleNext = () => {
    setCurrentPageIndex((prev) =>
      prev < groupPageNumbers.length - 1 ? prev + 1 : 0,
    );
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = ZOOM_STEPS.find((s) => s > prev);
      return next !== undefined ? next : Math.min(prev + 0.5, 3.0);
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = [...ZOOM_STEPS].reverse().find((s) => s < prev);
      return next !== undefined ? next : Math.max(prev - 0.25, 0.5);
    });
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) =>
      Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 3.5),
    );
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-scrim/50"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-paper border border-cream-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-cream-50 border-b border-cream-200 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h3 className="font-semibold text-ink-900 text-sm">{group.name}</h3>
            <p className="text-xs text-ink-500">
              {group.pages.length}{" "}
              {group.pages.length === 1 ? "página" : "páginas"} (
              {formatPageRange(group.pages)})
            </p>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center bg-paper border border-cream-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 hover:bg-cream-100 rounded-lg transition-colors cursor-pointer"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-mono font-medium text-ink-700 hover:bg-cream-100 rounded-lg transition-colors min-w-12.5 text-center cursor-pointer"
                title="Redefinir para 100%"
              >
                {zoomPercent}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3.0}
                className="p-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 hover:bg-cream-100 rounded-lg transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-1.5 text-ink-600 hover:text-ink-900 bg-paper hover:bg-cream-100 border border-cream-200 rounded-xl transition-colors cursor-pointer"
              title="Girar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-cream-100 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area with Pan & Zoom */}
        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          className={`flex-1 overflow-hidden p-4 bg-cream-100/70 flex items-center justify-center min-h-95 relative select-none ${
            zoom > 1.0
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-default"
          }`}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="flex items-center justify-center relative will-change-transform pointer-events-none"
          >
            <canvas
              ref={canvasRef}
              className={`max-h-[66vh] w-auto max-w-none object-contain rounded-xl border border-cream-200 shadow-md bg-white ${
                pdfProxy ? "block" : "hidden"
              }`}
            />

            {!pdfProxy && currentThumbnail?.dataUrl && (
              <img
                src={currentThumbnail.dataUrl}
                alt={`Página ${currentPageNumber}`}
                className="max-h-[66vh] w-auto max-w-none object-contain rounded-xl border border-cream-200 shadow-md bg-white"
                referrerPolicy="no-referrer"
              />
            )}

            {!pdfProxy && !currentThumbnail?.dataUrl && (
              <div className="w-64 h-80 bg-paper rounded-xl border border-cream-200 flex flex-col items-center justify-center gap-2 text-ink-400 shadow-md">
                <FileText className="w-12 h-12" />
                <span className="text-xs font-medium">
                  Página {currentPageNumber}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          {groupPageNumbers.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 hover:bg-paper border border-cream-200 shadow-sm flex items-center justify-center text-ink-700 hover:text-sage-600 transition-all cursor-pointer z-10"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 hover:bg-paper border border-cream-200 shadow-sm flex items-center justify-center text-ink-700 hover:text-sage-600 transition-all cursor-pointer z-10"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {zoom > 1.0 && (
            <div className="absolute top-3 left-3 bg-scrim/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 pointer-events-none z-10">
              <Move className="w-3 h-3 text-sage-200" />
              <span>Arraste para mover</span>
            </div>
          )}
        </div>

        {/* Footer with thumbnails strip and counter */}
        <div className="px-5 py-3 bg-paper border-t border-cream-200 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-ink-600">
            Página {currentPageIndex + 1} de {groupPageNumbers.length} (Doc Pg.{" "}
            {currentPageNumber})
          </div>

          {/* Mini Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
            {groupPageNumbers.map((pageNum, idx) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPageIndex(idx)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentPageIndex === idx
                    ? "bg-sage-600 text-white"
                    : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium bg-cream-100 hover:bg-cream-200 text-ink-700 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
