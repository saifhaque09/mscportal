"use client";

import ChecklistDocuments from "@/components/clientmanagement/ChecklistDocuments";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

const AdminChecklistContent = () => {
  const searchParams = useSearchParams();

  const checklistGuid = searchParams.get("id");
  const firmGuid = searchParams.get("firmId");
  const checklistId = searchParams.get("checklistId");
  const categoryId = searchParams.get("categoryId");

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin", "staff"]}>
      <ChecklistDocuments
        checklistGuid={checklistGuid}
        firmGuid={firmGuid}
        checklistId={checklistId}
        categoryId={categoryId}
      />
    </ProtectedRoute>
  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminChecklistContent />
    </Suspense>
  );
};

export default page;
