import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const Step3CodeSummary = ({
  userId,
  selectedSubcategory,
  codesData,
  codesMeta,
  codesInfo,
  codesLoading,
  onFetch,
  onBack,
  onNext,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const initialFetchSkipped = useRef(false);

  useEffect(() => {
    if (!userId || !selectedSubcategory?.id) return;

    if (!initialFetchSkipped.current) {
      initialFetchSkipped.current = true;
      const alreadyLoaded =
        codesInfo?.sub_tax_category_id === selectedSubcategory.id &&
        codesData?.length > 0;
      if (alreadyLoaded) return;
    }

    onFetch(userId, selectedSubcategory.id, {
      page,
      resultsPerPage: rowsPerPage,
      search: searchTerm || undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedSubcategory?.id, page, rowsPerPage, searchTerm]);

  const totalPages = codesMeta?.last_page ?? 1;
  const currentPage = codesMeta?.current_page ?? page;
  const totalResults = codesMeta?.total_results ?? 0;
  const title = codesInfo?.sub_category_name ?? selectedSubcategory?.name ?? "Code Summary";

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleRowsPerPage = (val) => {
    setRowsPerPage(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">{title}</h3>

      <div className="flex items-center gap-3">
        <Input
          className="max-w-[240px] h-9"
          placeholder="Search Code"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Code</TableHead>
              <TableHead className="w-1/2">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : !codesData?.length ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              codesData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium underline cursor-pointer text-muted-foreground decoration-dashed underline-offset-4">
                    {item.code ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.value != null ? `$${item.value}` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground mt-4">
        <div>Total results: {totalResults}</div>
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

      <div className="flex justify-between items-center pt-2">
        <BackLink onClick={onBack} />
        <Button className="h-9" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default Step3CodeSummary;
