import { useMemo, useState } from "react";
import { Check, Minus, Infinity as InfinityIcon, Pencil } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

type PlanRow = {
  planId: string; planKey: string; family: string; displayName: string; tagline: string | null;
  priceAmount: number | null; priceCurrency: string; billingInterval: "monthly" | "annual";
  annualDiscountPct: number | null; sortOrder: number; isPublic: boolean; isActive: boolean;
};

/** Admin: Plans, capabilities and limits — edit without a deploy. */
export default function AdminPlans() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.plansAdmin.overview.useQuery();
  const subs = trpc.plansAdmin.subscriptions.useQuery();

  const updatePlan = trpc.plansAdmin.updatePlan.useMutation({
    onSuccess: () => { toast.success("Plan updated"); utils.plansAdmin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setCapability = trpc.plansAdmin.setCapability.useMutation({
    onSuccess: () => utils.plansAdmin.overview.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const setLimit = trpc.plansAdmin.setLimit.useMutation({
    onSuccess: () => { toast.success("Limit saved"); utils.plansAdmin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setUserPlan = trpc.plansAdmin.setUserPlan.useMutation({
    onSuccess: () => { toast.success("User moved"); utils.plansAdmin.subscriptions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [tab, setTab] = useState<"plans" | "matrix" | "limits" | "subscriptions">("plans");
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [limitEdit, setLimitEdit] = useState<{ planId: string; limitKey: string; value: string; unlimited: boolean } | null>(null);

  const capGroups = useMemo(() => {
    const groups = new Map<string, typeof data extends undefined ? never : NonNullable<typeof data>["capabilities"]>();
    (data?.capabilities ?? []).forEach((c) => {
      const g = groups.get(c.group) ?? [];
      g.push(c);
      groups.set(c.group, g);
    });
    return [...groups.entries()];
  }, [data]);

  const limitKeys = useMemo(() => {
    const keys = new Set<string>();
    (data?.planLimits ?? []).forEach((l) => keys.add(l.limitKey));
    return [...keys].sort();
  }, [data]);

  const capGranted = (planId: string, key: string) =>
    (data?.planCapabilities ?? []).some((pc) => pc.planId === planId && pc.capabilityKey === key);
  const limitOf = (planId: string, key: string) =>
    (data?.planLimits ?? []).find((l) => l.planId === planId && l.limitKey === key);

  const userById = useMemo(() => new Map((subs.data?.users ?? []).map((u) => [u.id, u])), [subs.data]);
  const planById = useMemo(() => new Map((subs.data?.plans ?? []).map((p) => [p.planId, p])), [subs.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Plans & Entitlements"
        description="Edit plans, capabilities and limits. Changes take effect immediately — a new plan is a database row, not a deploy."
      />
      <div className="flex flex-wrap gap-2">
        {(["plans", "matrix", "limits", "subscriptions"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-9 rounded-full border px-4 text-[12px] font-semibold capitalize transition-colors ${
              tab === t ? "border-teal-600 bg-teal-600 text-white" : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "matrix" ? "Capability matrix" : t}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}

      {tab === "plans" && data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.plans.map((p) => (
            <Card key={p.planId}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-navy-900 dark:text-white">{p.displayName}</h3>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.family} · {p.planKey}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.isActive ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">{p.tagline}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="font-medium">{p.priceAmount != null ? `${p.priceCurrency} ${p.priceAmount}/${p.billingInterval === "annual" ? "yr" : "mo"}` : "Not set"}</dd>
                  <dt className="text-muted-foreground">Annual discount</dt>
                  <dd className="font-medium">{p.annualDiscountPct != null ? `${p.annualDiscountPct}%` : "—"}</dd>
                  <dt className="text-muted-foreground">Sort order</dt>
                  <dd className="font-medium">{p.sortOrder}</dd>
                  <dt className="text-muted-foreground">Public</dt>
                  <dd className="font-medium">{p.isPublic ? "Yes" : "No"}</dd>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p as PlanRow)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => updatePlan.mutate({ planId: p.planId, isActive: !p.isActive })}
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "matrix" && data && (
        <Card><CardContent className="overflow-x-auto p-5">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-semibold">Capability</th>
                {data.plans.map((p) => (
                  <th key={p.planId} className="px-2 py-2 text-center font-semibold">{p.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capGroups.map(([group, caps]) => (
                <>
                  <tr key={group}>
                    <td colSpan={data.plans.length + 1} className="pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-400">{group}</td>
                  </tr>
                  {caps.map((c) => (
                    <tr key={c.capabilityKey} className="border-b border-border/50">
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">{c.label}</span>
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{c.capabilityKey}</span>
                      </td>
                      {data.plans.map((p) => {
                        const granted = capGranted(p.planId, c.capabilityKey);
                        return (
                          <td key={p.planId} className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              aria-label={`${granted ? "Revoke" : "Grant"} ${c.capabilityKey} on ${p.displayName}`}
                              onClick={() => setCapability.mutate({ planId: p.planId, capabilityKey: c.capabilityKey, granted: !granted })}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                                granted ? "bg-teal-500/15 text-teal-700 hover:bg-red-500/15 hover:text-red-600 dark:text-teal-300" : "bg-muted text-muted-foreground hover:bg-teal-500/15 hover:text-teal-700"
                              }`}
                            >
                              {granted ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "limits" && data && (
        <Card><CardContent className="overflow-x-auto p-5">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-semibold">Limit</th>
                {data.plans.map((p) => (
                  <th key={p.planId} className="px-2 py-2 text-center font-semibold">{p.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limitKeys.map((key) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono text-[11px]">{key}</td>
                  {data.plans.map((p) => {
                    const l = limitOf(p.planId, key);
                    return (
                      <td key={p.planId} className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setLimitEdit({
                            planId: p.planId, limitKey: key,
                            value: l?.limitValue != null ? String(l.limitValue) : "",
                            unlimited: l?.isUnlimited ?? false,
                          })}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-muted"
                        >
                          {!l ? <span className="text-muted-foreground">0</span>
                            : l.isUnlimited ? <InfinityIcon className="h-3.5 w-3.5 text-teal-600" />
                            : String(l.limitValue)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-muted-foreground">Click a value to edit. Blank/absent = 0. Infinity = unlimited.</p>
        </CardContent></Card>
      )}

      {tab === "subscriptions" && subs.data && (
        <Card><CardContent className="overflow-x-auto p-5">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 pr-3 font-semibold">Plan</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Since</th>
                <th className="py-2 font-semibold">Move to</th>
              </tr>
            </thead>
            <tbody>
              {subs.data.subscriptions.map((sub) => {
                const u = userById.get(sub.userId);
                const plan = planById.get(sub.planId);
                return (
                  <tr key={sub.subscriptionId} className="border-b border-border/50">
                    <td className="py-1.5 pr-3">{u?.name ?? "—"} <span className="text-muted-foreground">({u?.email ?? sub.userId})</span></td>
                    <td className="py-1.5 pr-3 font-medium">{plan?.displayName ?? sub.planId}</td>
                    <td className="py-1.5 pr-3 capitalize">{sub.status}</td>
                    <td className="py-1.5 pr-3">{new Date(sub.currentPeriodStart).toLocaleDateString("en-GB")}</td>
                    <td className="py-1.5">
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setUserPlan.mutate({ userId: sub.userId, planKey: e.target.value, note: "Admin plan change" });
                        }}
                      >
                        <option value="">Change plan…</option>
                        {subs.data.plans.filter((p) => p.isActive).map((p) => (
                          <option key={p.planId} value={p.planKey}>{p.displayName}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Plan edit dialog */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Edit ${editing.displayName}`}>
          <Card className="w-full max-w-md"><CardContent className="space-y-3 p-5">
            <h3 className="font-bold">Edit {editing.displayName}</h3>
            <label className="block text-[12px]">Display name
              <Input className="mt-1" defaultValue={editing.displayName} id="pe-name" /></label>
            <label className="block text-[12px]">Tagline
              <Input className="mt-1" defaultValue={editing.tagline ?? ""} id="pe-tag" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px]">Price ({editing.priceCurrency})
                <Input className="mt-1" type="number" step="0.01" defaultValue={editing.priceAmount ?? ""} id="pe-price" /></label>
              <label className="block text-[12px]">Billing interval
                <select id="pe-interval" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm" defaultValue={editing.billingInterval}>
                  <option value="monthly">Monthly</option><option value="annual">Annual</option>
                </select></label>
              <label className="block text-[12px]">Annual discount %
                <Input className="mt-1" type="number" step="0.1" defaultValue={editing.annualDiscountPct ?? ""} id="pe-disc" /></label>
              <label className="block text-[12px]">Sort order
                <Input className="mt-1" type="number" defaultValue={editing.sortOrder} id="pe-sort" /></label>
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" defaultChecked={editing.isPublic} id="pe-public" /> Public plan
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => {
                const val = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
                const num = (id: string) => { const v = val(id); return v === "" ? null : Number(v); };
                updatePlan.mutate({
                  planId: editing.planId,
                  displayName: val("pe-name") || undefined,
                  tagline: val("pe-tag") || null,
                  priceAmount: num("pe-price"),
                  billingInterval: val("pe-interval") as "monthly" | "annual",
                  annualDiscountPct: num("pe-disc"),
                  sortOrder: Number(val("pe-sort") || editing.sortOrder),
                  isPublic: (document.getElementById("pe-public") as HTMLInputElement)?.checked,
                });
                setEditing(null);
              }}>Save</Button>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Limit edit dialog */}
      {limitEdit && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Edit ${limitEdit.limitKey}`}>
          <Card className="w-full max-w-sm"><CardContent className="space-y-3 p-5">
            <h3 className="font-mono text-[13px] font-bold">{limitEdit.limitKey}</h3>
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox" checked={limitEdit.unlimited}
                onChange={(e) => setLimitEdit({ ...limitEdit, unlimited: e.target.checked })}
              /> Unlimited
            </label>
            {!limitEdit.unlimited && (
              <label className="block text-[12px]">Value
                <Input
                  className="mt-1" type="number" step="0.01" value={limitEdit.value}
                  onChange={(e) => setLimitEdit({ ...limitEdit, value: e.target.value })}
                /></label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLimitEdit(null)}>Cancel</Button>
              <Button onClick={() => {
                setLimit.mutate({
                  planId: limitEdit.planId, limitKey: limitEdit.limitKey,
                  isUnlimited: limitEdit.unlimited,
                  limitValue: limitEdit.unlimited ? null : Number(limitEdit.value || 0),
                });
                setLimitEdit(null);
              }}>Save</Button>
            </div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
