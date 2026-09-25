/**
 * Step after signup/login when portalRole is not set yet.
 * Live roles only — no demo personas. Portal role is stored on public.users in Supabase.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Building2, Loader2, Tractor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { trpc } from "@/providers/trpc";
import { Logo } from "@/components/shared/Logo";
import { portalHome } from "@/lib/portal-home";
import { toast } from "sonner";
import { useEffect } from "react";

const ROLES = [
  {
    key: "BUYER" as const,
    label: "Buyer",
    desc: "Source fertilizer, request quotes, track shipments and manage financing.",
    Icon: Tractor,
  },
  {
    key: "SUPPLIER" as const,
    label: "Supplier",
    desc: "Respond to requests, submit quotes, manage shipments and earnings.",
    Icon: Building2,
  },
];

export default function Onboarding() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { portalRole, isLoading, user } = useProfile();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [pending, setPending] = useState<string | null>(null);

  const setRole = trpc.profile.setPortalRole.useMutation({
    onSuccess: async (r) => {
      await utils.invalidate();
      toast.success(`Welcome to Aquifert`);
      navigate(portalHome(r.portalRole), { replace: true });
    },
    onError: (err) => {
      setPending(null);
      toast.error(err.message || "Could not save your portal role");
    },
  });

  useEffect(() => {
    if (!isLoading && portalRole) {
      navigate(portalHome(portalRole), { replace: true });
    }
  }, [isLoading, portalRole, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-navy-700" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Link to="/" aria-label="Aquifert home" className="transition-opacity hover:opacity-80">
            <Logo size={40} />
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">How will you use Aquifert?</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {user?.name ? `Welcome, ${user.name}. ` : null}
          Choose your role. This is saved to your account and can be updated by an admin later.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {ROLES.map(({ key, label, desc, Icon }) => (
          <button
            key={key}
            type="button"
            disabled={setRole.isPending}
            onClick={() => {
              setPending(key);
              setRole.mutate({ portalRole: key });
            }}
            className="aqf-card-hover flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-teal-500/60 disabled:opacity-60"
          >
            <div className="rounded-xl bg-navy-600/10 p-3 text-navy-600">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-navy-900">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                {pending === key && setRole.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
