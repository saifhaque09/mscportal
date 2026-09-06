"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Loader2 } from "lucide-react";
import useActivityLogsApi from "@/api/useActivityLogsApi";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";

function formatTimestamp(value) {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "N/A";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export default function ActivityLogsTable() {
    const { loading, activityLogs, activityLogsMeta, getAllActivityLogs, getAllActivityLogsForAdmin } = useActivityLogsApi();
    const searchParams = useSearchParams();

    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showsOtherUsers, setShowsOtherUsers] = useState(false);
    const [viewAllUsers, setViewAllUsers] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const role = (localStorage.getItem("userRole") || "").toLowerCase();
            const admin = role === "admin";
            setIsAdmin(admin);
            // Accountant/Staff/Client see their firm's other users' actions
            // too (scoped server-side), not just their own — show the User
            // column for them without the Admin-only "All Users" toggle.
            setShowsOtherUsers(["accountant", "staff", "client"].includes(role));
            // Dashboard's "View All Activity" links here with ?tab=all —
            // land straight on the All Users tab for admins.
            if (admin && searchParams.get("tab") === "all") {
                setViewAllUsers(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const params = { resultsPerPage: rowsPerPage, page: currentPage, search: searchQuery || undefined };
        if (viewAllUsers) {
            getAllActivityLogsForAdmin(params);
        } else {
            getAllActivityLogs(params);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, rowsPerPage, viewAllUsers]);

    useEffect(() => {
        if (activityLogsMeta?.total_results) {
            setTotalPages(Math.ceil(activityLogsMeta.total_results / rowsPerPage));
        } else {
            setTotalPages(1);
        }
    }, [activityLogsMeta, rowsPerPage]);

    const handleSearch = (event) => {
        event.preventDefault();
        setCurrentPage(1);
        const params = { resultsPerPage: rowsPerPage, page: 1, search: searchQuery || undefined };
        if (viewAllUsers) {
            getAllActivityLogsForAdmin(params);
        } else {
            getAllActivityLogs(params);
        }
    };

    const totalRows = activityLogsMeta?.total_results ?? 0;
    const showUserColumn = viewAllUsers || showsOtherUsers;

    const searchBox = (
        <form onSubmit={handleSearch} className="w-full md:max-w-sm">
            <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
            />
        </form>
    );

    const toolbarRight = isAdmin && (
        <>
            <Button
                variant={viewAllUsers ? "outline" : "default"}
                size="sm"
                onClick={() => { setViewAllUsers(false); setCurrentPage(1); }}
            >
                My Activity
            </Button>
            <Button
                variant={viewAllUsers ? "default" : "outline"}
                size="sm"
                onClick={() => { setViewAllUsers(true); setCurrentPage(1); }}
            >
                All Users
            </Button>
        </>
    );

    return (
        <ListingPageLayout
            title="Activity Logs"
            toolbar={<Toolbar left={searchBox} right={toolbarRight} />}
        >
                <Table>
                    <TableHeader>
                        <TableRow>
                            {showUserColumn && <TableHead>User</TableHead>}
                            <TableHead>Activity</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={showUserColumn ? 4 : 3} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : activityLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showUserColumn ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                    No activity found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            activityLogs.map((log) => (
                                <TableRow key={log.id}>
                                    {showUserColumn && (
                                        <TableCell>
                                            {log.user ? `${log.user.first_name ?? ""} ${log.user.last_name ?? ""}`.trim() || log.user.email : "—"}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium capitalize">{log.log_name}</TableCell>
                                    <TableCell className="text-[#71717A]">{log.description || "—"}</TableCell>
                                    <TableCell className="text-sm text-[#71717A]">{formatTimestamp(log.timestamp)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

            <TablePagination
                totalRows={totalRows}
                page={currentPage}
                rowsPerPage={rowsPerPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
            />
        </ListingPageLayout>
    );
}
