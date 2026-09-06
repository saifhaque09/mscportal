"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, Pencil, XCircle } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";
import { PageLoader } from "@/components/ui/spinner";
import {
  PAYMENT_STATUS_OPTIONS,
  formatCurrency,
  formatDisplayDate,
} from "./paymentsData";
import usePaymentApi from "@/api/usePaymentApi";
import { ROUTES } from "@/config/routes";

const STATUS_META = {
  Paid: {
    icon: AlertCircle,
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconWrapper: "bg-emerald-500 text-white",
  },
  Pending: {
    icon: Clock,
    wrapper: "border-amber-200 bg-amber-50 text-amber-700",
    iconWrapper: "bg-amber-500 text-white",
  },
  Cancelled: {
    icon: XCircle,
    wrapper: "border-rose-200 bg-rose-50 text-rose-700",
    iconWrapper: "bg-rose-500 text-white",
  },
};

function displayPaymentMethod(method) {
  if (!method) return "N/A";
  return method.replace("_", "-").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ViewPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") || searchParams.get("id");
  const taxfilerId = searchParams.get("taxfilerId");

  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState("Pending");
  const { viewPayment, loading } = usePaymentApi();

  useEffect(() => {
    if (!paymentId || !taxfilerId) {
      toast.error("Invalid payment URL");
      router.replace(ROUTES.individual.payments);
      return;
    }

    const fetchPayment = async () => {
      try {
        const response = await viewPayment(taxfilerId, paymentId);
        if (response && response.payload) {
          setPayment(response.payload);
          setStatus(response.payload.status ? (response.payload.status.charAt(0).toUpperCase() + response.payload.status.slice(1)) : "Pending");
        }
      } catch (err) {
        toast.error("Payment not found");
        router.replace(ROUTES.individual.payments);
      }
    };

    fetchPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, taxfilerId, router]);

  if (loading || !payment) {
    return (
      <PageContainer className="flex justify-center items-center h-full">
        {loading ? <PageLoader /> : <p>Payment not found.</p>}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        <Button variant="outline" onClick={() => router.push(ROUTES.individual.payments)}>
          All Payments
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Client Name" value={payment.client ? `${payment.client.first_name || ""} ${payment.client.last_name || ""}`.trim() : "Unknown Client"} />
            <DetailRow label="Email" value={payment.client?.email} />
            <DetailRow label="Contact Number" value={payment.client?.mobile} />
            <DetailRow label="Registration Date" value={formatDisplayDate(payment.client?.created_at?.includes("T") ? payment.client.created_at.split("T")[0] : payment.client?.created_at)} />
            <Link
              href={`${ROUTES.individual.taxfilerView}?taxFilerGuid=${taxfilerId}`}
              className="inline-block text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              View Client Profile
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payment History</CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(ROUTES.individual.paymentsEdit + `?taxfilerId=${taxfilerId}&paymentId=${payment.id}`)}
              aria-label="Edit Payment"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <DetailRow label="Tax Return" value={payment.year} />
              <DetailRow label="Amount" value={formatCurrency(payment.amount)} />
              <DetailRow label="Payment Type" value={displayPaymentMethod(payment.payment_method)} />
              <DetailRow label="Date" value={formatDisplayDate(payment.payment_date?.includes("T") ? payment.payment_date.split("T")[0] : payment.payment_date)} />
              <DetailRow label="Remark" value={payment.remarks || "N/A"} />
              <DetailRow label="Transaction ID" value={payment.transaction_id || "N/A"} />
            </div>

            <div className="space-y-2 pt-2">
              {(() => {
                const currentStatus = PAYMENT_STATUS_OPTIONS.find(
                  (opt) => opt.toLowerCase() === status.toLowerCase()
                ) || "Pending";
                const meta = STATUS_META[currentStatus];
                const Icon = meta.icon;
                return (
                  <div
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left ${meta.wrapper}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.iconWrapper}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{currentStatus}</span>
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-right font-medium text-foreground">{value ?? "N/A"}</span>
    </div>
  );
}
