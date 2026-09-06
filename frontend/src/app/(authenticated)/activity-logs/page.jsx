"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ActivityLogsTable from "@/components/activitylogs/ActivityLogsTable";
import { PageLoader } from "@/components/ui/spinner";

export default function ActivityLogsPage() {
  return (
    <ProtectedRoute allowedRoles={["accountant", "staff", "admin", "client", "employee", "taxfiler"]}>
      <Suspense fallback={<PageLoader />}>
        <ActivityLogsTable />
      </Suspense>
    </ProtectedRoute>
  );
}
