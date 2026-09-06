"use client";

import { Suspense } from "react";
import ViewPayment from "@/components/clientmanagement/payments/ViewPayment";
import { PageLoader } from "@/components/ui/spinner";

export default function ViewBusinessPaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewPayment />
    </Suspense>
  );
}
