"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import useOrganisationApi from "@/api/useOrganisationApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { Spinner } from "@/components/ui/spinner";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

const ROWS_OPTIONS = [10, 20, 50];

const BG_COLORS = [
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
];

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-700",
  "bg-blue-200 text-blue-700",
  "bg-purple-200 text-purple-700",
  "bg-orange-200 text-orange-700",
];

function getColorForId(id) {
  return BG_COLORS[id % BG_COLORS.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getAvatarColor(name = "") {
  return AVATAR_COLORS[name.length % AVATAR_COLORS.length];
}

function buildTeam(assignments = {}) {
  const team = [];
  const roleMap = {
    senior: "Senior",
    junior: "Junior",
    dataloader: "Data Loader",
  };
  Object.entries(roleMap).forEach(([key, label]) => {
    (assignments[key] || []).forEach((member) => {
      team.push({ role: label, ...member });
    });
  });
  return team;
}

const AccountantAssign = () => {
  const router = useRouter();
  const {
    getAllFirmsWithAssignments,
    firmsWithAssignments,
    firmsWithAssignmentsMeta,
    loading: bizLoading,
  } = useOrganisationApi();

  const [selectedRows, setSelectedRows] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getAllFirmsWithAssignments({
      page: currentPage,
      resultsPerPage: rowsPerPage,
      search: debouncedSearch || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, debouncedSearch]);

  const totalPages = firmsWithAssignmentsMeta?.last_page ?? 1;
  const totalResults = firmsWithAssignmentsMeta?.total_results ?? 0;

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleRowsPerPageChange = (val) => {
    setRowsPerPage(val);
    setCurrentPage(1);
  };

  const searchBox = (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search Clients"
        className="pl-10 bg-background border-border"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  return (
    <ListingPageLayout
      title="Client & Accountant Enrolment"
      subtitle="All Business Clients"
      toolbar={<Toolbar left={searchBox} />}
    >
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            firmsWithAssignments.length > 0 &&
                            selectedRows.length === firmsWithAssignments.length
                          }
                          onCheckedChange={(checked) =>
                            setSelectedRows(
                              checked ? firmsWithAssignments.map((f) => f.id) : []
                            )
                          }
                        />
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium py-4">
                        Client Name
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium py-4">
                        Lead Accountant
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium py-4">
                        Accounting Team
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium py-4">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bizLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          <Spinner className="mx-auto size-6" />
                        </TableCell>
                      </TableRow>
                    ) : firmsWithAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          No clients found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      firmsWithAssignments.map((firm) => {
                        const color = getColorForId(firm.id);
                        const initials = getInitials(firm.firm_name);
                        const leadList = firm.assignments?.lead_accountant || [];
                        const lead = leadList[0] || null;
                        const team = buildTeam(firm.assignments);
                        const visibleTeam = team.slice(0, 5);
                        const extraTeam = team.length > 5 ? team.length - 5 : 0;
                        const customRoleUsersCount = (firm.assignments?.custom_roles || []).reduce(
                          (acc, role) => acc + (role.users?.length || 0),
                          0
                        );

                        return (
                          <TableRow
                            key={firm.id}
                            className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`${ROUTES.business.accountantEnrol}?guid=${firm.guid}`)}
                          >
                            <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedRows.includes(firm.id)}
                                onCheckedChange={() => toggleRow(firm.id)}
                              />
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg ${color.bg} ${color.text} flex items-center justify-center font-bold text-xs`}
                                >
                                  {initials}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground">
                                    {firm.firm_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {firm.guid}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              {lead ? (
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-full ${getAvatarColor(
                                      lead.name || lead.first_name || ""
                                    )} flex items-center justify-center font-bold text-xs shrink-0`}
                                  >
                                    {getInitials(
                                      lead.name || `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">
                                      {lead.name || `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>

                            <TableCell className="py-4">
                              {team.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {visibleTeam.map((member, idx) => {
                                    const memberName =
                                      member.name ||
                                      `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
                                    return (
                                      <div key={idx} className="flex items-center gap-2">
                                        <div
                                          className={`w-7 h-7 rounded-full ${getAvatarColor(
                                            memberName || String(idx)
                                          )} flex items-center justify-center text-[10px] font-bold shrink-0`}
                                        >
                                          {getInitials(memberName) || "?"}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-medium text-foreground">
                                            {memberName}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {member.role}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {extraTeam > 0 && (
                                    <span className="text-[10px] text-muted-foreground font-medium pl-9">
                                      +{extraTeam} more
                                    </span>
                                  )}
                                </div>
                              ) : (!lead && customRoleUsersCount > 0) ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {customRoleUsersCount}
                                    </div>
                                   
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No team</span>
                              )}
                            </TableCell>

                            <TableCell className="py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <Button
                                className="h-8 px-6 rounded-md text-xs font-medium"
                                onClick={() => router.push(`${ROUTES.business.accountantEnrol}?guid=${firm.guid}`)}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div className="text-sm text-muted-foreground">
                Total results: {totalResults}
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    className="text-sm border rounded px-2 py-1 bg-background appearance-none pr-6 cursor-pointer"
                  >
                    {ROWS_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

      <div className="fixed bottom-6 right-6">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
          <MessageSquare className="h-6 w-6" />
        </div>
      </div>
    </ListingPageLayout>
  );
};

export default AccountantAssign;
