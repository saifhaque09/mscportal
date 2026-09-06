"use client";

import AllClientsTable from "@/components/createorganisation/AllOrganisationTable";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import ProtectedRoute from "@/components/ProtectedRoute";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Suspense, useEffect } from "react";
import { PageLoader } from "@/components/ui/spinner";

const ALLOWED_ROLES = ["accountant", "admin", "staff"];

function BusinessClientContent() {
  const { getAllBusinessClients, meta } = useOrganisationApi();

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return;
    }
    getAllBusinessClients();
  }, []);

  const totalClients = meta?.total_results;

  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <div className="px-4 md:px-6 py-4">



        <div>
          <AllClientsTable />
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function BusinessClientPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <BusinessClientContent />
    </Suspense>
  );
}
