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
import ClientCombobox from "./ClientCombobox";
import DateField from "./DateField";
import {
  TAX_YEAR_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
} from "./paymentsData";
import usePaymentApi from "@/api/usePaymentApi";
import { ROUTES } from "@/config/routes";

export default function EditPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") || searchParams.get("id");
  const taxfilerId = searchParams.get("taxfilerId");

  const [form, setForm] = useState(null);
  const { viewPayment, editPayment, loading } = usePaymentApi();

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
          const payment = response.payload;
          setForm({
            clientId: taxfilerId,
            clientName: payment.client ? `${payment.client.first_name || ""} ${payment.client.last_name || ""}`.trim() : "Unknown Client",
            taxYear: payment.year ? String(payment.year) : "",
            amount: payment.amount ?? "",
            status: payment.status ? (payment.status.charAt(0).toUpperCase() + payment.status.slice(1)) : "Pending",
            type: payment.payment_method ? payment.payment_method.replace("_", "-").replace(/\b\w/g, (l) => l.toUpperCase()) : "",
            date: payment.payment_date?.includes("T") ? payment.payment_date.split("T")[0] : (payment.payment_date ?? ""),
            remark: payment.remarks ?? "",
            transaction_id: payment.transaction_id ?? "",
          });
        }
      } catch (err) {
        toast.error("Payment not found");
        router.replace(ROUTES.individual.payments);
      }
    };

    fetchPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, taxfilerId, router]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  if (!form) return (
    <PageContainer className="flex justify-center items-center h-full">
      <PageLoader />
    </PageContainer>
  );

  const handleSave = async () => {
    if (form.type !== "Cash" && !form.transaction_id) {
      toast.error("Please enter a Transaction ID");
      return;
    }
    try {
      const payload = {
        amount: form.amount,
        payment_method: form.type.toLowerCase().replace("-", "_"),
        status: form.status.toLowerCase(),
        year: form.taxYear,
        payment_date: form.date,
        remarks: form.remark,
        transaction_id: form.transaction_id,
      };

      await editPayment(taxfilerId, paymentId, payload);
      toast.success("Payment updated");
      router.push(ROUTES.individual.payments);
    } catch (err) {
      // Error is handled in hook
    }
  };

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        <Button variant="outline" onClick={() => router.push(ROUTES.individual.payments)}>
          All Payments
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{form.clientName}</h2>
        <p className="text-sm text-muted-foreground">Edit payment details</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>
              Individual Tax Filers(Client) <span className="text-red-500">*</span>
            </Label>
            <ClientCombobox value={form.clientId} disabled />
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
              value={form.transaction_id}
              onChange={(e) => setField("transaction_id", e.target.value)}
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
            disabled={loading}
            className="bg-black text-white hover:bg-black/90"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
