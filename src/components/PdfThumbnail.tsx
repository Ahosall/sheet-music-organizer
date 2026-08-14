import React from "react";
import { Check, ZoomIn } from "lucide-react";
import { PageThumbnailInfo } from "../types/pdf";

interface AssignedGroupBadge {
  id: string;
  name: string;
  colorTag?: string;
}

interface PdfThumbnailProps {
  pageInfo: PageThumbnailInfo;
  isSelected: boolean;
  assignedGroups: AssignedGroupBadge[];
  onToggleSelect: (pageNumber: number, isShiftKey: boolean) => void;
  onInspectPage: (pageNumber: number) => void;
  isSearchMatch?: boolean;
  thumbnailSize: "sm" | "md" | "lg" | "xl";
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({
  pageInfo,
  isSelected,
  assignedGroups,
  onToggleSelect,
  onInspectPage,
  isSearchMatch,
  thumbnailSize,
}) => {
  const isAssigned = assignedGroups.length > 0;

  return (
    <div
      onClick={(e) => onToggleSelect(pageInfo.pageNumber, e.shiftKey)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onInspectPage(pageInfo.pageNumber);
      }}
      className={`flex flex-col bg-paper border select-none cursor-pointer overflow-hidden rounded-xl transition-shadow ${
        isSelected
          ? "border-sage-600 ring-2 ring-sage-500/25 shadow-sm"
          : isSearchMatch
            ? "border-honey-600 ring-2 ring-honey-600/20"
            : "border-cream-200 hover:border-cream-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-cream-100 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-ink-800">
          <span
            className={`flex items-center justify-center w-4 h-4 rounded-md border transition-colors ${
              isSelected
                ? "bg-sage-600 border-sage-600 text-white"
                : "border-cream-300 bg-paper text-transparent"
            }`}
          >
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
          {pageInfo.pageNumber}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspectPage(pageInfo.pageNumber);
          }}
          className="p-1 text-ink-400 hover:text-sage-600 hover:bg-sage-50 rounded-md cursor-pointer transition-colors"
          title="Ampliar página"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className={`relative flex items-center justify-center p-1.5 bg-cream-50 ${
          thumbnailSize === "sm"
            ? "min-h-22.5"
            : thumbnailSize === "lg"
              ? "min-h-50"
              : "min-h-35"
        }`}
      >
        {pageInfo.dataUrl ? (
          <img
            src={pageInfo.dataUrl}
            alt={`Página ${pageInfo.pageNumber}`}
            className="w-full h-auto object-contain rounded-md border border-cream-200 bg-white"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[1/1.414] bg-cream-100 rounded-md flex items-center justify-center text-[10px] text-ink-400">
            {pageInfo.error || "…"}
          </div>
        )}
      </div>

      <div className="px-2 py-1.5 min-h-7 border-t border-cream-100 text-[11px] truncate">
        {isAssigned ? (
          <span className="text-sage-700 font-medium">
            {assignedGroups.map((g) => g.name).join(", ")}
          </span>
        ) : (
          <span className="text-ink-400">Sem grupo</span>
        )}
      </div>
    </div>
  );
};
