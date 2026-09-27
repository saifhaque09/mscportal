"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ROUTES } from "@/config/routes";
import useDeadlineApi from "@/api/useDeadlineApi";

const tabs = [
  { id: "tax", label: "TAX" },
  { id: "pd7a", label: "PD7A" },
];

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${year}-${month}-${day}`;
}

function threeDaysBefore(value) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 3);
  return date.toISOString().slice(0, 10);
}

export default function DeadlineReminders() {
  const [activeTab, setActiveTab] = useState("tax");
  const [savingId, setSavingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [paymentDateDrafts, setPaymentDateDrafts] = useState({});
  const {
    reminderRows,
    remindersLoading,
    getReminders,
    updateReminderPayment,
    sendReminder,
  } = useDeadlineApi();

  useEffect(() => {
    getReminders(activeTab);
  }, [activeTab, getReminders]);

  const savePaymentDetails = async (row, paymentStatus, paymentDate) => {
    setSavingId(row.id);
    await updateReminderPayment(row.id, paymentStatus, paymentDate);
    setSavingId(null);
  };

  const handleSendReminder = async (row) => {
    setSendingId(row.id);
    await sendReminder(row.id);
    setSendingId(null);
  };

  return (
    <main className="min-h-screen flex-1 bg-white p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Link
              href={ROUTES.dashboard.deadlines}
              className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Deadlines
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reminders</h1>
          </div>
          <div className="text-right text-sm text-slate-500 dark:text-slate-400">
            <p>Payment reminders by client</p>
            <Link
              href={`${ROUTES.account.settings}?tab=email-templates`}
              className="text-blue-600 underline dark:text-blue-400"
            >
              Manage reminder email template
            </Link>
          </div>
        </div>

        <div className="mb-5 flex gap-2" role="tablist" aria-label="Reminder type">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg border px-5 py-2 text-sm font-medium ${activeTab === tab.id
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500 dark:border-zinc-800 dark:text-slate-400">
                <th className="px-4 py-4 font-medium">Client</th>
                <th className="px-4 py-4 font-medium">Due date</th>
                <th className="px-4 py-4 font-medium">Reminder dates</th>
                <th className="px-4 py-4 font-medium">Payment status</th>
                <th className="px-4 py-4 font-medium">Payment date</th>
                <th className="px-4 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {remindersLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading reminders" />
                  </td>
                </tr>
              ) : reminderRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No reminders found for this type.
                  </td>
                </tr>
              ) : reminderRows.map((row) => {
                const paymentDate = paymentDateDrafts[row.id] ?? row.payment_date ?? "";
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0 dark:border-zinc-800">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{row.client_name}</p>
                      {row.client_email && <p className="text-xs text-slate-500">{row.client_email}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-red-500">{formatDate(row.due_date)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <p>3-day: {threeDaysBefore(row.due_date)}</p>
                      <p>Final: {formatDate(row.due_date)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        aria-label={`Payment status for ${row.client_name}`}
                        value={row.payment_status || "Pending"}
                        disabled={savingId === row.id}
                        onChange={(event) => savePaymentDetails(row, event.target.value, paymentDate)}
                        className="w-full min-w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="date"
                        aria-label={`Payment date for ${row.client_name}`}
                        value={paymentDate}
                        disabled={savingId === row.id}
                        onChange={(event) => setPaymentDateDrafts((drafts) => ({ ...drafts, [row.id]: event.target.value }))}
                        onBlur={() => {
                          if (paymentDate !== (row.payment_date || "")) {
                            savePaymentDetails(row, row.payment_status || "Pending", paymentDate);
                          }
                        }}
                        className="w-full min-w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={sendingId === row.id || !row.client_email}
                        onClick={() => handleSendReminder(row)}
                        className="whitespace-nowrap rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {sendingId === row.id ? "Sending…" : "Send email + notification"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Reminders are intended for email and in-app notifications. The accountant can manage the generic reminder email template from Settings.
        </p>
      </div>
    </main>
  );
}
