import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Building2, Command, FlaskConical, Tractor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { trpc } from "@/providers/trpc";
import { Logo } from "@/components/shared/Logo";
import { portalHome } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PERSONA_ICONS: Record<string, typeof Command> = {
  admin: Command,
  member: Tractor,
  buyer: Tractor,
  supplier: Building2,
};

export default function Onboarding() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { portalRole, isLoading } = useProfile();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: personas } = trpc.profile.personas.useQuery(undefined, { enabled: isAuthenticated });

  /* Pre-filled lead details captured by the landing-page lead modal */
  const [leadPrefill, setLeadPrefill] = useState<{ fullName?: string; company?: string; country?: string } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aq.lead.prefill");
      if (raw) setLeadPrefill(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const select = trpc.profile.selectPersona.useMutation({
    onSuccess: async (r) => {
      await utils.invalidate();
      toast.success(`Welcome, ${r.persona.name}`);
      navigate(portalHome(r.persona.portalRole), { replace: true });
    },
    onError: (err) => toast.error(err.message || "Could not select portal"),
  });

  useEffect(() => {
    if (!isLoading && portalRole) {
      navigate(portalHome(portalRole), { replace: true });
    }
  }, [isLoading, portalRole, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-3 p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Link to="/" aria-label="Aquifert home" className="transition-opacity hover:opacity-80">
            <Logo size={40} />
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Choose your portal</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This demo environment is pre-loaded with realistic trading data. Pick a portal to
          explore, you can switch at any time from the account menu.
        </p>
      </div>

      {leadPrefill && (
        <div className="w-full max-w-md rounded-lg border border-teal-500/40 bg-teal-500/5 px-4 py-3 text-sm">
          <p className="font-semibold text-navy-800 dark:text-teal-300">
            Welcome, {leadPrefill.fullName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We've saved your details ({leadPrefill.company}, {leadPrefill.country}) and your product
            and region interests, no need to re-enter them.
          </p>
        </div>
      )}

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {(personas ?? []).map((p) => {
          const Icon = PERSONA_ICONS[p.key] ?? Command;
          return (
            <Card
              key={p.key}
              className="aqf-card-hover cursor-pointer border-border/80 transition-colors hover:border-teal-500/60"
              onClick={() => select.mutate({ unionId: p.unionId })}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-xl bg-navy-600/10 p-3 text-navy-600 dark:bg-navy-400/10 dark:text-navy-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{p.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600">
                    Enter portal <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5" />
        Demo build, suppliers and staff are simulated personas backed by a live database.
      </div>
    </div>
  );
}
