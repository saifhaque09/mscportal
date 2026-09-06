import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

const Step1AllSubcategory = ({
  selectedYear,
  setSelectedYear,
  yearOptions,
  effectiveTaxFilerGuid,
  downloadDocument,
  downloadLoading,
  searchTerm,
  setSearchTerm,
  rows,
  loading,
  onSelectSubcategory,
  onNext,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold">Current Year Documents</h3>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">Pick a year</div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="h-9 gap-2"
            disabled={downloadLoading}
            onClick={() =>
              effectiveTaxFilerGuid && downloadDocument(effectiveTaxFilerGuid)
            }
          >
            {downloadLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {downloadLoading ? "Downloading…" : "Download All Files"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          className="max-w-[240px] h-9"
          placeholder="Search Name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px] text-right">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-8 text-center text-muted-foreground"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow
                  key={item.id ?? item.code}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectSubcategory?.(item)}
                >
                  <TableCell className="font-medium">
                    {item?.name || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground">
                      {item?.document_count ?? item?.document_names?.length ?? item?.documents?.length ?? 0}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>{rows.length} row(s) found.</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step1AllSubcategory;
