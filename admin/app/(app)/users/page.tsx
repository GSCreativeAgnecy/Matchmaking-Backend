"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FilterX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchUsers } from "@/lib/api/users";
import type { AdminUserListRow } from "@/lib/types";
import { formatDate, initials, titleCase } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const status = searchParams.get("account_status");
    if (status) initial.account_status = status;
    const premium = searchParams.get("premium");
    if (premium) initial.premium = premium;
    return initial;
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["users", filters, page],
    queryFn: () =>
      fetchUsers({
        ...filters,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sort: "created_at",
        order: "desc",
      }),
  });

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const columns = useMemo<DataTableColumn<AdminUserListRow>[]>(
    () => [
      {
        key: "user",
        label: "User",
        cell: (row) => (
          <Link href={`/users/${row.id}`} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary text-xs">{initials(row.name ?? row.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{row.email}</p>
            </div>
          </Link>
        ),
      },
      {
        key: "phone",
        label: "Phone",
        cell: (row) => <span className="text-sm">{row.phone_number ?? "—"}</span>,
      },
      { key: "gender", label: "Gender", cell: (row) => titleCase(row.gender) },
      { key: "age", label: "Age", cell: (row) => (row.age ? String(row.age) : "—") },
      { key: "city", label: "City", cell: (row) => [row.city, row.state].filter(Boolean).join(", ") || "—" },
      {
        key: "verification",
        label: "Verification",
        cell: (row) =>
          row.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="neutral">Unverified</Badge>,
      },
      {
        key: "premium",
        label: "Premium",
        cell: (row) =>
          row.is_premium ? <Badge variant="info">Premium</Badge> : <Badge variant="neutral">—</Badge>,
      },
      {
        key: "status",
        label: "Status",
        cell: (row) => <StatusBadge status={row.is_banned ? "BANNED" : row.account_status} />,
      },
      { key: "last_active", label: "Last Active", cell: (row) => formatDate(row.last_active_at) },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <Link href={`/users/${row.id}`} className="inline-flex items-center text-primary hover:underline">
            View <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        ),
      },
    ],
    [],
  );

  const filterField = (label: string, key: string, options: { value: string; label: string }[], placeholder = "Any") => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-xs">{label}</Label>
      <Select value={filters[key] ?? ""} onValueChange={(v) => setFilter(key, v === "any" ? "" : v)}>
        <SelectTrigger id={key} className="h-8 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const onSearch = useCallback((value: string) => {
    setFilter("search", value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Search, filter and manage platform users"
        breadcrumbs={[{ label: "Users" }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <FilterX className="mr-2 h-4 w-4" />
            Filters
          </Button>
        }
      />

      {showFilters && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name / Email / Phone</Label>
              <Input
                defaultValue={filters.search ?? ""}
                placeholder="Search…"
                className="h-8 text-xs"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            {filterField("Gender", "gender", [
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
              { value: "OTHER", label: "Other" },
            ])}
            <div className="space-y-1.5">
              <Label className="text-xs">Min Age</Label>
              <Input type="number" value={filters.age_min ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("age_min", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Age</Label>
              <Input type="number" value={filters.age_max ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("age_max", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={filters.city ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value={filters.state ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("state", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={filters.country ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("country", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Religion</Label>
              <Input value={filters.religion ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("religion", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caste</Label>
              <Input value={filters.caste ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("caste", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Education</Label>
              <Input value={filters.education ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("education", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Occupation</Label>
              <Input value={filters.occupation ?? ""} className="h-8 text-xs" onChange={(e) => setFilter("occupation", e.target.value)} />
            </div>
            {filterField("Premium", "premium", [
              { value: "true", label: "Premium" },
              { value: "false", label: "Not premium" },
            ])}
            {filterField("Verified", "verified", [
              { value: "true", label: "Verified" },
              { value: "false", label: "Unverified" },
            ])}
            {filterField("Account Status", "account_status", [
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "BANNED", label: "Banned" },
              { value: "DELETED", label: "Deleted" },
            ])}
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error ? (
        <ErrorState title="Unable to load users" error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          total={data?.meta.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={isLoading}
          search={filters.search}
          onSearch={onSearch}
          searchPlaceholder="Search name, email or phone…"
          emptyTitle="No users found"
          emptyDescription="Try adjusting your search or filters."
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
}
