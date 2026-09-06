"use client";

import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import useReportsApi from '@/api/useReportsApi';

const formatAmount = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'CAD',
    }).format(amount ?? 0);
  } catch {
    return `${currency || ''} ${amount ?? 0}`.trim();
  }
};

const BalanceSheetSkeleton = () => (
  <div className="bg-card rounded-xl shadow-sm border border-border p-6 w-full animate-pulse">
    <div className="h-4 w-32 bg-muted rounded mb-2" />
    <div className="h-3 w-48 bg-muted rounded mb-6" />
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-3 w-full bg-muted rounded" />
      ))}
    </div>
  </div>
);

const BalanceSheet = ({ organizationId, refreshKey, onRequestUpload, firmId, onPreview }) => {
  const { previewBalanceSheetReport, getBalanceSheetFileUrl, loading } = useReportsApi();
  const [preview, setPreview] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const loadPreview = async () => {
      const payload = await previewBalanceSheetReport({ organizationId });
      setPreview(payload);
      setLoaded(true);
    };
    loadPreview();
  }, [organizationId, refreshKey]);

  const handleViewPdf = async () => {
    if (!firmId) return;
    setViewingPdf(true);
    const payload = await getBalanceSheetFileUrl({ guid: firmId });
    setViewingPdf(false);
    if (payload?.file_url) {
      onPreview?.([{ uri: payload.file_url, fileName: payload.file_name }]);
    }
  };

  if (!loaded && loading) {
    return <BalanceSheetSkeleton />;
  }

  if (!preview) {
    // No CSV-parsed row data (previewBalanceSheetReport), but a PDF-only
    // report (uploadBalanceSheetPdf) may still exist — that's a separate
    // upload path with no rows of its own. Always offer View Preview so a
    // PDF-only upload isn't hidden just because there's no parsed sheet.
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 w-full">
        <h2 className="text-[17px] font-bold text-foreground mb-1">Balance Sheet</h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          No itemized Balance Sheet data available yet.
        </p>
        <div className="flex flex-col gap-2">
          {firmId && (
            <button
              onClick={handleViewPdf}
              disabled={viewingPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {viewingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} View Preview
            </button>
          )}
          {onRequestUpload && (
            <button
              onClick={onRequestUpload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-foreground text-[13px] font-semibold rounded-lg hover:bg-muted transition-opacity"
            >
              Upload BS
            </button>
          )}
        </div>
      </div>
    );
  }

  const {
    report_name,
    firm_name,
    as_at_date,
    currency,
    sections = [],
    intermediate_totals = [],
    total_equity,
  } = preview;

  const asAtDateStr = as_at_date ? `as at ${as_at_date}` : "";

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[17px] font-bold text-foreground mb-1">
          {firm_name ? `${firm_name} - Balance Sheet` : "Balance Sheet"}
        </h2>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <React.Fragment key={section.title || idx}>
            <div>
              <h3 className="text-[11px] font-semibold text-foreground mb-3 tracking-wide">
                {section.title}
              </h3>
              <div className="space-y-2 text-[13px]">
                {(section.items || []).map((item, itemIdx) => {
                  const isRedHighlight = item.meta?.highlight === 'red';
                  return (
                    <div key={item.label || itemIdx} className="flex justify-between items-center text-[13px]">
                      <span className={isRedHighlight ? "text-rose-500 font-medium" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                      <span className={`font-semibold ${isRedHighlight ? "text-rose-500" : "text-foreground"}`}>
                        {formatAmount(item.amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {section.total && (
              <>
                <div className="border-t border-border"></div>
                <div className="flex justify-between items-center text-[13.5px] font-bold text-foreground py-1">
                  <span>{section.total.label}</span>
                  <span>{formatAmount(section.total.amount, currency)}</span>
                </div>
              </>
            )}

            <div className="border-t border-border"></div>
          </React.Fragment>
        ))}

        {intermediate_totals.map((total, idx) => (
          <React.Fragment key={total.label || idx}>
            <div className="flex justify-between items-center text-[13.5px] font-bold text-foreground py-1">
              <span>{total.label}</span>
              <span>{formatAmount(total.amount, currency)}</span>
            </div>
            <div className="border-t border-border"></div>
          </React.Fragment>
        ))}

        {total_equity && (
          <div className="flex justify-between items-center text-[13.5px] font-bold text-[#3B9D82] pt-1">
            <span>{total_equity.label}</span>
            <span>{formatAmount(total_equity.amount, currency)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {firmId && (
        <button
          onClick={handleViewPdf}
          disabled={viewingPdf}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {viewingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} View BS
        </button>
      )}
    </div>
  );
};

export default BalanceSheet;
