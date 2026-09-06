"use client";

import ChecklistDocuments from "@/components/clientmanagement/ChecklistDocuments";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import { useSearchParams } from "next/navigation";
import ClientChecklistDocuments from "@/components/clientmanagement/ClientChecklistDocuments";

import { Suspense } from "react";
import CategoryDocuments from "@/components/individualclient/documents/CategoryDocuments";
import TaxFilerCategoryDocuments from "@/components/individualaccountant/documents/TaxFilerCategoryDocuments";
import { PageLoader } from "@/components/ui/spinner";

const ClientChecklistContent = () => {
  const searchParams = useSearchParams();

//   const checklistGuid = searchParams.get("checklistGuid");
//   const firmGuid = searchParams.get("firmGuid");
const id=searchParams.get('id')
const UserId=searchParams.get('Userid')
const taxFilerGuid=searchParams.get('taxFilerGuid')
  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <TaxFilerCategoryDocuments
        // checklistGuid={checklistGuid}
        // firmGuid={firmGuid}
        id={id}
        UserId={UserId}
        taxFilerGuid={taxFilerGuid}
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
