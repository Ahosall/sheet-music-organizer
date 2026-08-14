import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, X, AlertTriangle } from 'lucide-react';
import { PdfGroup } from '../types/pdf';
import {
  parsePageRangeString,
  formatPageRange,
  findPageConflicts,
  suggestNextInterval,
} from '../utils/pageRangeParser';

interface GroupCreatorProps {
  totalPages: number;
  existingGroups: PdfGroup[];
  selectedViewerPages: number[];
  editingGroup: PdfGroup | null;
  onSaveGroup: (groupData: { name: string; pages: number[] }) => void;
  onCancelEdit: () => void;
  onClearViewerSelection: () => void;
}

function toRangeInput(pages: number[]): string {
  return formatPageRange(pages).replace(/[–—]/g, '-');
}

export const GroupCreator: React.FC<GroupCreatorProps> = ({
  totalPages,
  existingGroups,
  selectedViewerPages,
  editingGroup,
  onSaveGroup,
  onCancelEdit,
  onClearViewerSelection,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [groupName, setGroupName] = useState('');
  const [rangeInput, setRangeInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [allowOverlapConfirmed, setAllowOverlapConfirmed] = useState(false);

  useEffect(() => {
    if (editingGroup || selectedViewerPages.length === 0) return;
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedViewerPages, editingGroup]);

  useEffect(() => {
    if (editingGroup) {
      setGroupName(editingGroup.name);
      setRangeInput(toRangeInput(editingGroup.pages));
      setValidationError(null);
      setAllowOverlapConfirmed(false);
      return;
    }

    setGroupName('');
    setValidationError(null);
    setAllowOverlapConfirmed(false);
  }, [editingGroup]);

  useEffect(() => {
    if (editingGroup) return;
    if (selectedViewerPages.length > 0) {
      setRangeInput(toRangeInput(selectedViewerPages));
      return;
    }
    const suggested = suggestNextInterval(totalPages, existingGroups, 3);
    setRangeInput(suggested ? `${suggested.start}-${suggested.end}` : '');
  }, [editingGroup, totalPages, existingGroups, selectedViewerPages]);

  const parsed = parsePageRangeString(rangeInput, totalPages);
  const currentTargetPages = parsed.pages;
  const pageConflicts = findPageConflicts(
    currentTargetPages,
    existingGroups,
    editingGroup ? editingGroup.id : undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanName = groupName.trim();
    if (!cleanName) {
      setValidationError('Informe um nome (ex: Trompete 1).');
      return;
    }

    const result = parsePageRangeString(rangeInput, totalPages);
    if (result.error) {
      setValidationError(result.error);
      return;
    }
    if (result.pages.length === 0) {
      setValidationError('Informe ao menos uma página.');
      return;
    }

    const submitConflicts = findPageConflicts(
      result.pages,
      existingGroups,
      editingGroup ? editingGroup.id : undefined
    );
    if (submitConflicts.length > 0 && !allowOverlapConfirmed) {
      setValidationError('Confirme o uso de páginas que já estão em outro grupo.');
      return;
    }

    onSaveGroup({ name: cleanName, pages: result.pages });

    if (!editingGroup) {
      setGroupName('');
      onClearViewerSelection();
      setAllowOverlapConfirmed(false);
    }
  };

  return (
    <div id="group-creator-card" className="ui-card overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
          {editingGroup ? (
            <Pencil className="w-3.5 h-3.5 text-honey-600" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-sage-600" />
          )}
          {editingGroup ? 'Editar grupo' : 'Novo grupo'}
        </h3>
        {editingGroup && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800 cursor-pointer"
          >
            <X className="w-3 h-3" />
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
        <div>
          <label className="ui-label">Nome</label>
          <input
            id="group-name-input"
            ref={nameInputRef}
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Trompete 1"
            className="ui-input"
            required
          />
        </div>

        <div>
          <label className="ui-label">
            Páginas <span className="font-normal text-ink-400">(ex: 1-3, 7)</span>
          </label>
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder="1-3, 7, 10-12"
            className="ui-input font-mono"
          />
          <p className="text-xs text-ink-500 mt-1.5">
            {currentTargetPages.length} {currentTargetPages.length === 1 ? 'página' : 'páginas'}
            {currentTargetPages.length > 0 ? `: ${formatPageRange(currentTargetPages)}` : ''}
            {selectedViewerPages.length > 0 && !editingGroup ? ' · da seleção' : ''}
          </p>
        </div>

        {pageConflicts.length > 0 && (
          <div className="text-xs text-ink-700 border border-honey-100 bg-honey-50 p-3 rounded-xl space-y-2">
            <p className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-honey-600 shrink-0 mt-0.5" />
              <span>
                {pageConflicts.length === 1
                  ? `A página ${pageConflicts[0].page} já está em "${pageConflicts[0].existingGroupName}".`
                  : `${pageConflicts.length} páginas já estão em outros grupos.`}
              </span>
            </p>
            <label className="flex items-center gap-2 cursor-pointer pl-6">
              <input
                type="checkbox"
                checked={allowOverlapConfirmed}
                onChange={(e) => {
                  setAllowOverlapConfirmed(e.target.checked);
                  if (e.target.checked) setValidationError(null);
                }}
                className="rounded accent-sage-600"
              />
              <span>Incluir mesmo assim</span>
            </label>
          </div>
        )}

        {validationError && <p className="text-xs text-rose-700">{validationError}</p>}

        <button
          type="submit"
          disabled={pageConflicts.length > 0 && !allowOverlapConfirmed}
          className="ui-btn-primary"
        >
          {editingGroup ? (
            <>
              <Pencil className="w-3.5 h-3.5" />
              Salvar
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              {`Adicionar${currentTargetPages.length ? ` (${currentTargetPages.length})` : ''}`}
            </>
          )}
        </button>
      </form>
    </div>
  );
};
