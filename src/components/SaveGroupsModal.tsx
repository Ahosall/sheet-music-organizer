import React, { useEffect } from "react";
import { Download, X } from "lucide-react";

interface SaveGroupsModalProps {
  open: boolean;
  groupCount: number;
  reason: "reset" | "file-change";
  onCancel: () => void;
  onSkip: () => void;
  onSave: () => void;
}

export const SaveGroupsModal: React.FC<SaveGroupsModalProps> = ({
  open,
  groupCount,
  reason,
  onCancel,
  onSkip,
  onSave,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const actionLabel =
    reason === "reset" ? "começar um novo arquivo" : "trocar de arquivo";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-scrim/50"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-groups-dialog-title"
        className="bg-paper border border-cream-200 w-full max-w-md overflow-hidden flex flex-col rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-cream-50 border-b border-cream-200 flex items-center justify-between gap-3 shrink-0">
          <h3
            id="save-groups-dialog-title"
            className="text-sm font-semibold text-ink-900"
          >
            Salvar grupos?
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-cream-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-600 leading-relaxed">
            Você organizou{" "}
            <span className="font-semibold text-ink-800">
              {groupCount} {groupCount === 1 ? "grupo" : "grupos"}
            </span>{" "}
            neste arquivo. Deseja exportá-los para um .txt antes de {actionLabel}?
          </p>

          <button type="button" onClick={onSave} className="ui-btn-primary">
            <Download className="w-3.5 h-3.5" />
            Salvar grupos (.txt)
          </button>

          <div className="flex gap-2">
            <button type="button" onClick={onSkip} className="ui-btn-ghost flex-1">
              Não salvar
            </button>
            <button type="button" onClick={onCancel} className="ui-btn-ghost flex-1">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
