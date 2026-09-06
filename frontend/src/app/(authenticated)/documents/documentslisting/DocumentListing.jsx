"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TablePagination from "../TablePagination";

import useClientManagementApi from "@/api/useClientManagementApi";
import { Loader2, Calendar } from "lucide-react";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

const DocumentListing = () => {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const yearOptions = [
    new Date().getFullYear().toString(),
    (new Date().getFullYear() - 1).toString(),
    (new Date().getFullYear() - 2).toString(),
    (new Date().getFullYear() - 3).toString(),
    (new Date().getFullYear() - 4).toString(),
  ];

  const {
    getAllChecklistItems,
    checklistItems,
    checklistLoader,
    searchKeyword,
    setSearchKeyword,
    meta,
  } = useClientManagementApi();

  useEffect(() => {
    // Parameters: firmId, page, rows, search, year, month, options
    getAllChecklistItems(
      undefined,
      currentPage,
      rowsPerPage,
      searchKeyword,
      selectedYear,
      undefined,
      { suppressNoRecordsToast: true }
    );
  }, [searchKeyword, currentPage, rowsPerPage, selectedYear]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchKeyword(localSearch);
    }, 500);

    return () => clearTimeout(delay);
  }, [localSearch, setSearchKeyword]);

  useEffect(() => {
    if (meta?.total_results) {
      setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

  const handleView = (code) => {
    router.push(`${ROUTES.documents.view}?id=${code}`);
  };
  const handleRowClick = (code) => {
    router.push(`${ROUTES.business.checklist}?id=${code}`);
  };
  const searchBox = (
    <Input
      placeholder="Search Category"
      className="w-64"
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
    />
  );

  const yearSelect = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Year</span>
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="h-9 w-[130px]">
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ListingPageLayout
      title="Document Checklists"
      subtitle={`${selectedYear} Checklist`}
      toolbar={<Toolbar left={searchBox} right={yearSelect} />}
    >
          {checklistLoader ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow >
                  <TableHead>Category Name</TableHead>
                  <TableHead >Subcategory</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {checklistItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  checklistItems.map((item) => (
                    <TableRow key={item.code}
                      onClick={() => handleRowClick(item.code)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium underline underline-offset-4">
                        {item.name}
                      </TableCell>

                      {/* <TableCell >
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleView(item.code)}
                        >
                          View
                        </Button>
                      </TableCell> */}
                      <TableCell className="font-medium">
                        {item.children_count}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

      <TablePagination
        totalRows={meta?.total_results}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />
    </ListingPageLayout>
  );
};

export default DocumentListing;
