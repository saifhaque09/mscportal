"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import useFilingApi from "@/api/useFilingApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import PrepAccountSteps from "./PrepAccountSteps";
import BackLink from "@/components/global/BackLink";
import { ROUTES } from "@/config/routes";

// GST/HST remittance is the only filing type this flow supports, so it's shown
// as static text rather than a one-item dropdown. If other types come back,
// restore a FILING_TYPES array plus a Select here and in the footer.
const FILING_TYPE = { value: "hst_return_filing", label: "GST/HST Remittance" };

// Vendor, invoice date, invoice number, code, GST/HST, total — kept in sync
// with the Step 2 entry form's fields (see patterns/subcategory-code-entry.md).
// `POST clients/business/{guid}/subcategory-codes` is an aggregate: it groups by
// code and SUMs value, so 10 detail rows come back as 8 code rows and each row is
// `{code, year, value, status}` only. The per-invoice fields entered in Step 2
// (vendor, invoice date, invoice number, GST/HST) are deliberately absent — one
// code spans several invoices, so there is no single vendor or date for the row.
// Showing them here is a category error; drill into Step 2 for invoice detail.
const CODE_COLUMNS = 4;

export default function FilingCodeReview({ firmId, firmGuid }) {
  const router = useRouter();
  const { startFiling } = useFilingApi();
  const {
    listSubcategoryCodesByFirm,
    subcategoryCodesList,
    subcategoryCodesListMeta,
    subcategoryCodesFirm,
    subcategoryCodesListLoader,
  } = useClientManagementApi();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [starting, setStarting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");

  useEffect(() => {
    if (firmGuid) {
      listSubcategoryCodesByFirm(firmGuid, {
        page,
        resultsPerPage: rowsPerPage,
        search: searchTerm || undefined,
        year,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmGuid, page, rowsPerPage, searchTerm, year]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleRowsPerPage = (val) => {
    setRowsPerPage(val);
    setPage(1);
  };

  const handleStartFiling = async () => {
    if (!firmId) return;
    setStarting(true);
    const result = await startFiling(firmId, year, FILING_TYPE.value);
    setStarting(false);

    if (result?.filing_id) {
      router.push(
        `${ROUTES.business.prepAccountsFiling}?filingId=${result.filing_id}&firmGuid=${firmGuid ?? ""}`
      );
    }
  };

  const data = subcategoryCodesList ?? [];
  const totalResults = subcategoryCodesListMeta?.total_results ?? 0;
  const totalPages = subcategoryCodesListMeta?.last_page ?? 1;
  const currentPage = subcategoryCodesListMeta?.current_page ?? page;

  const yearSelect = (
    <Select value={year} onValueChange={setYear}>
      <SelectTrigger className="w-28 h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 5 }, (_, i) => String(currentYear - i)).map((y) => (
          <SelectItem key={y} value={y}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const footer = (
    <div className="mt-4 flex items-center justify-between gap-3">
      <BackLink onClick={() => router.back()} />

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{FILING_TYPE.label}</span>

        <Button
          className="bg-black text-white hover:bg-gray-800 px-8"
          onClick={handleStartFiling}
          disabled={totalResults === 0 || starting}
        >
          {starting ? "Starting..." : "Start tax filing"}
        </Button>
      </div>
    </div>
  );

  return (
    <ListingPageLayout
      title="Code Summary"
      intro={<PrepAccountSteps activeStep={3} />}
      toolbar={<Toolbar right={yearSelect} />}
      footer={footer}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Input
            className="max-w-[240px] h-9"
            placeholder="Search Code"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                {/* <TableHead>Year</TableHead> */}
                <TableHead>Total</TableHead>
                {/* <TableHead>Status</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategoryCodesListLoader ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: CODE_COLUMNS }).map((__, c) => (
                      <TableCell key={c}>
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={CODE_COLUMNS} className="py-8 text-center text-muted-foreground">
                    No CRA codes entered for {year} yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={row.id ?? `${row.code}-${i}`}>
                    <TableCell className="font-medium underline cursor-pointer underline-offset-4">
                      {row.code != null ? `#${String(row.code).replace(/^#/, "")}` : "—"}
                    </TableCell>
                    {/* <TableCell>{row.year || "—"}</TableCell> */}
                    <TableCell>
                      {row.value != null ? `$${row.value}` : "—"}
                    </TableCell>
                    {/* <TableCell className="capitalize">{row.status || "—"}</TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div>0 of {totalResults} row(s) selected.</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={rowsPerPage} onValueChange={handleRowsPerPage}>
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
            <div className="flex items-center gap-2">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ListingPageLayout>
  );
}
