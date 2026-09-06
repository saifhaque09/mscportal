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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  MessageSquare,
} from "lucide-react";
import useUserApi from "@/api/useUserApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { Spinner } from "@/components/ui/spinner";

const ROWS_OPTIONS = [10, 20, 50];

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-700",
  "bg-blue-200 text-blue-700",
  "bg-purple-200 text-purple-700",
  "bg-orange-200 text-orange-700",
];

function getAvatarColor(name = "") {
  return AVATAR_COLORS[name.length % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const IndividualAccountantAssign = () => {
  const {
    getStaffList,
    toggleIndividualStatus,
    staffList,
    staffMeta,
    loading: staffLoading,
  } = useUserApi();

  const [indSearch, setIndSearch] = useState("");
  const [indDebouncedSearch, setIndDebouncedSearch] = useState("");
  const [indPage, setIndPage] = useState(1);
  const [indRowsPerPage, setIndRowsPerPage] = useState(10);
  const [toggleStates, setToggleStates] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndDebouncedSearch(indSearch);
      setIndPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [indSearch]);

  useEffect(() => {
    getStaffList(indPage, indRowsPerPage, indDebouncedSearch || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indPage, indRowsPerPage, indDebouncedSearch]);

  // Sync toggle states from fresh API data each time the list changes
  useEffect(() => {
    if (!staffList?.length) return;
    const next = {};
    staffList.forEach((s) => {
      next[s.id] = s.individual_status === "enabled";
    });
    setToggleStates(next);
  }, [staffList]);

  const handleToggle = async (userId) => {
    const prev = toggleStates[userId];
    setToggleStates((s) => ({ ...s, [userId]: !prev }));
    const result = await toggleIndividualStatus(userId);
    if (!result) {
      setToggleStates((s) => ({ ...s, [userId]: prev }));
    }
  };

  const indTotalPages = staffMeta?.last_page ?? 1;
  const indTotalResults = staffMeta?.total_results ?? 0;

  const handleIndRowsPerPageChange = (val) => {
    setIndRowsPerPage(val);
    setIndPage(1);
  };

  const searchBox = (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Move slider to allow the employees as individual tax filers
      </p>
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search Staff"
          className="pl-10 bg-background border-border"
          value={indSearch}
          onChange={(e) => setIndSearch(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <ListingPageLayout
      title="Individual Tax Filer Accountant Enrolment"
      subtitle="All Individual Clients"
      toolbar={<Toolbar left={searchBox} />}
    >
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="text-muted-foreground font-medium py-4">
                    Staff Name
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium py-4 text-right pr-8">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                      <Spinner className="mx-auto size-6" />
                    </TableCell>
                  </TableRow>
                ) : staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                      No staff found.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((staff) => {
                    const fullName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim();
                    const avatarColor = getAvatarColor(fullName);
                    const isEnabled = toggleStates[staff.id] ?? (staff.individual_status === "enabled");

                    return (
                      <TableRow
                        key={staff.id}
                        className="border-border hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs shrink-0`}
                            >
                              {getInitials(fullName)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">
                                {fullName}
                              </span>
                              {staff.email && (
                                <span className="text-xs text-muted-foreground">
                                  {staff.email}
                                </span>
                              )}
                              {staff.mobile && (
                                <span className="text-xs text-muted-foreground">
                                  +{staff.mobile}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-right pr-8">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggle(staff.id)}
                            className="data-[state=checked]:bg-gray-900 data-[size=default]:h-6 data-[size=default]:w-11"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            Total results: {indTotalResults}
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <select
                value={indRowsPerPage}
                onChange={(e) => handleIndRowsPerPageChange(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1 bg-background appearance-none pr-6 cursor-pointer"
              >
                {ROWS_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {indPage} of {indTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={indPage === 1} onClick={() => setIndPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={indPage === 1} onClick={() => setIndPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={indPage === indTotalPages} onClick={() => setIndPage((p) => Math.min(indTotalPages, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={indPage === indTotalPages} onClick={() => setIndPage(indTotalPages)}>
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

export default IndividualAccountantAssign;
