"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useInvoiceApi from "@/api/useInvoiceApi";
import useOrganisationApi from "@/api/useOrganisationApi";

const today = () => new Date().toISOString().slice(0, 10);

export default function NewInvoicePage() {
  const router = useRouter();
  const { create, list } = useInvoiceApi();
  const { getBusinessClientsForCalendar } = useOrganisationApi();
  const [clients, setClients] = useState([]);
  const [nextId, setNextId] = useState("Generating...");
  const [issuedAt, setIssuedAt] = useState(today);
  const [form, setForm] = useState({ firm_id: "", due_at: today(), hst_rate: "13" });
  const [items, setItems] = useState([{ description: "", amount: "" }]);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const tax = subtotal * ((Number(form.hst_rate) || 0) / 100);
  const total = subtotal + tax;

  useEffect(() => {
    getBusinessClientsForCalendar().then((firms) => setClients(Array.isArray(firms) ? firms : [])).catch(() => setClients([]));
    list({ sort: "number", direction: "desc" }).then((r) => {
      const latest = r?.invoices?.data?.find((invoice) => /^INV-/.test(invoice.number));
      const sequence = latest?.number?.match(/-(\d+)$/)?.[1];
      setNextId(`INV-${issuedAt.slice(0, 7).replace("-", "")}-${String((Number(sequence) || 0) + 1).padStart(5, "0")}`);
    }).catch(() => setNextId(`INV-${issuedAt.slice(0, 7).replace("-", "")}-#####`));
  }, []);

  const updateItem = (index, field, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const submit = async (event) => {
    event.preventDefault();
    await create({ firm_id: Number(form.firm_id), issued_at: issuedAt, due_at: form.due_at, hst_rate: Number(form.hst_rate), source: "one_time", items: items.map((item) => ({ description: item.description, amount: Number(item.amount) })) });
    router.push("/business/invoices");
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-start">
        <div><p className="text-sm font-medium text-primary">Billing workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Create invoice</h1><p className="mt-2 text-muted-foreground">Create a one-time invoice and post it to the client portal.</p></div>
        <label className="rounded-xl border bg-card px-5 py-3 shadow-sm"><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice ID</span><input className="mt-1 w-44 border-0 bg-transparent p-0 text-lg font-semibold outline-none" value={nextId} onChange={(e) => setNextId(e.target.value)} /></label>
      </header>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold">Invoice details</h2><p className="mt-1 text-sm text-muted-foreground">Choose the client and confirm the billing dates.</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="sm:col-span-3">Client company<select required className="mt-2 w-full rounded-lg border bg-background p-2.5" value={form.firm_id} onChange={(e) => setForm({ ...form, firm_id: e.target.value })}><option value="">Select a client company</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firm_name}</option>)}</select></label><label>Issue date<input required type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-2.5" /></label><label className="sm:col-span-2">Due date<input required min={issuedAt} type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className="mt-2 w-full rounded-lg border bg-background p-2.5" /></label></div></div>
          <div className="rounded-xl border bg-card p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Line items</h2><p className="mt-1 text-sm text-muted-foreground">Add each service or urgent task separately.</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{items.length} {items.length === 1 ? "item" : "items"}</span></div><div className="mt-5 space-y-3">{items.map((item, index) => <div key={index} className="rounded-lg border bg-muted/20 p-3"><div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><input required className="rounded-lg border bg-background p-2.5" placeholder="Service or task description" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} /><input required min="0.01" step="0.01" type="number" className="rounded-lg border bg-background p-2.5" placeholder="Amount (CAD)" value={item.amount} onChange={(e) => updateItem(index, "amount", e.target.value)} />{items.length > 1 && <button type="button" className="px-2 text-sm text-destructive hover:underline" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove</button>}</div></div>)}</div><button type="button" className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted" onClick={() => setItems((current) => [...current, { description: "", amount: "" }])}>＋ Add line item</button></div>
        </div>
        <aside className="h-fit rounded-xl border bg-card p-6 shadow-sm lg:sticky lg:top-6"><h2 className="text-lg font-semibold">Invoice summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>${subtotal.toFixed(2)} CAD</strong></div><label className="flex items-center justify-between gap-3"><span>HST/GST</span><input required min="0" max="100" step="0.01" type="number" className="w-24 rounded-lg border p-2 text-right" value={form.hst_rate} onChange={(e) => setForm({ ...form, hst_rate: e.target.value })} /></label><div className="flex justify-between"><span className="text-muted-foreground">Tax amount</span><strong>${tax.toFixed(2)} CAD</strong></div><div className="my-4 border-t" /><div className="flex items-end justify-between"><span className="font-semibold">Total</span><strong className="text-2xl">${total.toFixed(2)} <span className="text-sm font-normal">CAD</span></strong></div></div><button type="submit" className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm hover:opacity-90">Create and post invoice</button><button type="button" onClick={() => router.push("/business/invoices")} className="mt-3 w-full rounded-lg border px-4 py-3 font-semibold hover:bg-muted">Cancel</button><p className="mt-3 text-center text-xs text-muted-foreground">The invoice will be visible in the client portal after posting.</p></aside>
      </form>
    </section>
  );
}
