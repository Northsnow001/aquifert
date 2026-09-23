/** Pending signup profile stored between register → verify → set-password. */
export type SignupPending = {
  email: string;
  name: string;
  company: string;
  country: string;
  phone?: string;
};

const KEY = "aq.signup.pending";

export function saveSignupPending(data: SignupPending): void {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function readSignupPending(): SignupPending | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupPending;
  } catch {
    return null;
  }
}

export function clearSignupPending(): void {
  sessionStorage.removeItem(KEY);
}

const BREACHED = new Set([
  "password1234",
  "password12345",
  "qwerty123456",
  "letmein123456",
  "iloveyou1234",
  "123456789012",
  "abcdefghijkl",
  "fertilizer123",
  "aquifert1234",
  "welcome12345",
]);

export function isBreachedPassword(pw: string): boolean {
  return BREACHED.has(pw.toLowerCase());
}

export function passwordStrength(pw: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (pw.length === 0) return { score: 0, label: "", color: "bg-slate-200" };
  if (isBreachedPassword(pw)) {
    return {
      score: 0,
      label: "This password appears in known breaches, choose another.",
      color: "bg-red-500",
    };
  }
  if (pw.length < 12) {
    return {
      score: 1,
      label: `At least 12 characters, ${12 - pw.length} more to go.`,
      color: "bg-amber-500",
    };
  }
  if (pw.length < 16) {
    return {
      score: 2,
      label: "Good. Longer is stronger, a short phrase works well.",
      color: "bg-teal-500",
    };
  }
  return { score: 3, label: "Strong password.", color: "bg-emerald-600" };
}

export const authInputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";
