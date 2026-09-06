"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FilingCodeReview from "@/components/clientmanagement/FilingCodeReview";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/spinner";
import {
  resolveFirmGuidFromParams,
  resolveFirmNumericIdFromParams,
} from "@/hooks/useFirmGuid";

// This is the one screen that needs both ids: the code summary is keyed by guid
// (`clients/business/{guid}/subcategory-codes`) while `filing/start` takes the
// numeric `firm_id`. The URL carries them as `?firmId=<guid>&firmNumericId=<id>`;
// the resolvers also understand the old `?firmId=<id>&firmGuid=<guid>` links.
const ReviewContent = () => {
  const searchParams = useSearchParams();
  const firmGuid = resolveFirmGuidFromParams(searchParams);
  const firmNumericId = resolveFirmNumericIdFromParams(searchParams);

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <FilingCodeReview firmId={firmNumericId} firmGuid={firmGuid} />
    </ProtectedRoute>
  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ReviewContent />
    </Suspense>
  );
};

export default page;
