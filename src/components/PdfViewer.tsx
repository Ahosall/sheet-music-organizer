import React, { useState, useMemo } from "react";
import {
  Search,
  LayoutGrid,
  CheckSquare,
  Square,
  FolderOpen,
  Layers,
} from "lucide-react";
import { PageThumbnailInfo, PdfGroup } from "../types/pdf";
import { PdfThumbnail } from "./PdfThumbnail";
import { getPageToGroupsMap } from "../utils/pageRangeParser";

interface PdfViewerProps {
  thumbnails: PageThumbnailInfo[];
  selectedPages: number[];
  groups: PdfGroup[];
  onSelectPages: (pages: number[]) => void;
  onInspectPage: (pageNumber: number) => void;
  onCreateGroupFromSelection: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  thumbnails,
  selectedPages,
  groups,
  onSelectPages,
  onInspectPage,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unassigned" | "assigned"
  >("all");
  const [thumbnailSize, setThumbnailSize] = useState<"sm" | "md" | "lg" | "xl">(
    "md",
  );
  const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);

  const pageToGroupsMap = useMemo(() => getPageToGroupsMap(groups), [groups]);

  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    const term = searchTerm.toLowerCase().trim();
    const matches = new Set<number>();

    thumbnails.forEach((thumb) => {
      if (thumb.pageNumber.toString() === term) matches.add(thumb.pageNumber);
      if (thumb.textContent?.toLowerCase().includes(term))
        matches.add(thumb.pageNumber);
      const assigned = pageToGroupsMap.get(thumb.pageNumber);
      if (assigned?.some((g) => g.name.toLowerCase().includes(term))) {
        matches.add(thumb.pageNumber);
      }
    });

    return matches;
  }, [searchTerm, thumbnails, pageToGroupsMap]);

  const filteredThumbnails = useMemo(() => {
    return thumbnails.filter((thumb) => {
      const isAssigned =
        (pageToGroupsMap.get(thumb.pageNumber) || []).length > 0;
      if (activeFilter === "unassigned" && isAssigned) return false;
      if (activeFilter === "assigned" && !isAssigned) return false;
      if (searchTerm.trim() && !searchMatches.has(thumb.pageNumber))
        return false;
      return true;
    });
  }, [thumbnails, activeFilter, searchTerm, searchMatches, pageToGroupsMap]);

  const handleToggleSelect = (pageNumber: number, isShiftKey: boolean) => {
    const isCurrentlySelected = selectedPages.includes(pageNumber);

    if (
      isShiftKey &&
      lastClickedPage !== null &&
      lastClickedPage !== pageNumber
    ) {
      const start = Math.min(lastClickedPage, pageNumber);
      const end = Math.max(lastClickedPage, pageNumber);
      const range: number[] = [];
      for (let p = start; p <= end; p++) range.push(p);
      onSelectPages(
        Array.from(new Set([...selectedPages, ...range])).sort((a, b) => a - b),
      );
    } else if (isCurrentlySelected) {
      onSelectPages(selectedPages.filter((p) => p !== pageNumber));
    } else {
      onSelectPages([...selectedPages, pageNumber].sort((a, b) => a - b));
    }
    setLastClickedPage(pageNumber);
  };

  const unassignedCount = thumbnails.filter(
    (t) => (pageToGroupsMap.get(t.pageNumber) || []).length === 0,
  ).length;

  const gridColsClass =
    thumbnailSize === "sm"
      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5"
      : thumbnailSize === "lg"
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        : thumbnailSize === "xl"
          ? "grid-cols-1 sm:grid-cols-2 gap-3"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5";

  const filterBtn = (
    id: typeof activeFilter,
    label: string,
    icon: React.ReactNode,
    activeClass: string,
  ) => (
    <button
      type="button"
      onClick={() => setActiveFilter(id)}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
        activeFilter === id ? activeClass : "text-ink-600 hover:bg-cream-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-3">
      <div className="ui-card p-3.5 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar página, texto ou grupo"
              className="ui-input pl-9"
            />
          </div>
          <div className="flex items-center gap-0.5 p-0.5 bg-cream-100 rounded-xl">
            {(["sm", "md", "lg", "xl"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setThumbnailSize(size)}
                title={
                  size === "sm"
                    ? "Miniaturas pequenas"
                    : size === "md"
                      ? "Miniaturas médias"
                      : "Miniaturas grandes"
                }
                className={`px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-colors ${
                  thumbnailSize === size
                    ? "bg-paper text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-800"
                }`}
              >
                {size === "sm"
                  ? "P"
                  : size === "md"
                    ? "M"
                    : size === "lg"
                      ? "G"
                      : "XL"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {filterBtn(
            "all",
            `Todas (${thumbnails.length})`,
            <LayoutGrid className="w-3 h-3" />,
            "bg-sage-600 text-white",
          )}
          {filterBtn(
            "unassigned",
            `Sem grupo (${unassignedCount})`,
            <Square className="w-3 h-3" />,
            "bg-honey-600 text-white",
          )}
          {filterBtn(
            "assigned",
            `Agrupadas (${thumbnails.length - unassignedCount})`,
            <Layers className="w-3 h-3" />,
            "bg-sage-600 text-white",
          )}
          <span className="hidden sm:block w-px h-4 bg-cream-200 mx-1" />
          <button
            type="button"
            onClick={() => onSelectPages(thumbnails.map((t) => t.pageNumber))}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-ink-600 hover:bg-cream-100 rounded-lg cursor-pointer"
          >
            <CheckSquare className="w-3 h-3" />
            Selecionar todas
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectPages(
                thumbnails
                  .map((t) => t.pageNumber)
                  .filter((p) => (pageToGroupsMap.get(p) || []).length === 0),
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-ink-600 hover:bg-cream-100 rounded-lg cursor-pointer"
          >
            <FolderOpen className="w-3 h-3" />
            Selecionar sem grupo
          </button>
        </div>
      </div>

      {filteredThumbnails.length === 0 ? (
        <p className="text-sm text-ink-500 py-10 text-center">
          Nenhuma página nesta vista.
        </p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-0.5 max-h-[min(70vh,36rem)] lg:max-h-none">
          <div className={`grid ${gridColsClass}`}>
            {filteredThumbnails.map((thumb) => (
              <PdfThumbnail
                key={thumb.pageNumber}
                pageInfo={thumb}
                isSelected={selectedPages.includes(thumb.pageNumber)}
                assignedGroups={pageToGroupsMap.get(thumb.pageNumber) || []}
                onToggleSelect={handleToggleSelect}
                onInspectPage={onInspectPage}
                isSearchMatch={searchMatches.has(thumb.pageNumber)}
                thumbnailSize={thumbnailSize}
              />
            ))}
          </div>
        </div>
      )}

      {selectedPages.length > 0 && (
        <div className="shrink-0 z-20 ui-card px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-700">
            {selectedPages.length} selecionada
            {selectedPages.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectPages([])}
              className="text-xs font-medium text-ink-500 hover:text-ink-900 cursor-pointer px-2 py-1"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
