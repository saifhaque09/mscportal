"use client";
import React, { Suspense } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateOrganisation from "@/components/createorganisation/CreateOrganisation";

import ProtectedRoute from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";
const Page = () => {
  const [organisationCreated, setOrganisationCreated] = useState(false);
  const [organisationGuid, setOrganisationGuid] = useState(null);
  const router = useRouter();

  const handleOrganisationCreated = (guid) => {
    setOrganisationGuid(guid);
    setOrganisationCreated(true);
    console.log("guid", guid);
  };

  const handleInviteSuccess = () => {
    router.push(ROUTES.dashboard.root);
  };

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <Suspense fallback={<PageLoader />}>
        <CreateOrganisation onSuccess={handleOrganisationCreated} />
      </Suspense>
    </ProtectedRoute>
  );
};

export default Page;
