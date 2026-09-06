"use client";

import { Suspense } from "react";
import EditPayment from "@/components/individualaccountant/payments/EditPayment";
import { PageLoader } from "@/components/ui/spinner";

export default function EditIndividualPaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditPayment />
    </Suspense>
  );
}
