import { updateProfile } from "@/app/(auth)/actions";
import { getSession } from "@/lib/session";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSession();
  const params = await searchParams;
  return (
    <section className="max-w-lg rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Profile</h1>
      {params.saved ? <p className="mt-2 text-xs text-teal">Profile saved.</p> : null}
      <form action={updateProfile} className="mt-4 space-y-3">
        <label className="block text-xs uppercase tracking-wide text-mid">
          Name
          <input name="name" defaultValue={user?.name} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </label>
        <p className="text-sm text-mid">{user?.email}</p>
        <button type="submit" className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white">
          Save profile
        </button>
      </form>
    </section>
  );
}
