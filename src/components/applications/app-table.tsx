'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import type { Application } from '@/db/schema';
import { columns } from './columns';
import { SearchInput } from './search-input';
import { AppFilters } from './app-filters';
import { CompanyCompare } from './company-compare';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { GitCompareArrows } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AppTableProps {
  data: Application[];
}

export function AppTable({ data }: AppTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showCompare, setShowCompare] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const company = (row.original.company || '').toLowerCase();
      const role = (row.original.role || '').toLowerCase();
      return company.includes(search) || role.includes(search);
    },
    state: { sorting, columnFilters, globalFilter, rowSelection },
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const canCompare = selectedRows.length >= 2 && selectedRows.length <= 3;

  const setColumnFilter = (id: string, value: string | undefined) => {
    setColumnFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (value === undefined) return existing;
      return [...existing, { id, value }];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="w-full sm:w-72">
          <SearchInput value={globalFilter} onChange={setGlobalFilter} />
        </div>
        <AppFilters
          columnFilters={columnFilters}
          setColumnFilter={setColumnFilter}
        />
        {selectedRows.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setShowCompare(true)}
            disabled={!canCompare}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare ({selectedRows.length})
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {table.getFilteredRowModel().rows.length} of {data.length}{' '}
        applications
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border hover:bg-accent/50 transition-colors duration-150 cursor-pointer"
                  onClick={(e) => {
                    // Don't navigate when clicking inline interactive elements (Select dropdowns)
                    const target = e.target as HTMLElement;
                    if (target.closest('[role="combobox"], [role="checkbox"], [data-slot="select-trigger"], [data-slot="select-content"]')) return;
                    router.push(`/applications/${row.original.id}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No applications match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CompanyCompare
        companies={selectedRows.map((row) => ({
          company: row.original.company,
          role: row.original.role,
        }))}
        open={showCompare}
        onOpenChange={setShowCompare}
      />

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
