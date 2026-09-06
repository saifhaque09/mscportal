"use client";
import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import EditOrganisation from "@/components/createorganisation/EditOrganisation";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import OtpProtected from "@/components/global/OtpProtected";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

const EditOrganisationContent = () => {
  const searchParams = useSearchParams();
  const firmGuid = searchParams.get("firmId");
  const router = useRouter();

  return (


    <EditOrganisation firmGuid={firmGuid} onSuccess={() => router.back()} />


  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditOrganisationContent />
    </Suspense>
  );
};

export default page;
