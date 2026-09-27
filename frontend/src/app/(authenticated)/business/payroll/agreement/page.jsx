"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";

const displayDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

function PayrollAgreementContent() {
  const searchParams = useSearchParams();
  const requestedFirmGuid = searchParams.get("firmGuid");
  const agreementId = searchParams.get("agreementId");
  const [firmGuid, setFirmGuid] = useState(requestedFirmGuid || "");
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient((localStorage.getItem("userRole") || "").toLowerCase() === "client");
    if (!requestedFirmGuid) setFirmGuid(localStorage.getItem("firmGuid") || "");
  }, [requestedFirmGuid]);

  const loadAgreement = useCallback(async () => {
    if (!firmGuid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const endpoint = agreementId
        ? `/payroll/${firmGuid}/agreements/${agreementId}/view`
        : `/payroll/${firmGuid}/agreements/current`;
      const response = await api.post(endpoint, {}, { headers: { Accept: "application/json" } });
      if (!response?.data?.success) {
        setAgreement(null);
        return;
      }
      const payload = response.data.payload || {};
      setAgreement(payload.agreement || payload);
    } catch {
      setAgreement(null);
      toast.error("Unable to load the payroll agreement");
    } finally {
      setLoading(false);
    }
  }, [agreementId, firmGuid]);

  useEffect(() => { loadAgreement(); }, [loadAgreement]);

  const acceptAgreement = async () => {
    if (!accepted || !agreement?.id) return;
    setSaving(true);
    try {
      const response = await api.post(`/payroll/${firmGuid}/agreements/${agreement.id}/accept`, {
        accepted: true,
      }, { headers: { Accept: "application/json" } });
      if (!response?.data?.success) {
        toast.error("Unable to accept this agreement");
        return;
      }
      toast.success("Payroll agreement accepted");
      loadAgreement();
    } catch {
      toast.error("Unable to accept this agreement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["client", "accountant", "admin"]}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Button variant="link" className="mb-3 px-0" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">{agreement?.title || "Payroll Agreement"}</h1>
          {agreement?.status && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">{agreement.status}</span>}
        </div>
        {agreement?.version && <p className="text-sm text-muted-foreground">Version {agreement.version}</p>}

        {loading ? (
          <div className="py-12 text-sm text-muted-foreground">Loading agreement…</div>
        ) : !agreement ? (
          <div className="mt-8 rounded-lg border p-6 text-sm text-muted-foreground">There is no payroll agreement available for this account yet.</div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Payroll Processing Terms and Conditions</h2>
              <div className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{agreement.body || "No agreement terms were provided."}</div>
              {isClient && agreement.status === "Sent" && (
                <div className="mt-8 rounded-lg border bg-muted/30 p-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1" />
                    <span>I have read and agree to the payroll processing terms and conditions.</span>
                  </label>
                  <Button className="mt-4" disabled={!accepted || saving} onClick={acceptAgreement}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />{saving ? "Submitting…" : "Accept Agreement"}
                  </Button>
                </div>
              )}
              {isClient && agreement.status === "Agreed" && (
                <div className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm">You have already responded to this agreement. Contact your accountant if you need to change your response.</div>
              )}
            </section>

            <aside className="h-fit rounded-lg border p-5">
              <h2 className="font-semibold">Agreement Information</h2>
              <div className="my-4 border-t" />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Version:</dt><dd>{agreement.version || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status:</dt><dd>{agreement.status || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Effective Date:</dt><dd>{displayDate(agreement.effective_date)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Pay Frequency:</dt><dd>{agreement.pay_frequency || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Price Type:</dt><dd>{agreement.price_type || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Price:</dt><dd>{agreement.price == null ? "—" : `${agreement.currency || "CAD"} ${Number(agreement.price).toFixed(2)}`}</dd></div>
              </dl>
              <p className="mt-6 text-xs text-muted-foreground">Fees are charged according to the agreement and pay frequency.</p>
            </aside>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function PayrollAgreementPage() {
  return <PayrollAgreementContent />;
}
