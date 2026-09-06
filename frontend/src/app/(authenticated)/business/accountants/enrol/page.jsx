"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ClientAccountantEnrolment from "@/components/accountantmanagement/ClientAccountantEnrolment";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/spinner";

const ClientAccountantEnrolmentContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firmGuid = searchParams.get("guid");

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <ClientAccountantEnrolment
        firmGuid={firmGuid}
        onBack={() => router.back()}
      />
    </ProtectedRoute>
  );
};

const ClientAccountantEnrolmentPage = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClientAccountantEnrolmentContent />
    </Suspense>
  );
};

export default ClientAccountantEnrolmentPage;
