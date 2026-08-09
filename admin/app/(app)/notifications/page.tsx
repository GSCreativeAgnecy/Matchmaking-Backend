"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/toast";
import { createCampaign, fetchCampaigns } from "@/lib/api/ops";
import type { CampaignRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const campaignSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(2),
  channel: z.enum(["PUSH", "EMAIL", "SMS"]),
  audienceType: z.enum(["all", "premium", "unverified", "city", "country", "custom"]),
  city: z.string().optional(),
  country: z.string().optional(),
  user_ids: z.string().optional(),
});

type CampaignValues = z.infer<typeof campaignSchema>;

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaigns", page],
    queryFn: () => fetchCampaigns({ limit: 25, offset: (page - 1) * 25 }),
  });

  const form = useForm<CampaignValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { channel: "PUSH", audienceType: "all" },
  });

  const audienceType = form.watch("audienceType");

  const onSubmit = async (values: CampaignValues) => {
    const audience: Record<string, unknown> = { type: values.audienceType };
    if (values.audienceType === "city") audience.city = values.city;
    if (values.audienceType === "country") audience.country = values.country;
    if (values.audienceType === "custom") {
      audience.user_ids = (values.user_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    }
    try {
      const res = await createCampaign({
        title: values.title,
        message: values.message,
        channel: values.channel,
        audience,
      });
      toast({
        variant: "success",
        title: "Campaign queued",
        description: `Targeting ${res.data.target_count} users via ${values.channel}.`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      refetch();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create campaign", description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns = useMemo<DataTableColumn<CampaignRow>[]>(
    () => [
      { key: "title", label: "Title", cell: (row) => <span className="font-medium">{row.title}</span> },
      { key: "channel", label: "Channel", cell: (row) => row.channel },
      { key: "audience", label: "Audience", cell: (row) => String(row.audience?.type ?? "all") },
      { key: "status", label: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      {
        key: "counts",
        label: "Delivered",
        cell: (row) => `${row.delivered_count} / ${row.target_count ?? "?"}`,
      },
      { key: "created", label: "Created", cell: (row) => formatDate(row.created_at) },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Broadcast push, email or SMS campaigns"
        breadcrumbs={[{ label: "Notifications" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
          <CardDescription>Delivery is processed by background workers; large audiences are batched.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.watch("channel")} onValueChange={(v) => form.setValue("channel", v as "PUSH" | "EMAIL" | "SMS")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUSH">Push</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={3} {...form.register("message")} />
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audienceType} onValueChange={(v) => form.setValue("audienceType", v as CampaignValues["audienceType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="premium">Premium users</SelectItem>
                  <SelectItem value="unverified">Unverified users</SelectItem>
                  <SelectItem value="city">Users in a city</SelectItem>
                  <SelectItem value="country">Users in a country</SelectItem>
                  <SelectItem value="custom">Custom (user ids)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audienceType === "city" && (
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...form.register("city")} />
              </div>
            )}
            {audienceType === "country" && (
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...form.register("country")} />
              </div>
            )}
            {audienceType === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="user_ids">User IDs (comma separated)</Label>
                <Input id="user_ids" {...form.register("user_ids")} placeholder="uuid,uuid,…" />
              </div>
            )}
            <div className="lg:col-span-2">
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" /> Queue campaign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        total={data?.meta.total ?? 0}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        loading={isLoading}
        emptyTitle="No campaigns yet"
        emptyDescription="Broadcast campaigns will appear here once created."
      />
    </div>
  );
}
