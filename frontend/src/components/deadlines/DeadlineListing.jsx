"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useDeadlineApi from '@/api/useDeadlineApi';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import { sortByDueDateAsc } from '@/utils/deadlines';

export default function DeadlineListing() {
  const router = useRouter();
  const { loading, firmDeadlines, getFirmDeadlines, meta } = useDeadlineApi();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    // Adding a debounce for search
    const delayDebounceFn = setTimeout(() => {
      getFirmDeadlines({ page, resultsPerPage, search, type });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [getFirmDeadlines, page, resultsPerPage, search, type]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusColor = (status) => {
    if (status === "pending") return "text-amber-500 border-amber-500 bg-amber-50";
    if (status === "completed") return "text-emerald-500 border-emerald-500 bg-emerald-50";
    if (status === "overdue") return "text-red-500 border-red-500 bg-red-50";
    return "text-indigo-500 border-indigo-500 bg-indigo-50";
  };

  const getClientColor = (name) => {
    const colors = ["bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // The endpoint pages over organizations, not individual deadlines.
  const lastPage = Number(meta?.last_page) > 0 ? Number(meta.last_page) : 1;

  // Flattened across firms, then ordered by due date — the soonest deadline on
  // the page comes first regardless of which client it belongs to. The
  // "+N more" badge rides on its own row, so it follows that firm's earliest.
  const rows = firmDeadlines?.flatMap((firm) => {
    return (firm.deadlines || []).map((item, index) => ({
      id: `${firm.id}-${item.id}`,
      // The API returns only a preview of each firm's deadlines; the rest are
      // reachable from the client view, so flag them on the firm's first row.
      moreDeadlines: index === 0 ? firm.more_deadlines || 0 : 0,
      firmId: firm.guid,
      clientInitials: firm.firm_name ? firm.firm_name.substring(0, 2).toUpperCase() : "NA",
      clientColor: getClientColor(firm.firm_name || "NA"),
      clientName: firm.firm_name,
      clientEmail: firm.client_email,
      deadlineName: item.deadline?.name,
      deadlineDesc: item.deadline?.description,
      frequency: item.deadline?.type === 'payroll' ? 'Payroll' : 'General',
      dueDate: item.due_date,
      status: item.status,
      statusColor: getStatusColor(item.status),
      selected: selectedIds.includes(`${firm.id}-${item.id}`),
    }));
  }) || [];

  const data = sortByDueDateAsc(rows, (row) => row.dueDate);

  return (
    <div className="flex-1 bg-white dark:bg-zinc-950 p-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Deadlines</h1>
        
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">All Clients</h2>
        
        <div className="mb-6 flex gap-4 w-full max-w-xl relative">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search Clients"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white text-sm"
            />
          </div>
          <div className="w-48">
            <select
              className="w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white text-sm"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Deadline Types</option>
           
              <option value="Next Payroll Due">Next Payroll Due</option>
              <option value="Payroll Tax Remittance (PD7A)">Payroll Tax Remittance (PD7A)</option>
              <option value="T4 Submission">T4 Submission</option>
              <option value="GST/HST Remittance">GST/HST Remittance</option>
              <option value="Year End Financial Statements">Year End Financial Statements</option>
              <option value="Corporate Income Tax Return (T2)">Corporate Income Tax Return (T2)</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 text-sm text-slate-500 dark:text-slate-400">
                <th className="py-4 px-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(data.map(d => d.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    checked={data.length > 0 && selectedIds.length === data.length}
                  />
                </th>
                <th className="py-4 px-4 font-medium">Client Name</th>
                <th className="py-4 px-4 font-medium">Deadline Name</th>
                <th className="py-4 px-4 font-medium">Frequency</th>
                <th className="py-4 px-4 font-medium">Due Date</th>
                <th className="py-4 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    <Spinner className="mx-auto size-5" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">No deadlines found</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr 
                    key={item.id} 
                    className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => router.push(ROUTES.dashboard.deadlinesForClient(item.firmId))}
                  >
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={item.selected}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${item.clientColor}`}>
                          {item.clientInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{item.clientName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.clientEmail}</p>
                          {item.moreDeadlines > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              +{item.moreDeadlines} more deadline{item.moreDeadlines > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{item.deadlineName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{item.deadlineDesc}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.frequency}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-red-500 font-medium">{item.dueDate}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="py-4 px-6 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div>
              Total clients: {meta?.total_organizations ?? 0}
              {meta?.total_results != null && (
                <span className="ml-1">({meta.total_results} deadlines)</span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Clients per page</span>
                <select 
                  className="border border-slate-200 dark:border-zinc-800 rounded p-1 dark:bg-zinc-900"
                  value={resultsPerPage}
                  onChange={(e) => {
                    setResultsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span>Page {meta?.current_page || page} of {lastPage}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 disabled:opacity-50">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= lastPage}
                    onClick={() => setPage(Math.min(lastPage, page + 1))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= lastPage}
                    onClick={() => setPage(lastPage)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 disabled:opacity-50">
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
