"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import IndividualClientEnrolment from "@/components/accountantmanagement/IndividualClientEnrolment";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/spinner";

const IndividualClientEnrolmentContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taxfilerGuid = searchParams.get("guid");

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <IndividualClientEnrolment
        taxfilerGuid={taxfilerGuid}
        onBack={() => router.back()}
      />
    </ProtectedRoute>
  );
};

const IndividualClientEnrolmentPage = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <IndividualClientEnrolmentContent />
    </Suspense>
  );
};

export default IndividualClientEnrolmentPage;
