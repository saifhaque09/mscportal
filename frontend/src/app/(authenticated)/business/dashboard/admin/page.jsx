"use client";


import ProtectedRoute from "@/components/ProtectedRoute";
import ClientChecklist from "@/components/clientmanagement/ClientChecklist";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

export default function ClientDashboardAdminContent() {
  return (
    <ProtectedRoute allowedRoles={["accountant", "admin", "staff"]}>
      <div className="w-full space-y-6">
        <Suspense fallback={<PageLoader />}>
          <ClientChecklist />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
