"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import useActivityLogApi from "@/api/useActivityLogApi";

const SORT_OPTIONS = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
];

const ORDER_BY_MAP = {
    newest: "newest_first",
    oldest: "oldest_first",
};

export default function UserActivityLog({ onBack }) {
    const { getAllActivityLogs, activityLogs, activityLogsMeta, loading } = useActivityLogApi();

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sort, setSort] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = useCallback(() => {
        getAllActivityLogs({
            search: debouncedSearch || undefined,
            order_by: ORDER_BY_MAP[sort],
            results_per_page: rowsPerPage,
            page: currentPage,
        });
    }, [getAllActivityLogs, debouncedSearch, sort, rowsPerPage, currentPage]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = activityLogsMeta?.last_page ?? 1;
    const totalResults = activityLogsMeta?.total_results ?? activityLogs.length;
    const page = activityLogsMeta?.current_page ?? currentPage;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Activity Log</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search activity"
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={sort} onValueChange={(value) => { setSort(value); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="py-3 pl-6 font-medium text-muted-foreground">Log Name</TableHead>
                                <TableHead className="py-3 font-medium text-muted-foreground">Description</TableHead>
                                <TableHead className="py-3 pr-6 font-medium text-muted-foreground">Date/Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                                        Loading activity...
                                    </TableCell>
                                </TableRow>
                            ) : activityLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                                        No activity found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activityLogs.map((row) => (
                                    <TableRow key={row.id} className="border-border">
                                        <TableCell className="py-4 pl-6 font-medium capitalize">{row.log_name}</TableCell>
                                        <TableCell className="py-4 text-muted-foreground">{row.description}</TableCell>
                                        <TableCell className="py-4 pr-6 text-muted-foreground">
                                            {row.timestamp
                                                ? new Date(row.timestamp).toLocaleString(undefined, {
                                                    dateStyle: "medium",
                                                    timeStyle: "short",
                                                })
                                                : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-sm text-muted-foreground">Total results: {totalResults}</div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page</span>
                        <Select
                            value={String(rowsPerPage)}
                            onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setCurrentPage(1)}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
