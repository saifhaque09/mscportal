"use client";

import IndividualClientsTable from "@/components/individualaccountant/IndividualClientsTable";
import { Card, CardContent } from "@/components/ui/card";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

function IndividualClientContent() {
  const allowedRoles = ["accountant", "admin", "staff"];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="px-4 md:px-6 py-4">



        <div>
          <IndividualClientsTable />
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function IndividualClientPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <IndividualClientContent />
    </Suspense>
  );
}
