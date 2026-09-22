import { useState } from "react";
import { Plus, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCESS_MATRIX, PORTAL_ROLES } from "@contracts/constants";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

type UserRow = NonNullable<ReturnType<typeof useUsers>["data"]>[number];
function useUsers() {
  return trpc.admin.users.useQuery();
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-navy-600 text-white",
  OPERATIONS: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  FINANCE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  SUPPORT: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  BUYER: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  SUPPLIER: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export default function AdminUsers() {
  const users = useUsers();
  const orgs = trpc.admin.organizations.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", portalRole: "BUYER" as (typeof PORTAL_ROLES)[number], organizationId: "" });

  const addUser = trpc.admin.addUser.useMutation({
    onSuccess: () => {
      toast.success("User added");
      setOpen(false);
      setForm({ name: "", email: "", portalRole: "BUYER", organizationId: "" });
      utils.admin.users.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: Column<UserRow>[] = [
    {
      key: "name", header: "User", searchValue: (u) => `${u.name} ${u.email}`, sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-600/10 text-xs font-bold text-navy-600 dark:text-navy-200">
            {(u.name ?? "U").split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-[11px] text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role", header: "Portal role",
      render: (u) => u.portalRole ? (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_COLORS[u.portalRole]}`}>{u.portalRole}</span>
      ) : <span className="text-xs text-muted-foreground">, </span>,
    },
    { key: "org", header: "Organization", searchValue: (u) => u.organization?.name ?? "", render: (u) => <span className="text-sm">{u.organization?.name ?? "N/A"}</span> },
    { key: "verified", header: "Org status", render: (u) => u.organization ? (u.organization.verified ? <StatusPill status="ACTIVE" /> : <StatusPill status="PENDING" />) : <span className="text-xs text-muted-foreground">, </span> },
    { key: "joined", header: "Joined", sortValue: (u) => u.createdAt, render: (u) => <span className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Accounts, portal roles and the access matrix that governs them."
        actions={
          <Button onClick={() => setOpen(true)} className="bg-teal-500 hover:bg-teal-600 aqf-btn-press">
            <Plus className="mr-1.5 h-4 w-4" /> Add user
          </Button>
        }
      />

      <DataTable columns={columns} rows={users.data ?? []} emptyTitle="No users" emptyDescription="Add your first team member, buyer or supplier." />

      {/* Access matrix */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-navy-500" /> Role-based access matrix</CardTitle>
        </CardHeader>
        <CardContent className="aqf-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Area</th>
                {PORTAL_ROLES.map((r) => <th key={r} className="py-2 pr-4">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {ACCESS_MATRIX.map((row) => (
                <tr key={row.area} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{row.area}</td>
                  {PORTAL_ROLES.map((r) => {
                    const v = row.roles[r];
                    return (
                      <td key={r} className="py-2.5 pr-4">
                        <span className={`text-xs font-semibold ${v === "Full" ? "text-emerald-600" : v === "N/A" ? "text-muted-foreground/50" : "text-amber-600"}`}>{v}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UsersIcon className="h-4 w-4" /> Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="u-name">Full name</Label><Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label htmlFor="u-email">Email</Label><Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Portal role</Label>
              <Select value={form.portalRole} onValueChange={(v) => setForm({ ...form, portalRole: v as typeof form.portalRole })}>
                <SelectTrigger aria-label="Portal role"><SelectValue /></SelectTrigger>
                <SelectContent>{PORTAL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organization (optional)</Label>
              <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                <SelectTrigger aria-label="Organization"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {(orgs.data ?? []).map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name} ({o.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-navy-600 hover:bg-navy-700"
              disabled={!form.name || !form.email || addUser.isPending}
              onClick={() => addUser.mutate({ name: form.name, email: form.email, portalRole: form.portalRole, organizationId: form.organizationId ? Number(form.organizationId) : undefined })}
            >
              Add user
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
