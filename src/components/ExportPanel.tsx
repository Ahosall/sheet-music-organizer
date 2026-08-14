import React, { useEffect, useState } from "react";
import {
  Download,
  FileArchive,
  Eye,
  FileOutput,
  FolderTree,
  Loader2,
  X,
} from "lucide-react";
import {
  ExportProgressState,
  GeneratedPdfResult,
  PdfDocumentInfo,
  PdfGroup,
} from "../types/pdf";
import { buildPdfFilename } from "../utils/filenameSanitizer";
import { buildZipEntryPath, createAndDownloadZip } from "../services/zipService";
import { downloadBlob } from "../services/pdfService";

interface ExportPanelProps {
  docInfo: PdfDocumentInfo | null;
  open: boolean;
  onClose: () => void;
  groups: PdfGroup[];
  isExporting: boolean;
  exportProgress: ExportProgressState;
  generatedFiles: GeneratedPdfResult[];
  onGeneratePdfs: (prefix: string) => Promise<void>;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  docInfo,
  open,
  onClose,
  groups,
  isExporting,
  exportProgress,
  generatedFiles,
  onGeneratePdfs,
}) => {
  const [prefix, setPrefix] = useState("");
  const [zipName, setZipName] = useState("partituras.zip");
  const [isZipNameEdited, setIsZipNameEdited] = useState(false);
  const [separateByFolder, setSeparateByFolder] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const derivedZipName = `${prefix.trim() || "partituras"}.zip`;
  const displayedZipName = isZipNameEdited ? zipName : derivedZipName;

  useEffect(() => {
    const stem = (docInfo?.filename || "").replace(/\.pdf$/i, "").trim();
    setPrefix(stem);
    setZipName(`${stem || "partituras"}.zip`);
    setIsZipNameEdited(false);
  }, [docInfo?.filename]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExporting && !isZipping) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isExporting, isZipping, onClose]);

  if (!open) return null;

  const handleGenerate = async () => {
    await onGeneratePdfs(prefix);
  };

  const handleDownloadAllZip = async () => {
    if (generatedFiles.length === 0) return;
    setIsZipping(true);
    setZipProgress(0);

    try {
      await createAndDownloadZip(
        generatedFiles,
        displayedZipName,
        (percent) => {
          setZipProgress(percent);
        },
        { separateByFolder }
      );
    } catch (err) {
      alert("Erro ao criar ZIP: " + (err as Error).message);
    } finally {
      setIsZipping(false);
    }
  };

  const previewName = groups.length > 0 ? groups[0].name : "Trompete 1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50"
      onClick={() => {
        if (!isExporting && !isZipping) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="bg-paper border border-cream-200 w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-cream-50 border-b border-cream-200 flex items-center justify-between gap-3 shrink-0">
          <h3
            id="export-dialog-title"
            className="text-sm font-semibold text-ink-900 flex items-center gap-2"
          >
            <FileOutput className="w-3.5 h-3.5 text-honey-600" />
            Exportar
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-cream-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div>
            <label className="ui-label">Prefixo dos arquivos</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Opcional"
              className="ui-input"
            />
            <p className="text-xs text-ink-500 mt-1.5 font-mono">
              {buildZipEntryPath(
                {
                  filename: buildPdfFilename(previewName, prefix),
                  groupName: previewName,
                },
                separateByFolder
              )}
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={separateByFolder}
              onChange={(e) => setSeparateByFolder(e.target.checked)}
              className="mt-0.5 rounded accent-sage-600"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-800">
                <FolderTree className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                Separar grupos por pasta
              </span>
              <span className="block text-xs text-ink-500 mt-0.5">
                {separateByFolder
                  ? `No ZIP, cada PDF fica em uma pasta com o nome do grupo.`
                  : "No ZIP, todos os PDFs ficam na raiz."}
              </span>
            </span>
          </label>

          <div>
            <label className="ui-label">Nome do ZIP</label>
            <input
              type="text"
              value={displayedZipName}
              onChange={(e) => {
                setIsZipNameEdited(true);
                setZipName(e.target.value);
              }}
              className="ui-input"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={groups.length === 0 || isExporting}
            className="ui-btn-honey"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {`Gerando ${exportProgress.currentStep}/${exportProgress.totalSteps}…`}
              </>
            ) : (
              <>
                <FileOutput className="w-3.5 h-3.5" />
                {`Gerar PDFs (${groups.length})`}
              </>
            )}
          </button>

          {isExporting && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-honey-600 rounded-full transition-all"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              <p className="text-xs text-ink-600">
                {exportProgress.currentGroupName} · {exportProgress.percent}%
              </p>
            </div>
          )}

          {generatedFiles.length > 0 && (
            <div className="pt-3 border-t border-cream-100 space-y-2.5">
              <p className="text-xs font-medium text-ink-600">
                {generatedFiles.length} arquivos
              </p>

              <ul className="space-y-0.5 max-h-52 overflow-y-auto">
                {generatedFiles.map((file) => (
                  <li
                    key={file.groupId}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 px-1.5 rounded-lg hover:bg-cream-50"
                  >
                    <span
                      className="truncate text-ink-800"
                      title={buildZipEntryPath(file, separateByFolder)}
                    >
                      {buildZipEntryPath(file, separateByFolder)}
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ui-icon-btn"
                        title="Ver"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadBlob(file.blob, file.filename)}
                        className="ui-icon-btn"
                        title="Baixar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="ui-btn-ghost w-full py-2.5"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {`ZIP ${zipProgress}%…`}
                  </>
                ) : (
                  <>
                    <FileArchive className="w-3.5 h-3.5" />
                    Baixar ZIP
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
