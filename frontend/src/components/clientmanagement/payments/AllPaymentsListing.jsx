"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageContainer from "@/components/ui/PageContainer";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { CalendarIcon, MoreVertical, Eye, Pencil, Plus } from "lucide-react";
import PaymentStatusBadge from "./PaymentStatusBadge";
import {
  TAX_YEAR_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  getInitials,
  getAvatarStyle,
  formatCurrency,
  formatDisplayDate,
} from "./paymentsData";
import useBusinessPaymentApi from "@/api/useBusinessPaymentApi";
import { ROUTES } from "@/config/routes";

function displayPaymentMethod(method) {
  if (!method) return "--";
  return method.replace("_", "-").replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeMethod(value) {
  return value ? value.toLowerCase().replace("-", "_") : "";
}

export default function AllPaymentsListing() {
  const router = useRouter();

  const { getAllBusinessPayments, loading } = useBusinessPaymentApi();
  const [payments, setPayments] = useState([]);
  const [totalRowsServer, setTotalRowsServer] = useState(0);

  const [search, setSearch] = useState("");
  const [taxYearFilter, setTaxYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, search]);

  const fetchPayments = async () => {
    try {
      const res = await getAllBusinessPayments(currentPage, rowsPerPage, search);
      if (res && res.success) {
        setPayments(res.payload?.data || []);
        setTotalRowsServer(res.payload?.meta?.total_results || (res.payload?.data || []).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesTaxYear = taxYearFilter === "all" || String(p.year) === taxYearFilter;
      const matchesStatus = statusFilter === "all" || p.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesType = typeFilter === "all" || normalizeMethod(p.payment_method) === normalizeMethod(typeFilter);
      const pDate = p.payment_date?.includes("T") ? p.payment_date.split("T")[0] : p.payment_date;
      const matchesDate = !dateFilter || pDate === dateFilter;
      return matchesTaxYear && matchesStatus && matchesType && matchesDate;
    });
  }, [payments, taxYearFilter, statusFilter, typeFilter, dateFilter]);

  const totalRows = search ? filteredPayments.length : totalRowsServer;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  const pagedPayments = filteredPayments;

  const handleResetFilters = () => {
    setSearch("");
    setTaxYearFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter("");
    setCurrentPage(1);
  };

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">All Payment</h2>
          <p className="text-sm text-muted-foreground">Showing all listing for business client payments</p>
        </div>
        <Button
          onClick={() => router.push(ROUTES.business.paymentsAdd)}
          className="bg-black text-white hover:bg-black/90"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by Firm Name"
          className="w-64"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <Select
          value={taxYearFilter}
          onValueChange={(v) => {
            setTaxYearFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tax Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tax Year</SelectItem>
            {TAX_YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Payment Status</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Payment Type</SelectItem>
            {PAYMENT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateFilter ? formatDisplayDate(dateFilter) : "Payment Date"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-3">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-[180px]"
            />
            {dateFilter && (
              <DropdownMenuItem
                onClick={() => {
                  setDateFilter("");
                  setCurrentPage(1);
                }}
                className="mt-2 justify-center text-muted-foreground"
              >
                Clear date
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={handleResetFilters}
          className="text-sm font-medium text-red-500 hover:underline"
        >
          Reset Filter
        </button>
      </div>

      <Card className="p-0 gap-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Client</TableHead>
              <TableHead>Tax Year</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                  Loading payments...
                </TableCell>
              </TableRow>
            ) : pagedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              pagedPayments.map((payment, index) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarStyle(
                          index
                        )}`}
                      >
                        {getInitials(payment.firm?.firm_name || "Unknown Client")}
                      </div>
                      <span className="font-medium text-sm">{payment.firm?.firm_name || "Unknown Client"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{payment.year}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{displayPaymentMethod(payment.payment_method)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDisplayDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`${ROUTES.business.paymentsView}?firmId=${payment.firm?.guid}&paymentId=${payment.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`${ROUTES.business.paymentsEdit}?firmId=${payment.firm?.guid}&paymentId=${payment.id}`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        totalRows={totalRows}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />
    </PageContainer>
  );
}
