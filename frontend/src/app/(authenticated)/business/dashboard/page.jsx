"use client";

import DocumentListing from "@/app/(authenticated)/documents/documentslisting/DocumentListing";
import ProtectedRoute from "@/components/ProtectedRoute";
export default function DashboardPage() {



  return (
    <ProtectedRoute allowedRoles={["client", "employee"]}>
      <DocumentListing />
    </ProtectedRoute>
  );
}
