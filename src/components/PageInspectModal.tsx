import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Move,
  FileText,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageThumbnailInfo, PdfGroup } from "../types/pdf";
import { renderPageToCanvas } from "../services/pdfService";

interface PageInspectModalProps {
  pageNumber: number | null;
  totalPages: number;
  thumbnails: PageThumbnailInfo[];
  groups: PdfGroup[];
  pdfProxy?: PDFDocumentProxy | null;
  onClose: () => void;
  onNavigatePage: (pageNumber: number) => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

export const PageInspectModal: React.FC<PageInspectModalProps> = ({
  pageNumber,
  totalPages,
  thumbnails,
  groups,
  pdfProxy,
  onClose,
  onNavigatePage,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHighResLoading, setIsHighResLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset pan and zoom when pageNumber changes
  useEffect(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [pageNumber]);

  // Render high-resolution canvas when pdfProxy and pageNumber are available
  useEffect(() => {
    if (!pdfProxy || pageNumber === null || !canvasRef.current) return;

    let isMounted = true;
    setIsHighResLoading(true);

    const canvas = canvasRef.current;
    // Render at scale 2.0 for razor-sharp score clarity even when zoomed in
    renderPageToCanvas(pdfProxy, pageNumber, canvas, 2.0)
      .then(() => {
        if (isMounted) setIsHighResLoading(false);
      })
      .catch((err) => {
        console.warn("High-res render fallback:", err);
        if (isMounted) setIsHighResLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfProxy, pageNumber]);

  if (pageNumber === null) return null;

  const currentThumb = thumbnails.find((t) => t.pageNumber === pageNumber);
  const assignedGroups = groups.filter((g) => g.pages.includes(pageNumber));

  const handlePrev = () => {
    if (pageNumber > 1) {
      onNavigatePage(pageNumber - 1);
    } else {
      onNavigatePage(totalPages);
    }
  };

  const handleNext = () => {
    if (pageNumber < totalPages) {
      onNavigatePage(pageNumber + 1);
    } else {
      onNavigatePage(1);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = ZOOM_STEPS.find((s) => s > prev);
      return next !== undefined ? next : Math.min(prev + 0.5, 4.0);
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

  const handleFitToWidth = () => {
    setZoom(1.5);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => {
      const newZoom = Math.min(Math.max(prev + delta, 0.4), 4.0);
      return Number(newZoom.toFixed(2));
    });
  };

  // Double click toggles between 100% and 200%
  const handleDoubleClick = () => {
    if (zoom > 1.2) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.0);
    }
  };

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary button
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile/tablet pinch & pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
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
        className={`bg-paper border border-cream-200 overflow-hidden flex flex-col shadow-xl ${
          isFullscreen
            ? "w-full h-full max-w-none max-h-none"
            : "w-full max-w-5xl max-h-[94vh] rounded-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 bg-cream-50 border-b border-cream-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-sage-700 tabular-nums w-7 h-7 rounded-lg bg-sage-50 border border-sage-100 flex items-center justify-center">
              {pageNumber}
            </span>
            <div>
              <h3 className="font-semibold text-ink-900 text-sm flex items-center gap-2">
                <span>
                  Página {pageNumber} de {totalPages}
                </span>
                {assignedGroups.length > 0 && (
                  <span className="hidden sm:inline text-xs font-normal text-ink-500">
                    ({assignedGroups.map((g) => g.name).join(", ")})
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-ink-500">
                {assignedGroups.length > 0
                  ? `Grupos: ${assignedGroups.map((g) => g.name).join(", ")}`
                  : "Página sem grupo atribuído"}
              </p>
            </div>
          </div>

          {/* Zoom & View Controls Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Zoom Stepper */}
            <div className="flex items-center bg-paper border border-cream-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 hover:bg-cream-100 rounded-lg transition-colors cursor-pointer"
                title="Reduzir zoom (Tecla -)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-mono font-medium text-ink-700 hover:bg-cream-100 rounded-lg transition-colors min-w-13 text-center cursor-pointer"
                title="Clique para redefinir zoom para 100%"
              >
                {zoomPercent}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4.0}
                className="p-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 hover:bg-cream-100 rounded-lg transition-colors cursor-pointer"
                title="Aumentar zoom (Tecla +)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Fit / Size Presets */}
            <div className="hidden sm:flex items-center bg-paper border border-cream-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleResetZoom}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  zoom === 1.0
                    ? "bg-sage-100 text-sage-700"
                    : "text-ink-600 hover:bg-cream-100"
                }`}
                title="Ajustar ao tamanho padrão (100%)"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={handleFitToWidth}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  zoom === 1.5
                    ? "bg-sage-100 text-sage-700"
                    : "text-ink-600 hover:bg-cream-100"
                }`}
                title="Ampliar largura (150%)"
              >
                150%
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(2.0);
                  setPan({ x: 0, y: 0 });
                }}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  zoom === 2.0
                    ? "bg-sage-100 text-sage-700"
                    : "text-ink-600 hover:bg-cream-100"
                }`}
                title="Zoom 200% para detalhes finos"
              >
                200%
              </button>
            </div>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 text-ink-600 hover:text-ink-900 bg-paper hover:bg-cream-100 border border-cream-200 rounded-xl transition-colors cursor-pointer"
              title="Girar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:block p-1.5 text-ink-600 hover:text-ink-900 bg-paper hover:bg-cream-100 border border-cream-200 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-cream-100 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewport with Pan & Zoom */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          className={`flex-1 overflow-hidden p-4 sm:p-6 bg-cream-100/70 flex items-center justify-center relative min-h-105 select-none ${
            zoom > 1.0
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-default"
          }`}
        >
          {isHighResLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="px-3 py-1.5 rounded-full bg-scrim/80 text-white text-[11px] font-medium">
                Carregando alta resolução...
              </span>
            </div>
          )}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="flex items-center justify-center relative will-change-transform pointer-events-none"
          >
            {/* Canvas for ultra-crisp vector PDF rendering */}
            <canvas
              ref={canvasRef}
              className={`max-h-[72vh] w-auto max-w-none object-contain rounded-xl border border-cream-200 shadow-md bg-white ${
                pdfProxy ? "block" : "hidden"
              }`}
            />

            {/* Fallback to high-res thumbnail dataURL */}
            {!pdfProxy && currentThumb?.dataUrl && (
              <img
                src={currentThumb.dataUrl}
                alt={`Página ${pageNumber}`}
                className="max-h-[72vh] w-auto max-w-none object-contain rounded-xl border border-cream-200 shadow-md bg-white"
                referrerPolicy="no-referrer"
              />
            )}

            {!pdfProxy && !currentThumb?.dataUrl && (
              <div className="w-72 h-96 bg-paper rounded-xl border border-cream-200 flex flex-col items-center justify-center gap-2 text-ink-400 shadow-md">
                <FileText className="w-12 h-12" />
                <span className="text-xs font-medium">
                  Carregando página {pageNumber}...
                </span>
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 hover:bg-paper border border-cream-200 shadow-sm flex items-center justify-center text-ink-700 hover:text-sage-600 transition-all cursor-pointer z-10"
            title="Página anterior (Seta esquerda)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 hover:bg-paper border border-cream-200 shadow-sm flex items-center justify-center text-ink-700 hover:text-sage-600 transition-all cursor-pointer z-10"
            title="Próxima página (Seta direita)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Pan Indicator Pill when zoomed in */}
          {zoom > 1.0 && (
            <div className="absolute top-3 left-3 bg-scrim/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 pointer-events-none z-10">
              <Move className="w-3 h-3 text-sage-200" />
              <span>Arraste para mover</span>
            </div>
          )}
        </div>

        {/* Footer with shortcuts info */}
        <div className="px-4 sm:px-5 py-2.5 bg-paper border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[11px] text-ink-500 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-honey-600 shrink-0" />
            <span>
              <strong className="font-semibold text-ink-700">Dica:</strong> Use
              a roda do mouse para aproximar, arraste para navegar e clique
              duplo para ampliar.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pan.x !== 0 || pan.y !== 0 ? (
              <button
                type="button"
                onClick={() => setPan({ x: 0, y: 0 })}
                className="px-2.5 py-1 text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-cream-100 rounded-lg transition-colors cursor-pointer"
              >
                Recentralizar
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium bg-cream-100 hover:bg-cream-200 text-ink-700 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
