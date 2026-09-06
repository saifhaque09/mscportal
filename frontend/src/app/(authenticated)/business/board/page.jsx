"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, X } from "lucide-react";
import ProfitLossChart from "@/components/widget/ProfitLossChart";
import ProfitLossSheet from "@/components/widget/ProfitLossSheet";
import BalanceSheet from "@/components/widget/BalanceSheet";
import InfoCards from "@/components/widget/InfoCards";
import UploadModal from "@/components/widget/UploadModal";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";
import MyFilingCard from "@/components/clientmanagement/MyFilingCard";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { PageLoader } from "@/components/ui/spinner";

function NewDashboardContent() {
  const searchParams = useSearchParams();
  // Client/Employee reach this page from the sidebar's bare "/business/board"
  // link with no query string at all — fall back to the firmGuid stored at
  // login, same fix as AllUsers.jsx, otherwise organizationId never resolves
  // and every widget silently renders its empty state.
  const firmId =
    searchParams.get("firmId") ||
    (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : null);
  const [activeModal, setActiveModal] = useState(null); // 'pl' | 'bs' | 'csv' | null
  const [plRefreshKey, setPlRefreshKey] = useState(0);
  const [bsRefreshKey, setBsRefreshKey] = useState(0);
  const [previewDocuments, setPreviewDocuments] = useState(null);
  const [userRole] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("userRole") : null
  );
  const { viewOrganisation, viewOrganisationData } = useOrganisationApi();

  useEffect(() => {
    if (firmId) {
      viewOrganisation({ firmGuid: firmId });
    }
  }, [firmId]);

  const canUploadReports = userRole === "admin" || userRole === "accountant";
  const organizationId = viewOrganisationData?.payload?.id;

  const uploadButtons = canUploadReports && (
    <>
      <button
        onClick={() => setActiveModal("pl")}
        className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border border-border rounded-lg bg-card text-foreground hover:bg-muted transition-colors"
      >
        <Upload className="w-3.5 h-3.5" /> Upload P&amp;L
      </button>
      <button
        onClick={() => setActiveModal("bs")}
        className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border border-border rounded-lg bg-card text-foreground hover:bg-muted transition-colors"
      >
        <Upload className="w-3.5 h-3.5" /> Upload BS
      </button>
      <button
        onClick={() => setActiveModal("csv")}
        className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border border-border rounded-lg bg-card text-foreground hover:bg-muted transition-colors"
      >
        <Upload className="w-3.5 h-3.5" /> Upload CSV
      </button>
    </>
  );

  return (
    <ListingPageLayout
      title="Profit & Loss Summary Board"
      subtitle="Income and Expense Trusted by Department"
      toolbar={uploadButtons && <Toolbar right={uploadButtons} />}
      bordered={false}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <ProfitLossChart organizationId={organizationId} refreshKey={plRefreshKey + bsRefreshKey} />
          <InfoCards firmId={firmId} organisation={viewOrganisationData?.payload} />
        </div>

        {/* Right Column */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <ProfitLossSheet
            organizationId={organizationId}
            refreshKey={plRefreshKey}
            onRequestUpload={canUploadReports ? () => setActiveModal("pl") : undefined}
            firmId={firmId}
            onPreview={setPreviewDocuments}
          />
          <BalanceSheet
            organizationId={organizationId}
            refreshKey={bsRefreshKey}
            onRequestUpload={canUploadReports ? () => setActiveModal("bs") : undefined}
            firmId={firmId}
            onPreview={setPreviewDocuments}
          />
          <MyFilingCard organizationId={organizationId} />
        </div>
      </div>

      {/* Upload Modals */}
      <UploadModal
        type="pl"
        open={activeModal === "pl"}
        onClose={() => setActiveModal(null)}
        organizationId={organizationId}
        onUploaded={() => setPlRefreshKey((key) => key + 1)}
      />
      <UploadModal
        type="bs"
        open={activeModal === "bs"}
        onClose={() => setActiveModal(null)}
        organizationId={organizationId}
        onUploaded={() => setBsRefreshKey((key) => key + 1)}
      />
      <UploadModal
        type="csv"
        open={activeModal === "csv"}
        onClose={() => setActiveModal(null)}
        organizationId={organizationId}
        onUploaded={() => {
          setPlRefreshKey((key) => key + 1);
          setBsRefreshKey((key) => key + 1);
        }}
      />

      {/* PDF Preview Modal */}
      <Dialog open={!!previewDocuments} onOpenChange={(v) => !v && setPreviewDocuments(null)}>
        <DialogContent showCloseButton={false} className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex justify-between items-center p-4 border-b shrink-0">
            <h2 className="text-lg font-semibold">Document Preview</h2>
            <button 
              onClick={() => setPreviewDocuments(null)} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
               <X className="w-5 h-5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" />
            </button>
          </div>
          <div className="h-[75vh] w-full flex-1 relative bg-slate-50 dark:bg-zinc-950">
            {previewDocuments && <DocumentViewer documents={previewDocuments} />}
          </div>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
  );
}

export default function NewDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewDashboardContent />
    </Suspense>
  );
}
