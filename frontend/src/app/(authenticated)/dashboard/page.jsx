"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserCheck,
  Building2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ROUTES } from "@/config/routes";
import useUserApi from "@/api/useUserApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import useDocumentApi from "@/api/useDocumentApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";

const STATUS_STYLES = {
  approved: { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  pending:  { badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         dot: "bg-amber-500"   },
  rejected: { badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",                 dot: "bg-red-500"     },
  review:   { badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",             dot: "bg-blue-500"    },
};

function getStatusStyle(status) {
  const key = status?.toLowerCase();
  return STATUS_STYLES[key] || { badge: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400", dot: "bg-slate-400" };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const allowedRoles = ["accountant", "admin", "staff"];
  const router = useRouter();
  const { getRecentOnboarding, recentOnboarding, loading, getInvitesCount, getStaffCount } = useUserApi();
  const { getBusinessClientsCount, getIndividualClientsCount, getPaymentsSummary } = useClientManagementApi();
  const { getRecentDocumentFilingStatus, recentFilingStatus, loading: filingLoading } = useDocumentApi();

  const [businessCount, setBusinessCount] = useState(0);
  const [individualCount, setIndividualCount] = useState(0);
  const [invitesCount, setInvitesCount] = useState({ platform_invites: 0, business_invites: 0, total: 0 });
  const [staffCount, setStaffCount] = useState(0);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [role] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem("userRole") || "").toLowerCase()
  );

  useEffect(() => {
    getRecentOnboarding();
    getRecentDocumentFilingStatus();

    const fetchCounts = async () => {
      const busResult = await getBusinessClientsCount();
      if (busResult !== null) {
        if (typeof busResult === 'object') {
          setBusinessCount(busResult?.total_business_count ?? 0);
        } else {
          setBusinessCount(busResult);
        }
      }

      const indResult = await getIndividualClientsCount();
      if (indResult !== null) {
        if (typeof indResult === 'object') {
          setIndividualCount(indResult?.total_individual_count ?? 0);
        } else {
          setIndividualCount(indResult);
        }
      }

      const invResult = await getInvitesCount();
      if (invResult !== null) {
        setInvitesCount(invResult);
      }

      const staffResult = await getStaffCount();
      if (staffResult !== null) {
        setStaffCount(staffResult?.total_staff ?? 0);
      }

      // Payment Pending is an Admin-only card — Accountant/Staff don't see
      // it on their dashboard, so skip the fetch entirely for them.
      if (role === "admin") {
        const paymentsResult = await getPaymentsSummary();
        if (paymentsResult !== null) {
          setPaymentsSummary(paymentsResult);
        }
      }
    };
    fetchCounts();
  }, []);

  const totalClients = (Number(businessCount) || 0) + (Number(individualCount) || 0);
  const isAdmin = role === "admin";
  const canViewPayments = isAdmin;
  const pendingAmount = Number(paymentsSummary?.pending_amount) || 0;
  const pendingCount = Number(paymentsSummary?.pending_count) || 0;

  const stats = [
    {
      title: isAdmin ? "Total Clients" : "My Clients",
      value: totalClients.toString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-400",
      details: [
        { label: "Business", value: businessCount.toString(), icon: Building2 },
        { label: "Individual", value: individualCount.toString(), icon: UserCheck },
      ],
    },
    {
      title: isAdmin ? "Pending Invites" : "Invites Sent By Me",
      value: (invitesCount?.total || 0).toString(),
      subtext: "Waiting for acceptance",
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-400",
      details: [
        { label: "Business", value: (invitesCount?.business_invites || 0).toString(), icon: Building2 },
        { label: "Individual", value: (invitesCount?.platform_invites || 0).toString(), icon: UserCheck },
      ],
    },
    ...(canViewPayments
      ? [
          {
            title: "Payment Pending",
            value: pendingAmount.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }),
            subtext: `${pendingCount} invoice${pendingCount === 1 ? "" : "s"} outstanding`,
            icon: DollarSign,
            gradient: "from-purple-500 to-pink-400",
            details: null,
          },
        ]
      : []),
    {
      title: "Total Staff",
      value: (staffCount || 0).toString(),
      subtext: isAdmin ? "Staff members" : "Staff on my clients",
      icon: Briefcase,
      gradient: "from-orange-500 to-amber-400",
      details: null,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <ListingPageLayout
        title="Dashboard Overview"
        subtitle="Welcome back. Here is the latest update across your accounts."
        bordered={false}
      >
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 hover:shadow-lg transition-all duration-300 group overflow-hidden relative"
            >
              {/* Subtle top gradient bar */}
              <div
                className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${stat.gradient} opacity-80`}
              ></div>

              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                {stat.details && stat.subtext && (
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                    {stat.subtext}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                  {stat.title}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </span>
                </div>
                {!stat.details && stat.subtext && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mt-2">
                    {stat.subtext}
                  </p>
                )}
              </div>

              {/* Extended Details for specific cards (Like Total Clients) */}
              {stat.details && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
                  {stat.details.map((detail, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <detail.icon className="w-3.5 h-3.5" />
                        <span className="text-xs">{detail.label}</span>
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Document Filing Status */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-7 shadow-sm border border-slate-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Document Filing Status
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Real-time progression of ongoing tax filings.
                </p>
              </div>

            </div>

            <div className="space-y-4">
              {filingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : recentFilingStatus.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No recent filings</p>
              ) : (
                recentFilingStatus.map((item, index) => {
                  const style = getStatusStyle(item.status);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.firm_name}
                          </h4>
                          {item.file_title && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.file_title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${style.badge}`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Invite Acceptances */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-7 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Onboarding
              </h2>
            </div>

            <div className="flex-1 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : recentOnboarding.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No recent onboarding</p>
              ) : (
                recentOnboarding.map((invite, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm">
                      {invite.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {invite.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          invite.type === 'business'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {invite.type.charAt(0).toUpperCase() + invite.type.slice(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {invite.time_ago}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => router.push(`${ROUTES.account.activityLogs}?tab=all`)}
              className="w-full mt-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-slate-100 dark:border-zinc-800"
            >
              View All Activity
            </button>
          </div>

        </div>
      </ListingPageLayout>
    </ProtectedRoute>
  );
}
