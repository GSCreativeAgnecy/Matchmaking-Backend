"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { useToast } from "@/components/ui/toast";
import { fetchPlans, planActions } from "@/lib/api/ops";
import type { SubscriptionPlanRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const planSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  duration_days: z.coerce.number().int().positive(),
  description: z.string().optional(),
});

type PlanValues = z.infer<typeof planSchema>;

export default function PlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [toggle, setToggle] = useState<SubscriptionPlanRow | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () => fetchPlans({ include_inactive: true }),
  });

  const form = useForm<PlanValues>({ resolver: zodResolver(planSchema), defaultValues: { currency: "INR" } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    refetch();
  };

  const onCreate = async (values: PlanValues) => {
    try {
      await planActions.create(values);
      toast({ variant: "success", title: "Plan created" });
      setCreateOpen(false);
      form.reset();
      invalidate();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create plan", description: err instanceof Error ? err.message : undefined });
    }
  };

  const doToggle = async () => {
    if (!toggle) return;
    try {
      if (toggle.is_active) await planActions.deactivate(toggle.id);
      else await planActions.activate(toggle.id);
      toast({ variant: "success", title: "Plan updated" });
      setToggle(null);
      invalidate();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update plan", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<SubscriptionPlanRow>[]>(
    () => [
      { key: "name", label: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
      {
        key: "price",
        label: "Price",
        cell: (row) => <span className="font-semibold">{formatCurrency(row.price, row.currency)}</span>,
      },
      { key: "duration", label: "Duration", cell: (row) => `${row.duration_days} days` },
      { key: "features", label: "Features", cell: (row) => Object.keys(row.features).length },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} /> },
      {
        key: "actions",
        label: "",
        className: "text-right",
        cell: (row) => (
          <PermissionGate permission="subscriptions.manage">
            <Button variant="outline" size="sm" onClick={() => setToggle(row)}>
              {row.is_active ? "Deactivate" : "Activate"}
            </Button>
          </PermissionGate>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscription Plans"
        description="Create and manage paid plans"
        breadcrumbs={[{ label: "Subscriptions", href: "/subscriptions" }, { label: "Plans" }]}
        actions={
          <PermissionGate permission="subscriptions.manage">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New plan
            </Button>
          </PermissionGate>
        }
      />

      {error ? (
        <ErrorState title="Unable to load plans" error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          total={data?.meta.total ?? 0}
          page={1}
          pageSize={50}
          onPageChange={() => undefined}
          loading={isLoading}
          emptyTitle="No plans found"
          emptyDescription="Create a plan to start selling subscriptions."
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create subscription plan</DialogTitle>
            <DialogDescription>Price and duration are authoritative server-side.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" {...form.register("price")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input id="duration" type="number" {...form.register("duration_days")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...form.register("currency")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {toggle && (
        <ConfirmDialog
          open
          onOpenChange={() => setToggle(null)}
          title={toggle.is_active ? "Deactivate plan" : "Activate plan"}
          description={
            toggle.is_active
              ? `New purchases of "${toggle.name}" will stop. Existing subscriptions are unaffected.`
              : `Re-enable purchases of "${toggle.name}".`
          }
          confirmLabel={toggle.is_active ? "Deactivate" : "Activate"}
          destructive={toggle.is_active}
          onConfirm={doToggle}
        />
      )}
    </div>
  );
}
