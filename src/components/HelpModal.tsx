import React, { useEffect } from "react";
import {
  CircleHelp,
  X,
  FileUp,
  MousePointerClick,
  Plus,
  Layers,
  FileOutput,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    icon: FileUp,
    title: "1. Envie o PDF",
    body: "Arraste o arquivo ou clique na área de envio. Depois você pode trocar o arquivo ou começar de novo com Novo arquivo no topo.",
  },
  {
    icon: MousePointerClick,
    title: "2. Selecione as páginas",
    body: "Clique para marcar ou desmarcar. Shift+clique seleciona um intervalo. Use os filtros (Todas, Sem grupo, Agrupadas), a busca e o tamanho das miniaturas (P, M, G, XL). A lupa ou o duplo clique abre a página ampliada.",
  },
  {
    icon: Plus,
    title: "3. Crie um grupo",
    body: 'Informe um nome (ex.: Trompete 1) e as páginas, como 1-3, 7, 10-12. A seleção das miniaturas preenche o intervalo automaticamente. Sem seleção, o próximo intervalo é sugerido. Se uma página já estiver em outro grupo, confirme Incluir mesmo assim.',
  },
  {
    icon: Layers,
    title: "4. Organize os grupos",
    body: "Reordene com as setas, ordene pela primeira página, visualize, edite, duplique ou exclua. A busca encontra grupos por nome ou número de página. Exporte a lista em .txt e importe em outro PDF da mesma peça — a importação substitui os grupos atuais.",
  },
  {
    icon: FileOutput,
    title: "5. Exporte",
    body: "Em Gerar PDFs, defina um prefixo opcional (ex.: Ensaio 2026 - Trompete 1.pdf), gere os arquivos, visualize, baixe um a um ou tudo em ZIP. Marque Separar grupos por pasta para o ZIP criar uma pasta com o nome de cada grupo.",
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        className="bg-paper border border-cream-200 w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-cream-50 border-b border-cream-200 flex items-center justify-between gap-3 shrink-0">
          <h3
            id="help-dialog-title"
            className="text-sm font-semibold text-ink-900 flex items-center gap-2"
          >
            <CircleHelp className="w-3.5 h-3.5 text-sage-600" />
            Como usar
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

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-sm text-ink-600">
            Separe um PDF grande em arquivos menores, um por grupo — por
            instrumento, naipe ou trecho.
          </p>

          <ol className="space-y-3.5">
            {sections.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-sage-50 text-sage-600 border border-sage-100 shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
                  <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="text-xs text-ink-700 border border-honey-100 bg-honey-50 p-3 rounded-xl space-y-2">
            <p className="flex items-start gap-2 font-semibold text-ink-800">
              <Lightbulb className="w-3.5 h-3.5 text-honey-600 shrink-0 mt-0.5" />
              Dicas
            </p>
            <ul className="pl-6 space-y-1 text-ink-600 list-disc">
              <li>Uma página pode pertencer a vários grupos.</li>
              <li>
                Caracteres inválidos no nome do arquivo são trocados
                automaticamente.
              </li>
              <li>
                Os grupos ficam salvos neste navegador. Ao reabrir o mesmo PDF,
                a lista volta.
              </li>
              <li>
                Novo arquivo e Trocar arquivo perguntam se deseja salvar os
                grupos em .txt.
              </li>
              <li>Novo arquivo limpa os grupos e o PDF atual.</li>
            </ul>
          </div>

          <p className="text-xs text-ink-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-500 shrink-0" />
            O arquivo não sai do seu computador.
          </p>
        </div>
      </div>
    </div>
  );
};
