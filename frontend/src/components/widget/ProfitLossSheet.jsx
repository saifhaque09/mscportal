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

const ProfitLossSheetSkeleton = () => (
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

const ProfitLossSheet = ({ organizationId, refreshKey, onRequestUpload, firmId, onPreview }) => {
  const { previewProfitLossReport, getProfitLossFileUrl, loading } = useReportsApi();
  const [preview, setPreview] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const loadPreview = async () => {
      const payload = await previewProfitLossReport({ organizationId });
      setPreview(payload);
      setLoaded(true);
    };
    loadPreview();
  }, [organizationId, refreshKey]);

  const handleViewPdf = async () => {
    if (!firmId) return;
    setViewingPdf(true);
    const payload = await getProfitLossFileUrl({ guid: firmId });
    setViewingPdf(false);
    if (payload?.file_url) {
      onPreview?.([{ uri: payload.file_url, fileName: payload.file_name }]);
    }
  };

  if (!loaded && loading) {
    return <ProfitLossSheetSkeleton />;
  }

  if (!preview) {
    // No CSV-parsed row data (previewProfitLossReport), but a PDF-only
    // report (uploadProfitLossPdf) may still exist — that's a separate
    // upload path with no rows of its own. Always offer View Preview so a
    // PDF-only upload isn't hidden just because there's no parsed sheet.
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 w-full">
        <h2 className="text-lg font-bold text-foreground mb-1">Profit and Loss</h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          No itemized Profit &amp; Loss data available yet.
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
              Upload P&amp;L
            </button>
          )}
        </div>
      </div>
    );
  }

  const {
    report_name,
    firm_name,
    from_date,
    to_date,
    currency,
    operating_revenues = 0,
    non_operating_revenues = 0,
    other_adjustments = 0,
    less_cost_of_good_sold = 0,
    gross_profit = 0,
    fix_expenses = 0,
    variable_expenses = 0,
    other_expenses = 0,
    total_expenses = 0,
    new_profit = 0,
  } = preview;

  const dateRange = from_date && to_date ? `For ${from_date} - ${to_date}` : "";

  const sections = [
    {
      title: "Revenue",
      items: [
        { label: "Operating Revenues", amount: operating_revenues },
        { label: "Non-Operating Revenues", amount: non_operating_revenues },
        { label: "Other Adjustments", amount: other_adjustments },
      ],
      total: { label: "Gross Profit", amount: gross_profit },
    },
    {
      title: "Expenses",
      items: [
        { label: "Fixed Expenses", amount: fix_expenses },
        { label: "Variable Expenses", amount: variable_expenses },
        { label: "Other Expenses", amount: other_expenses },
      ],
      total: { label: "Total Expenses", amount: total_expenses },
    },
  ];

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">
          {firm_name ? `${firm_name} - Profit & Loss` : "Profit & Loss"}
        </h2>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <React.Fragment key={section.title || idx}>
            <div>
              <h3 className="text-[11px] font-semibold text-foreground mb-3 tracking-wide">
                {section.title}
              </h3>
              <div className="space-y-2">
                {(section.items || []).map((item, itemIdx) => (
                  <div key={item.label || itemIdx} className="flex justify-between items-center text-[13px]">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{formatAmount(item.amount, currency)}</span>
                  </div>
                ))}
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

        <div className="flex justify-between items-center text-[13.5px] font-bold text-[#3B9D82] pt-1">
          <span>Net Profit</span>
          <span>{formatAmount(new_profit, currency)}</span>
        </div>
      </div>

      {/* Actions */}
      {firmId && (
        <button
          onClick={handleViewPdf}
          disabled={viewingPdf}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {viewingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} View P&amp;L
        </button>
      )}
    </div>
  );
};

export default ProfitLossSheet;
