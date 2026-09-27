"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 10;
const AGREEMENT_FILTERS = ["Draft", "Pending", "Sent", "Inactive", "Agreed", "Reject"];
const PAYROLL_FILTERS = ["Not Started", "Submitted", "Critical", "Processed", "Alerted"];
const FREQUENCIES = ["Monthly", "Semi-Monthly", "Bi-Weekly", "Weekly", "Bi-Monthly", "Annual", "Quarterly"];

const dateLabel = (value) => {
  if (!value || value === "NA") return "--";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

const statusStyle = (status) => {
  if (status === "Agreed" || status === "Processed") return "bg-emerald-100 text-emerald-700";
  if (status === "Reject" || status === "Critical" || status === "Alerted") return "bg-red-100 text-red-700";
  if (status === "Sent" || status === "Draft" || status === "Pending" || status === "Submitted") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

function AllPayrollContent() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState("all");
  const [agreementStatus, setAgreementStatus] = useState("all");
  const [payrollStatus, setPayrollStatus] = useState("all");
  const [createFirm, setCreateFirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    title: "Payroll Processing Terms and Conditions",
    body: "",
    effective_date: new Date().toISOString().slice(0, 10),
    price_type: "per person",
    price: "",
    currency: "CAD",
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("page", String(page));
      form.append("results_per_page", String(PAGE_SIZE));
      form.append("search", search.trim());
      if (frequency !== "all") form.append("payment_type", frequency);
      if (agreementStatus !== "all") form.append("agreement_status", agreementStatus);
      if (payrollStatus !== "all") form.append("payroll_status", payrollStatus);

      const response = await api.post("/payroll/review/queue", form, {
        headers: { Accept: "application/json" },
      });
      if (response?.data?.success) {
        setRows(response.data.payload?.data || []);
        setMeta(response.data.payload?.meta || null);
      } else {
        setRows([]);
        setMeta(null);
        toast.error("Unable to load payroll clients");
      }
    } catch {
      setRows([]);
      setMeta(null);
      toast.error("Unable to load payroll clients");
    } finally {
      setLoading(false);
    }
  }, [agreementStatus, frequency, page, payrollStatus, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadRows, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRows, search]);

  const openCreateAgreement = async (firm) => {
    setCreateFirm(firm);
    setAgreementForm((current) => ({
      ...current,
      title: "Payroll Processing Terms and Conditions",
      body: "",
      effective_date: new Date().toISOString().slice(0, 10),
      price: "",
    }));
    try {
      const response = await api.post("/payroll/agreements/default", {}, {
        headers: { Accept: "application/json" },
      });
      if (response?.data?.success) {
        const template = response.data.payload || {};
        setAgreementForm((current) => ({ ...current, title: template.title || current.title, body: template.body || "" }));
      }
    } catch {
      toast.error("Could not load the default agreement wording");
    }
  };

  const createAgreement = async (event) => {
    event.preventDefault();
    if (!createFirm) return;
    setSaving(true);
    try {
      const response = await api.post(`/payroll/${createFirm.guid}/agreements/create`, {
        ...agreementForm,
        price: agreementForm.price === "" ? null : Number(agreementForm.price),
      }, { headers: { Accept: "application/json" } });
      if (!response?.data?.success) {
        toast.error("Could not create the payroll agreement");
        return;
      }
      toast.success(`Agreement draft created for ${createFirm.firm_name}`);
      setCreateFirm(null);
      loadRows();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not create the payroll agreement");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFrequency("all");
    setAgreementStatus("all");
    setPayrollStatus("all");
    setPage(1);
  };

  const totalPages = Math.max(1, Number(meta?.last_page || 1));

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">All Payroll</h1>
          <p className="text-sm text-muted-foreground">Showing all listing for Payroll</p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Input
            aria-label="Search by company name"
            className="w-full sm:max-w-[225px]"
            placeholder="Search by Company Name"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          <Select value={frequency} onValueChange={(value) => { setFrequency(value); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[185px]"><SelectValue placeholder="Payroll Frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Payroll Frequency</SelectItem>
              {FREQUENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={agreementStatus} onValueChange={(value) => { setAgreementStatus(value); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[185px]"><SelectValue placeholder="Agreement Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Agreement Status</SelectItem>
              {AGREEMENT_FILTERS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={payrollStatus} onValueChange={(value) => { setPayrollStatus(value); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Payroll Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Payroll Status</SelectItem>
              {PAYROLL_FILTERS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="link" className="px-1 text-red-500 underline" onClick={resetFilters}>Reset Filter</Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Payroll Frequency</TableHead>
                <TableHead>Agreement Status</TableHead>
                <TableHead>Last Payroll</TableHead>
                <TableHead>Payroll Due</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Payroll Status</TableHead>
                <TableHead className="min-w-[300px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-28 text-center text-muted-foreground">Loading payroll clients…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-28 text-center text-muted-foreground">No payroll clients found.</TableCell></TableRow>
              ) : rows.map((firm) => {
                const agreement = firm.agreement_status || "Pending";
                const payroll = firm.payroll_status || "Not Started";
                const canCreate = Boolean(firm.can_create_agreement);
                return (
                  <TableRow key={firm.guid}>
                    <TableCell>
                      <div className="font-semibold">{firm.firm_name}</div>
                      <div className="text-xs text-primary">Company ID: {firm.guid}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{firm.payment_type || "--"}</TableCell>
                    <TableCell><span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyle(agreement)}`}>{agreement}</span></TableCell>
                    <TableCell>{dateLabel(firm.last_payment_date)}</TableCell>
                    <TableCell className={firm.payroll_due_date && firm.payroll_due_date !== "NA" ? "text-red-600" : ""}>{dateLabel(firm.payroll_due_date)}</TableCell>
                    <TableCell>{Number(firm.employee_count || 0)}</TableCell>
                    <TableCell><span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyle(payroll)}`}>{payroll}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="border-primary text-primary" onClick={() => router.push(`/business/dashboard/admin?firmId=${encodeURIComponent(firm.guid)}`)}>Access Portal</Button>
                        {canCreate ? (
                          <Button onClick={() => openCreateAgreement(firm)}>Create Agreement</Button>
                        ) : (
                          <Button variant="outline" className="border-primary text-primary" onClick={() => router.push(`/business/payroll/agreement?firmGuid=${encodeURIComponent(firm.guid)}&agreementId=${encodeURIComponent(firm.current_agreement?.id || "")}`)}>
                            Revise Agreement <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Total results: {meta?.total_results ?? rows.length}</span>
          <div className="flex items-center gap-3">
            <span>Rows per page</span>
            <span className="rounded-md border px-3 py-2">{PAGE_SIZE}</span>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(1)} aria-label="First page">«</Button>
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">‹</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} aria-label="Next page">›</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)} aria-label="Last page">»</Button>
          </div>
        </div>

        <Dialog open={Boolean(createFirm)} onOpenChange={(open) => !open && !saving && setCreateFirm(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Payroll Agreement</DialogTitle>
              <DialogDescription>{createFirm?.firm_name} · {createFirm?.payment_type || "Pay frequency not set"}</DialogDescription>
            </DialogHeader>
            <form id="payroll-agreement-form" onSubmit={createAgreement} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="agreement-title">Agreement title</Label><Input id="agreement-title" value={agreementForm.title} onChange={(event) => setAgreementForm({ ...agreementForm, title: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="agreement-body">Terms and conditions</Label><textarea id="agreement-body" className="min-h-48 w-full rounded-md border bg-background p-3 text-sm" value={agreementForm.body} onChange={(event) => setAgreementForm({ ...agreementForm, body: event.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="agreement-effective-date">Effective date</Label><Input id="agreement-effective-date" type="date" value={agreementForm.effective_date} onChange={(event) => setAgreementForm({ ...agreementForm, effective_date: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="agreement-price-type">Price type</Label><Select value={agreementForm.price_type} onValueChange={(value) => setAgreementForm({ ...agreementForm, price_type: value })}><SelectTrigger id="agreement-price-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per person">Per Person</SelectItem><SelectItem value="total per run">Total per run</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="agreement-price">Price (CAD)</Label><Input id="agreement-price" type="number" min="0" step="0.01" value={agreementForm.price} onChange={(event) => setAgreementForm({ ...agreementForm, price: event.target.value })} /></div>
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setCreateFirm(null)}>Cancel</Button>
              <Button type="submit" form="payroll-agreement-form" disabled={saving}>{saving ? "Creating…" : "Create Agreement"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

export default function PayrollPage() {
  return <AllPayrollContent />;
}
