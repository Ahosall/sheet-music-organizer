import React, { useState, useRef } from "react";
import {
  FileUp,
  FileText,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { PdfDocumentInfo } from "../types/pdf";

interface PdfUploaderProps {
  docInfo: PdfDocumentInfo | null;
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  docInfo,
  onFileSelected,
  isLoading,
  errorMessage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Selecione um arquivo PDF.");
      return;
    }
    onFileSelected(file);
  };

  if (docInfo) {
    return (
      <div className="ui-card px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-sage-50 text-sage-600 border border-sage-100 shrink-0">
            <FileText className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 break-all">
              {docInfo.filename}
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {docInfo.pageCount}{" "}
              {docInfo.pageCount === 1 ? "página" : "páginas"} ·{" "}
              {docInfo.fileSizeBytesFormatted}
            </p>
          </div>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ui-btn-ghost"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Trocar arquivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-16">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl p-12 text-center cursor-pointer border-2 border-dashed transition-colors ${
          isDragging
            ? "border-sage-500 bg-sage-50"
            : "border-cream-300 bg-paper hover:border-sage-400 hover:bg-cream-50"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="application/pdf"
          className="hidden"
        />

        <span
          className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
            isDragging
              ? "bg-sage-100 text-sage-700"
              : "bg-cream-100 text-sage-600"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <FileUp className="w-7 h-7" />
          )}
        </span>

        <p className="text-sm font-semibold text-ink-900">
          {isLoading
            ? "Carregando…"
            : "Arraste um PDF ou clique para selecionar"}
        </p>
        <p className="text-xs text-ink-500 mt-1.5 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sage-500" />O arquivo não sai
          do seu computador.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-3 text-xs text-rose-700 flex items-center gap-1.5 justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
          {errorMessage}
        </p>
      )}
    </div>
  );
};
