"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageContainer from "@/components/ui/PageContainer";
import { PageLoader } from "@/components/ui/spinner";
import FirmCombobox from "./FirmCombobox";
import DateField from "./DateField";
import {
  TAX_YEAR_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
} from "./paymentsData";
import useBusinessPaymentApi from "@/api/useBusinessPaymentApi";
import { ROUTES } from "@/config/routes";

export default function EditPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") || searchParams.get("id");
  const firmId = searchParams.get("firmId");

  const [form, setForm] = useState(null);
  const { viewBusinessPayment, editBusinessPayment, loading: saving } = useBusinessPaymentApi();

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
          const payment = res.payload;
          setForm({
            firmId: payment.firm?.guid || firmId,
            firmName: payment.firm?.firm_name || "",
            clientId: payment.client?.id ?? payment.client_id ?? "",
            taxYear: payment.year ? String(payment.year) : "",
            amount: payment.amount ?? "",
            status: payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : "Pending",
            type: payment.payment_method ? payment.payment_method.replace("_", "-").replace(/\b\w/g, (l) => l.toUpperCase()) : "",
            date: payment.payment_date?.includes("T") ? payment.payment_date.split("T")[0] : (payment.payment_date ?? ""),
            remark: payment.remarks ?? "",
            transactionId: payment.transaction_id ?? "",
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

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  if (!form) return (
    <PageContainer className="flex justify-center items-center h-full">
      <PageLoader />
    </PageContainer>
  );

  const handleSave = async () => {
    if (!form.clientId) {
      toast.error("This payment has no linked client contact and cannot be edited");
      return;
    }
    if (form.type !== "Cash" && !form.transactionId) {
      toast.error("Please enter a Transaction ID");
      return;
    }
    try {
      const payload = {
        client_id: form.clientId,
        year: form.taxYear,
        amount: form.amount,
        payment_method: form.type.toLowerCase().replace("-", "_"),
        status: form.status.toLowerCase(),
        payment_date: form.date,
        remarks: form.remark,
        transaction_id: form.transactionId,
      };

      const res = await editBusinessPayment(firmId, paymentId, payload);
      if (res && res.success) {
        toast.success("Payment updated successfully");
        router.push(ROUTES.business.payments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        <Button variant="outline" onClick={() => router.push(ROUTES.business.payments)}>
          All Payments
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{form.firmName}</h2>
        <p className="text-sm text-muted-foreground">Edit payment details</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>
              Business Client <span className="text-red-500">*</span>
            </Label>
            <FirmCombobox value={form.firmId} disabled />
          </div>

          <div className="space-y-2">
            <Label>
              Tax Return<span className="text-red-500">*</span>
            </Label>
            <Select value={form.taxYear} onValueChange={(v) => setField("taxYear", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {TAX_YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Enter Amount"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Payment Status <span className="text-red-500">*</span>
            </Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Payment Type <span className="text-red-500">*</span>
            </Label>
            <Select value={form.type} onValueChange={(v) => setField("type", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <DateField value={form.date} onChange={(v) => setField("date", v)} />
          </div>

          <div className="space-y-2">
            <Label>
              Transaction ID {form.type !== "Cash" && <span className="text-red-500">*</span>}
            </Label>
            <Input
              placeholder="Enter Transaction ID"
              value={form.transactionId}
              onChange={(e) => setField("transactionId", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Remark</Label>
            <Textarea
              placeholder="Add Remark"
              value={form.remark}
              onChange={(e) => setField("remark", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white hover:bg-black/90"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
