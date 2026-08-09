"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Save } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { PermissionGate } from "@/components/permission-gate";
import { useToast } from "@/components/ui/toast";
import { fetchAppConfig, appConfigActions } from "@/lib/api/ops";
import type { AppConfigRow } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const CATEGORIES = ["BRANDING", "FEATURES", "LIMITS", "PRICING", "VERSIONS", "APP", "LEGAL", "SUPPORT"];

function ConfigValue({ row }: { row: AppConfigRow }) {
  const value = row.value;
  if (value === null || value === undefined) return <span className="text-muted-foreground">(not set)</span>;
  if (typeof value === "boolean") return <Badge variant={value ? "success" : "neutral"}>{String(value)}</Badge>;
  if (typeof value === "object") return <pre className="max-h-24 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}

function ConfigRow({ row, onEdited }: { row: AppConfigRow; onEdited: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(() =>
    typeof row.value === "object" ? JSON.stringify(row.value, null, 2) : String(row.value ?? ""),
  );

  const save = async () => {
    let parsed: unknown = value;
    try {
      if (row.value_type === "INTEGER") parsed = Number(value);
      else if (row.value_type === "FLOAT") parsed = Number(value);
      else if (row.value_type === "BOOLEAN") parsed = value.toLowerCase() === "true";
      else if (row.value_type === "JSON") parsed = JSON.parse(value);
    } catch {
      toast({ variant: "destructive", title: "Invalid value", description: "Could not parse the value for this type." });
      return;
    }
    try {
      await appConfigActions.update(row.key, { value: parsed });
      toast({ variant: "success", title: "Configuration updated" });
      setEditing(false);
      onEdited();
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm">{row.key}</p>
        {editing ? (
          <div className="mt-2 space-y-2">
            {row.value_type === "BOOLEAN" ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <Textarea rows={row.value_type === "JSON" ? 5 : 2} value={value} onChange={(e) => setValue(e.target.value)} />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>
                <Save className="mr-1 h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm"><ConfigValue row={row} /></div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{row.value_type}</Badge>
        <PermissionGate permission="app_config.update">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}

export default function AppConfigPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("BRANDING");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["app-config", category],
    queryFn: () => fetchAppConfig({ category, limit: 200 }),
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const onEdited = () => {
    queryClient.invalidateQueries({ queryKey: ["app-config"] });
    refetch();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="App Configuration"
        description="Remote configuration served to the mobile clients"
        breadcrumbs={[{ label: "Settings" }, { label: "App Configuration" }]}
      />

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>{titleCase(c)}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category}>
          <Card>
            <CardHeader>
              <CardTitle>{titleCase(category)}</CardTitle>
              <CardDescription>Changes are cached and invalidated automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : error ? (
                <ErrorState title="Unable to load configuration" error={error} onRetry={() => refetch()} />
              ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No configuration entries in this category.</p>
              ) : (
                rows.map((row) => <ConfigRow key={row.key} row={row} onEdited={onEdited} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
