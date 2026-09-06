"use client";

import React, { useEffect, useState } from 'react';
import { Download, ChevronRight, Calendar, FileText, Calculator, BarChart2 } from 'lucide-react';
import useDeadlineApi from '@/api/useDeadlineApi';
import { Spinner } from '@/components/ui/spinner';

export default function DeadlineView({ clientId }) {
  const { loading, organizationDeadlines, organizationData, getOrganizationDeadlines } = useDeadlineApi();

  useEffect(() => {
    if (clientId) {
      getOrganizationDeadlines(clientId);
    }
  }, [clientId, getOrganizationDeadlines]);

  const getStatusColor = (status) => {
    if (status === "pending") return "text-amber-500 bg-amber-50";
    if (status === "completed") return "text-emerald-500 bg-emerald-50";
    if (status === "overdue") return "text-red-500 bg-red-50";
    return "text-indigo-500 bg-indigo-50";
  };
  
  const getDotColor = (status) => {
    if (status === "pending") return "bg-amber-500";
    if (status === "completed") return "bg-emerald-500";
    if (status === "overdue") return "bg-red-500";
    return "bg-indigo-500";
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return 'No Date';
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} Day(s) Overdue`;
    if (diffDays === 0) return 'Due Today';
    return `${diffDays} Day(s) Left`;
  };

  const formatDate = (dueDate) => {
    if (!dueDate) return 'No Date';
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (type) => {
    if (type === 'payroll') return FileText;
    return Calendar;
  };

  return (
    <div className="flex-1 bg-white dark:bg-zinc-950 p-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Deadlines</h1>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8">
            <div>
              {loading ? (
                <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-2"></div>
              ) : (
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {organizationData?.firm_name || 'Unknown Organization'}
                </h2>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Click a deadline to see required actions, Notes And Penalty Info
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-500"><Spinner className="size-5" />Loading deadlines...</div>
            ) : organizationDeadlines.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No deadlines found.</div>
            ) : (
              organizationDeadlines.map((item) => {
                const IconComponent = getIcon(item.deadline?.type);
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-5 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.deadline?.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.deadline?.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(item.due_date)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.deadline?.type || 'General'}</p>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(item.status)}`}></div>
                        {getDaysLeft(item.due_date)}
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
