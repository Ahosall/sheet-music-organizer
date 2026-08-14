/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Files } from "lucide-react";
import { Header } from "./components/Header";
import { PdfUploader } from "./components/PdfUploader";
import { PdfViewer } from "./components/PdfViewer";
import { GroupCreator } from "./components/GroupCreator";
import { GroupList } from "./components/GroupList";
import { ExportPanel } from "./components/ExportPanel";
import { HelpModal } from "./components/HelpModal";
import { GroupPreviewModal } from "./components/GroupPreviewModal";
import { PageInspectModal } from "./components/PageInspectModal";
import { SaveGroupsModal } from "./components/SaveGroupsModal";
import { usePdfOrganizer } from "./hooks/usePdfOrganizer";

export default function App() {
  const {
    docInfo,
    pdfProxy,
    thumbnails,
    groups,
    selectedViewerPages,
    editingGroup,
    previewGroup,
    inspectPageNumber,
    isLoadingPdf,
    errorMessage,
    isExporting,
    exportProgress,
    generatedFiles,
    setSelectedViewerPages,
    setEditingGroup,
    setPreviewGroup,
    setInspectPageNumber,
    handleFileSelected,
    handleResetProject,
    handleSaveGroup,
    handleDeleteGroup,
    handleDuplicateGroup,
    handleMoveGroup,
    handleSortByFirstPage,
    handleClearAllGroups,
    handleGeneratePdfs,
    pendingLeaveAction,
    handleExportGroups,
    handleImportGroups,
    handleConfirmSaveAndLeave,
    handleSkipSaveAndLeave,
    handleCancelLeave,
  } = usePdfOrganizer();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const scrollToCreator = () => {
    document
      .getElementById("group-creator-card")
      ?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("group-name-input")?.focus();
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-cream-50 text-ink-900">
      <Header
        docInfo={docInfo}
        onResetProject={handleResetProject}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 overflow-y-auto lg:overflow-hidden">
        <PdfUploader
          docInfo={docInfo}
          onFileSelected={handleFileSelected}
          isLoading={isLoadingPdf}
          errorMessage={errorMessage}
        />

        {docInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 lg:overflow-hidden">
            <div className="lg:col-span-7 flex flex-col min-h-0 gap-3 lg:overflow-hidden">
              <div className="flex items-baseline gap-2.5 px-0.5 shrink-0">
                <Files className="w-4 h-4 text-sage-600 shrink-0 relative top-0.5" />
                <h2 className="text-sm font-semibold text-ink-900">Páginas</h2>
                <span className="text-xs text-ink-500">
                  Clique para selecionar · Shift+clique para intervalo
                </span>
              </div>

              <PdfViewer
                thumbnails={thumbnails}
                selectedPages={selectedViewerPages}
                groups={groups}
                onSelectPages={setSelectedViewerPages}
                onInspectPage={(page) => setInspectPageNumber(page)}
                onCreateGroupFromSelection={scrollToCreator}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col min-h-0 gap-4 lg:overflow-hidden">
              <GroupCreator
                totalPages={docInfo.pageCount}
                existingGroups={groups}
                selectedViewerPages={selectedViewerPages}
                editingGroup={editingGroup}
                onSaveGroup={handleSaveGroup}
                onCancelEdit={() => setEditingGroup(null)}
                onClearViewerSelection={() => setSelectedViewerPages([])}
              />

              <div
                className={
                  groups.length > 0
                    ? "flex-1 min-h-48 lg:min-h-0 overflow-hidden"
                    : undefined
                }
              >
                <GroupList
                  groups={groups}
                  thumbnails={thumbnails}
                  totalPages={docInfo.pageCount}
                  onEditGroup={(group) => {
                    setEditingGroup(group);
                    scrollToCreator();
                  }}
                  onDeleteGroup={handleDeleteGroup}
                  onDuplicateGroup={handleDuplicateGroup}
                  onPreviewGroup={(group) => setPreviewGroup(group)}
                  onMoveGroup={handleMoveGroup}
                  onSortByFirstPage={handleSortByFirstPage}
                  onClearAllGroups={handleClearAllGroups}
                  onOpenExport={() => setIsExportOpen(true)}
                  onExportGroups={handleExportGroups}
                  onImportGroups={handleImportGroups}
                  isExporting={isExporting}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <HelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <SaveGroupsModal
        open={pendingLeaveAction !== null}
        groupCount={groups.length}
        reason={pendingLeaveAction?.type === "reset" ? "reset" : "file-change"}
        onCancel={handleCancelLeave}
        onSkip={handleSkipSaveAndLeave}
        onSave={handleConfirmSaveAndLeave}
      />

      <ExportPanel
        docInfo={docInfo}
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        groups={groups}
        isExporting={isExporting}
        exportProgress={exportProgress}
        generatedFiles={generatedFiles}
        onGeneratePdfs={handleGeneratePdfs}
      />

      <GroupPreviewModal
        group={previewGroup}
        thumbnails={thumbnails}
        pdfProxy={pdfProxy}
        onClose={() => setPreviewGroup(null)}
      />

      <PageInspectModal
        pageNumber={inspectPageNumber}
        totalPages={docInfo?.pageCount || 1}
        thumbnails={thumbnails}
        groups={groups}
        pdfProxy={pdfProxy}
        onClose={() => setInspectPageNumber(null)}
        onNavigatePage={(p) => setInspectPageNumber(p)}
      />
    </div>
  );
}
