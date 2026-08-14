import React, { useMemo, useRef, useState } from "react";
import {
  Layers,
  ArrowUpDown,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Copy,
  FolderOpen,
  Search,
  FileOutput,
  Loader2,
  FileDown,
  FileUp,
} from "lucide-react";
import { PageThumbnailInfo, PdfGroup } from "../types/pdf";
import { formatPageRange } from "../utils/pageRangeParser";

interface GroupListProps {
  groups: PdfGroup[];
  thumbnails: PageThumbnailInfo[];
  totalPages: number;
  onEditGroup: (group: PdfGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onDuplicateGroup: (group: PdfGroup) => void;
  onPreviewGroup: (group: PdfGroup) => void;
  onMoveGroup: (index: number, direction: "up" | "down") => void;
  onSortByFirstPage: () => void;
  onClearAllGroups: () => void;
  onOpenExport: () => void;
  onExportGroups: () => void;
  onImportGroups: (file: File) => void;
  isExporting: boolean;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  thumbnails,
  totalPages,
  onEditGroup,
  onDeleteGroup,
  onDuplicateGroup,
  onPreviewGroup,
  onMoveGroup,
  onSortByFirstPage,
  onClearAllGroups,
  onOpenExport,
  onExportGroups,
  onImportGroups,
  isExporting,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onImportGroups(file);
  };

  const importInput = (
    <input
      type="file"
      ref={importInputRef}
      onChange={handleImportChange}
      accept=".txt,text/plain"
      className="hidden"
    />
  );

  const thumbnailMap = useMemo(() => {
    const map = new Map<number, PageThumbnailInfo>();
    thumbnails.forEach((t) => map.set(t.pageNumber, t));
    return map;
  }, [thumbnails]);

  const coveredPagesCount = useMemo(() => {
    const set = new Set<number>();
    groups.forEach((g) => g.pages.forEach((p) => set.add(p)));
    return set.size;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const indexed = groups.map((group, index) => ({ group, index }));
    if (!term) return indexed;

    return indexed.filter(({ group }) => {
      if (group.name.toLowerCase().includes(term)) return true;
      if (formatPageRange(group.pages).toLowerCase().includes(term))
        return true;
      return group.pages.some((page) => page.toString().includes(term));
    });
  }, [groups, searchTerm]);

  const isFiltering = searchTerm.trim().length > 0;

  if (groups.length === 0) {
    return (
      <div className="ui-card px-4 py-10 text-center">
        {importInput}
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-cream-100 text-ink-400 mb-3">
          <FolderOpen className="w-5 h-5" />
        </span>
        <p className="text-sm font-medium text-ink-700">Nenhum grupo ainda</p>
        <p className="text-xs text-ink-500 mt-1">
          Selecione páginas e adicione um grupo ao lado.
        </p>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="ui-btn-ghost mt-4"
        >
          <FileUp className="w-3.5 h-3.5" />
          Importar grupos
        </button>
      </div>
    );
  }

  return (
    <div className="ui-card overflow-hidden flex flex-col h-full max-h-[min(75vh,48rem)] lg:max-h-none">
      {importInput}
      <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between gap-3 shrink-0">
        <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-sage-600 shrink-0" />
          <span>Grupos ({groups.length})</span>
          <span className="font-normal text-ink-500 truncate">
            {coveredPagesCount}/{totalPages} páginas
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSortByFirstPage}
            className="ui-icon-btn"
            title="Ordenar por primeira página"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="ui-icon-btn"
            title="Importar grupos (.txt)"
          >
            <FileUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onExportGroups}
            className="ui-icon-btn"
            title="Exportar grupos (.txt)"
          >
            <FileDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClearAllGroups}
            className="ui-icon-btn ui-icon-btn-danger"
            title="Limpar todos os grupos"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-cream-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar grupo ou página"
            className="ui-input pl-9"
          />
        </div>
        {isFiltering && (
          <p className="text-xs text-ink-500 mt-1.5">
            {filteredGroups.length} de {groups.length} grupo
            {groups.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-ink-500 py-8 text-center px-4">
          Nenhum grupo encontrado.
        </p>
      ) : (
        <ul className="divide-y divide-cream-100 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {filteredGroups.map(({ group, index }) => (
            <li key={group.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {group.name}
                  </p>
                  <p className="text-xs text-ink-500 font-mono mt-0.5">
                    {formatPageRange(group.pages)} · {group.pages.length} pág.
                  </p>
                  <div className="flex items-center gap-1 mt-2 overflow-x-auto">
                    {group.pages.slice(0, 5).map((pageNum) => {
                      const thumb = thumbnailMap.get(pageNum);
                      return (
                        <div
                          key={pageNum}
                          className="w-7 h-9 bg-cream-100 border border-cream-200 rounded-md overflow-hidden shrink-0 flex items-center justify-center"
                          title={`Página ${pageNum}`}
                        >
                          {thumb?.dataUrl ? (
                            <img
                              src={thumb.dataUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-ink-500">
                              {pageNum}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {group.pages.length > 5 && (
                      <span className="text-[10px] font-medium text-ink-500 px-1">
                        +{group.pages.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveGroup(index, "up")}
                    disabled={isFiltering || index === 0}
                    className="ui-icon-btn"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveGroup(index, "down")}
                    disabled={isFiltering || index === groups.length - 1}
                    className="ui-icon-btn"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreviewGroup(group)}
                    className="ui-icon-btn"
                    title="Ver"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditGroup(group)}
                    className="ui-icon-btn"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateGroup(group)}
                    className="ui-icon-btn"
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Excluir "${group.name}"?`))
                        onDeleteGroup(group.id);
                    }}
                    className="ui-icon-btn ui-icon-btn-danger"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="p-3 border-t border-cream-100 shrink-0">
        <button type="button" onClick={onOpenExport} className="ui-btn-honey">
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              <FileOutput className="w-3.5 h-3.5" />
              {`Gerar PDFs (${groups.length})`}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
