"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, Phone, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import { ROUTES } from "@/config/routes";

const GREEN = {
  solid: "#16a34a", // green-600
  soft: "#86efac", // green-300
  faint: "#dcfce7", // green-100
};

const ModernBarChart = ({ data, height = 140, showLabels = true }) => {
  const uid = useId();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const paddingX = 12;
  const paddingY = 12;
  const n = Math.max(data.length, 1);

  const width = 100; // use percentage-based scaling
  const available = width - paddingX * 2;

  const gap = 4; // small consistent gap
  const barWidth = (available - gap * (n - 1)) / n;

  const corner = Math.min(10, barWidth / 2);
  const baselineY = height - paddingY;
  const maxBarHeight = height - paddingY * 2;

  return (
    <div className="w-full">
      <svg
        role="img"
        aria-label="CRA codes by category"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[140px]"
        preserveAspectRatio="none"
      >
      <defs>
        <linearGradient id={`${uid}-barFill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={GREEN.solid} stopOpacity="0.95" />
          <stop offset="100%" stopColor={GREEN.solid} stopOpacity="0.6" />
        </linearGradient>

        <filter
          id={`${uid}-barShadow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor={GREEN.solid}
            floodOpacity="0.15"
          />
        </filter>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((t) => {
        const y = paddingY + (1 - t) * maxBarHeight;
        return (
          <line
            key={t}
            x1={paddingX}
            x2={width - paddingX}
            y1={y}
            y2={y}
            stroke={GREEN.faint}
            strokeOpacity="0.6"
          />
        );
      })}

      {/* Bars */}
      {data.map((d, idx) => {
        const value = Math.max(0, d.value);
        const barHeight = Math.max(8, (value / maxValue) * maxBarHeight);

        const x = paddingX + idx * (barWidth + gap);
        const y = baselineY - barHeight;

        return (
          <g key={d.label} filter={`url(#${uid}-barShadow)`}>
            <title>
              {d.label}: {d.value}
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={corner}
              fill={`url(#${uid}-barFill)`}
            />
          </g>
        );
      })}
      </svg>

      {showLabels ? (
        <div
          className="mt-2 text-[10px] text-muted-foreground"
          style={{
            paddingLeft: `${paddingX}%`,
            paddingRight: `${paddingX}%`,
          }}
        >
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`,
              columnGap: `${gap}%`,
            }}
          >
            {data.map((d) => (
              <span key={d.label} className="text-center truncate" title={d.label}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({ title, subtitle, children }) => {
  return (
    <Card className="border-muted/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};

const TaxFilerDashboard = () => {
  const [userRole, setUserRole] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [codesSummary, setCodesSummary] = useState(null);
  const [team, setTeam] = useState([]);
  const searchParams = useSearchParams();
  const taxFilerGuid = searchParams.get("taxFilerGuid");
  const userId = searchParams.get("userId");
  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const router = useRouter();
  const {
    getUserCategories,
    userCategoryData,
    getMyCodesSummary,
  } = useTaxfilerApi();
  const { getMyTaxfilerTeam } = useOrganisationApi();

  const handleDocuments = () => {
    if (userRole === "accountant" || userRole === "admin") {
      router.push(ROUTES.taxfiler.clientSubcategories + `?taxFilerGuid=${taxFilerGuid}&userId=${userId}`);
    } else {
      // Taxfiler viewing their own dashboard — self-scoped, no query params needed.
      router.push(ROUTES.taxfiler.clientSubcategories);
    }
  };

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      const nameCandidate =
        parsed?.name ??
        parsed?.full_name ??
        parsed?.fullName ??
        parsed?.first_name ??
        localStorage.getItem("userName");
      if (nameCandidate) setDisplayName(String(nameCandidate));
    } catch {
      // ignore
    }

    getUserCategories(1, 100);
    getMyCodesSummary().then((result) => {
      if (result) setCodesSummary(result);
    });
    getMyTaxfilerTeam().then((result) => setTeam(result ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const codeRows = codesSummary?.data ?? [];
  const netTotal = Number(codesSummary?.net_total) || 0;

  const codesByCategory = codeRows.reduce((acc, row) => {
    const label = row.sub_category_name ?? "Other";
    acc[label] = (acc[label] ?? 0) + Number(row.value ?? 0);
    return acc;
  }, {});
  const categoryChartData = Object.entries(codesByCategory).map(([label, value]) => ({
    label,
    value,
  }));

  const categories = userCategoryData ?? [];
  const totalCategories = categories.length;
  const categoriesWithDocs = categories.filter(
    (item) => (item.document_names ?? item.documents ?? []).length > 0
  ).length;

  return (
    <ListingPageLayout title="Tax Filer Dashboard" bordered={false}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-9 border-muted/70 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Welcome{displayName ? `, ${displayName}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{todayLabel}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xl">Your Tax Filing Overview</CardTitle>
                  <Button
                    variant="secondary"
                    className="bg-green-50 text-green-700 hover:bg-green-100"
                    onClick={handleDocuments}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Access Documents
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-xl border bg-gradient-to-b from-green-50/70 to-background p-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">CRA Codes Summary</p>
                    <p className="text-xs text-muted-foreground">
                      Value entered by category, this year
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {netTotal.toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div className="mt-3">
                  {categoryChartData.length > 0 ? (
                    <ModernBarChart data={categoryChartData} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No CRA codes entered yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <StatCard title="Documents Uploaded" subtitle="Subcategories with at least one file">
                  <p className="text-3xl font-semibold tracking-tight">
                    {categoriesWithDocs}
                    <span className="text-lg text-muted-foreground"> / {totalCategories}</span>
                  </p>
                </StatCard>

                <StatCard title="CRA Codes Entered" subtitle="Individual code/value pairs on file">
                  <p className="text-3xl font-semibold tracking-tight">{codeRows.length}</p>
                </StatCard>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Your Team
              </h3>
              {team.length === 0 ? (
                <Card className="border-muted/70 shadow-md rounded-2xl">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">
                      No accountant assigned yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                team.map((member) => {
                  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase() || "?";
                  const fullName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.email;
                  return (
                    <Card key={member.id} className="border-muted/70 shadow-md rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 overflow-hidden rounded-full bg-green-100 ring-1 ring-green-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 font-semibold">{initials}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold leading-6 truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.role_name}</p>
                            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                              {member.email && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                              {member.mobile && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{member.mobile}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
    </ListingPageLayout>
  );
};

export default TaxFilerDashboard;
