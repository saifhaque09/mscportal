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
import useBusinessPaymentApi from "@/api/useBusinessPaymentApi";
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
  const firmId = searchParams.get("firmId");

  const [payment, setPayment] = useState(null);
  const [firm, setFirm] = useState(null);
  const { viewBusinessPayment } = useBusinessPaymentApi();

  useEffect(() => {
    if (!paymentId || !firmId) {
      toast.error("Invalid payment URL");
      router.replace(ROUTES.business.payments);
      return;
    }

    const loadPayment = async () => {
      try {
        const res = await viewBusinessPayment(firmId, paymentId);
        if (res && res.success && res.payload) {
          const record = res.payload;
          setPayment({
            id: record.id,
            firmId: record.firm?.guid || firmId,
            firmName: record.firm?.firm_name || "",
            taxYear: record.year ? String(record.year) : "",
            amount: record.amount ?? "",
            status: record.status ?? "pending",
            type: record.payment_method ?? "",
            date: record.payment_date ?? "",
            remark: record.remarks ?? "",
            transactionId: record.transaction_id ?? "",
          });
          setFirm({
            contact_email: record.firm?.contact_email || record.client?.email,
            mobile: record.firm?.contact_mobile || record.client?.mobile,
            registration_date: record.firm?.created_at,
          });
        }
      } catch (err) {
        toast.error("Payment not found");
        router.replace(ROUTES.business.payments);
      }
    };

    loadPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, firmId, router]);

  if (!payment) {
    return (
      <PageContainer className="flex justify-center items-center h-full">
        <PageLoader />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        <Button variant="outline" onClick={() => router.push(ROUTES.business.payments)}>
          All Payments
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Firm Name" value={payment.firmName} />
            <DetailRow label="Email" value={firm?.contact_email} />
            <DetailRow label="Contact Number" value={firm?.mobile} />
            <DetailRow label="Registration Date" value={formatDisplayDate(firm?.registration_date?.split?.("T")[0])} />
            <Link
              href={`${ROUTES.business.view}?firmId=${payment.firmId}`}
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
              onClick={() => router.push(`${ROUTES.business.paymentsEdit}?firmId=${payment.firmId}&paymentId=${payment.id}`)}
              aria-label="Edit Payment"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <DetailRow label="Tax Return" value={payment.taxYear} />
              <DetailRow label="Amount" value={formatCurrency(payment.amount)} />
              <DetailRow label="Payment Type" value={displayPaymentMethod(payment.type)} />
              <DetailRow label="Date" value={formatDisplayDate(payment.date)} />
              <DetailRow label="Remark" value={payment.remark || "N/A"} />
              <DetailRow label="Transaction ID" value={payment.transactionId || "N/A"} />
            </div>

            <div className="space-y-2 pt-2">
              {(() => {
                const currentStatus = PAYMENT_STATUS_OPTIONS.find((o) => o.toLowerCase() === (payment.status || "").toLowerCase()) || "Pending";
                const meta = STATUS_META[currentStatus];
                const Icon = meta.icon;
                return (
                  <div className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left ${meta.wrapper}`}>
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
