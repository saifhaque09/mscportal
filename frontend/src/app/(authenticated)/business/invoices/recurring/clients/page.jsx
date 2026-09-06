"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useInvoiceApi from "@/api/useInvoiceApi";

export default function RecurringAgreementClientsPage() {
  const { list } = useInvoiceApi();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    list({ type: "recurring" }).then((response) => setInvoices(response?.invoices?.data || [])).catch(() => setInvoices([]));
  }, []);

  const clients = useMemo(() => {
    const grouped = new Map();
    invoices.forEach((invoice) => {
      const firm = invoice.firm;
      if (!firm || grouped.has(firm.id)) return;
      grouped.set(firm.id, { ...firm, latestInvoice: invoice, monthlyAmount: invoice.total, startDate: invoice.issued_at });
    });
    return [...grouped.values()].filter((client) => client.firm_name.toLowerCase().includes(search.toLowerCase()));
  }, [invoices, search]);

  return <section className="space-y-5"><Link className="underline" href="/business/invoices/recurring">← Back to recurring agreements</Link><div><h1 className="text-2xl font-semibold">Agreement clients</h1><p className="text-muted-foreground">Review recurring billing agreements separately for each client company.</p></div><div className="flex justify-end"><input aria-label="Search agreement clients" placeholder="Search companies..." className="rounded border p-2" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="rounded border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Company</th><th className="p-3">Agreement amount per month</th><th className="p-3">Agreement start date</th><th className="p-3">Latest invoice</th><th className="p-3">Review</th></tr></thead><tbody>{clients.map((client) => <tr className="border-b" key={client.id}><td className="p-3 font-medium">{client.firm_name}</td><td className="p-3">${Number(client.monthlyAmount || 0).toFixed(2)}</td><td className="p-3">{String(client.startDate || "").slice(0, 10) || "-"}</td><td className="p-3">{client.latestInvoice.number}</td><td className="p-3"><Link className="underline" href={`/business/invoices/recurring/clients/${client.id}`}>View invoices</Link></td></tr>)}</tbody></table>{!clients.length && <p className="p-6 text-muted-foreground">No recurring-agreement clients found.</p>}</div></section>;
}






