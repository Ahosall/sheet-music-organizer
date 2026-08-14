import React from "react";
import { Music2, FilePlus, Sun, Moon, CircleHelp } from "lucide-react";
import { PdfDocumentInfo } from "../types/pdf";
import { useTheme } from "../hooks/useTheme";

interface HeaderProps {
  docInfo: PdfDocumentInfo | null;
  onResetProject: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  docInfo,
  onResetProject,
  onOpenHelp,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="bg-paper/90 backdrop-blur-md border-b border-cream-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-sage-50 text-sage-600 border border-sage-100 shrink-0">
            <Music2 className="w-4 h-4" />
          </span>
          <span className="font-bold text-[15px] text-ink-900 tracking-tight truncate">
            Organizador de Partituras
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenHelp}
            className="ui-btn-ghost px-2"
            title="Ajuda"
            aria-label="Abrir ajuda"
          >
            <CircleHelp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="ui-btn-ghost px-2"
            title={isDark ? "Tema claro" : "Tema escuro"}
            aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {docInfo && (
            <button
              type="button"
              onClick={onResetProject}
              className="ui-btn-ghost"
            >
              <FilePlus className="w-3.5 h-3.5" />
              Novo arquivo
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
