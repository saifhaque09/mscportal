"use client";

import { Suspense } from "react";
import EditPayment from "@/components/clientmanagement/payments/EditPayment";
import { PageLoader } from "@/components/ui/spinner";

export default function EditBusinessPaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditPayment />
    </Suspense>
  );
}
