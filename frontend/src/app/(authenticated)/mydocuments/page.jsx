import ProtectedRoute from "@/components/ProtectedRoute";
import React, { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";
import DocumentsFilesListing from "@/app/(authenticated)/documents/documentslisting/DocumentFilesListing";

const Page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={["client", "employee"]}>
        <DocumentsFilesListing />
      </ProtectedRoute>
    </Suspense>
  );
};

export default Page;
