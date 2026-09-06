'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const TablePagination = ({
  totalRows = 0,
  rowsPerPage = 10,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowsPerPageChange
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm">
      {/* Left */}
      <div className="text-muted-foreground">
        Total results: {totalRows}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="cursor-pointer text-muted-foreground">Rows per page</span>
          <Select 
            value={String(rowsPerPage)}
            onValueChange={value => onRowsPerPageChange(Number(value))}
          >
            <SelectTrigger className="cursor-pointer h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="cursor-pointer"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="cursor-pointer"
          >
            <ChevronsRight className="cursor-pointer h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TablePagination
