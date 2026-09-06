"use client";

import ChecklistDocuments from "@/components/clientmanagement/ChecklistDocuments";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import { useSearchParams } from "next/navigation";
import ClientChecklistDocuments from "@/components/clientmanagement/ClientChecklistDocuments";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

const ClientChecklistContent = () => {
  const searchParams = useSearchParams();

  const checklistGuid = searchParams.get("checklistGuid");
  const firmGuid = searchParams.get("firmGuid");

  return (
    <ProtectedRoute allowedRoles={["client","employee"]}>
      <ClientChecklistDocuments
        checklistGuid={checklistGuid}
        firmGuid={firmGuid}
      />
    </ProtectedRoute>
  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClientChecklistContent />
    </Suspense>
  );
};

export default page;
