"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortKey?: string;
  hidden?: boolean;
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  sort?: { key: string; direction: "asc" | "desc" } | null;
  onSort?: (sort: { key: string; direction: "asc" | "desc" }) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  loading = false,
  search,
  onSearch,
  searchPlaceholder = "Search…",
  sort,
  onSort,
  emptyTitle = "No results found",
  emptyDescription,
  onRefresh,
  actions,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = React.useState(search ?? "");
  const [visible, setVisible] = React.useState<Record<string, boolean>>({});
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const col of columns) initial[col.key] = !col.hidden;
    setVisible((prev) => ({ ...initial, ...prev }));
  }, [columns]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => onSearch?.(value), 350);
  };

  const visibleColumns = columns.filter((c) => visible[c.key] !== false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onSearch ? (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
              aria-label="Search"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visible[col.key] !== false}
                  onCheckedChange={(checked) => setVisible((prev) => ({ ...prev, [col.key]: checked }))}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.sortKey && onSort ? (
                    <button
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() =>
                        onSort({
                          key: col.sortKey!,
                          direction: sort?.key === col.sortKey && sort?.direction === "asc" ? "desc" : "asc",
                        })
                      }
                    >
                      {col.label}
                      {sort?.key === col.sortKey ? (
                        sort!.direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-32 p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={
                      onRefresh ? (
                        <Button variant="outline" size="sm" onClick={onRefresh}>
                          Refresh
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      )}
    </div>
  );
}
