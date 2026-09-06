"use client";

import { Suspense } from "react";
import ViewPayment from "@/components/individualaccountant/payments/ViewPayment";
import { PageLoader } from "@/components/ui/spinner";

export default function ViewIndividualPaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewPayment />
    </Suspense>
  );
}
