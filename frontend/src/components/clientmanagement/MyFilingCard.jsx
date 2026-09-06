"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useFilingApi from "@/api/useFilingApi";
import { ROUTES } from "@/config/routes";

const STEP_LABELS = {
  draft: "Preparing your filing",
  sent: "Awaiting your signature",
  signed: "Signed — awaiting CRA submission",
  filed: "Filed with CRA",
};

export default function MyFilingCard({ organizationId }) {
  const router = useRouter();
  const { loading, filingStatus, getLatestFiling } = useFilingApi();

  useEffect(() => {
    if (organizationId) {
      getLatestFiling(organizationId);
    }
  }, [organizationId]);

  if (loading && !filingStatus) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card flex items-center justify-center h-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!filingStatus) {
    return null;
  }

  const { filing } = filingStatus;
  const needsSignature = filing.status === "sent";

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-foreground">
          My filing — {filing.year}
        </p>
      </div>
      <p className="text-[13px] text-muted-foreground mb-3">
        {STEP_LABELS[filing.status] ?? filing.status}
      </p>
      {needsSignature && (
        <Button
          size="sm"
          className="bg-black text-white hover:bg-gray-800"
          onClick={() => router.push(ROUTES.account.myDocumentsFiling)}
        >
          Review now
        </Button>
      )}
    </div>
  );
}
