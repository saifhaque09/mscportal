"use client";

import ChecklistDocuments from "@/components/clientmanagement/ChecklistDocuments";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import { useSearchParams } from "next/navigation";
import ClientChecklistDocuments from "@/components/clientmanagement/ClientChecklistDocuments";

import { Suspense } from "react";
import CategoryDocuments from "@/components/individualclient/documents/CategoryDocuments";
import { PageLoader } from "@/components/ui/spinner";

const ClientChecklistContent = () => {
  const searchParams = useSearchParams();

//   const checklistGuid = searchParams.get("checklistGuid");
//   const firmGuid = searchParams.get("firmGuid");
const id=searchParams.get('id')
  return (
    <ProtectedRoute allowedRoles={["taxfiler"]}>
      <CategoryDocuments
        // checklistGuid={checklistGuid}
        // firmGuid={firmGuid}
        id={id}
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
