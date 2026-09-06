"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FilingStatusTracker from "@/components/clientmanagement/FilingStatusTracker";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/spinner";

const FilingContent = () => {
  const searchParams = useSearchParams();
  const filingId = searchParams.get("filingId");

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <FilingStatusTracker filingId={filingId} />
    </ProtectedRoute>
  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <FilingContent />
    </Suspense>
  );
};

export default page;
