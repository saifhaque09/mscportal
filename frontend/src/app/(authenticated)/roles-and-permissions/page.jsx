"use client";

import { Suspense } from "react";
import RolesAndPermissions from "@/components/accountantmanagement/RolesAndPermissions";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/spinner";

const RolesAndPermissionsContent = () => {
  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <RolesAndPermissions />
    </ProtectedRoute>
  );
};

const RolesAndPermissionsPage = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <RolesAndPermissionsContent />
    </Suspense>
  );
};

export default RolesAndPermissionsPage;
