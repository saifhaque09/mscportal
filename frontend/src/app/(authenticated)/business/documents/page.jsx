import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import DocumentsFilesListing from "@/app/(authenticated)/documents/documentslisting/DocumentFilesListing";


import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={["client", "accountant", "admin", "employee"]}>

        <DocumentsFilesListing />
      </ProtectedRoute>
    </Suspense>
  );
};

export default page;
