import Link from "next/link";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedAnalysis, getAqModules } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { getHubContent } from "@/lib/hub-content";
import { answerTerms, matchesFeed } from "@/lib/onboarding/questions";
import { getOnboardingQuestions } from "@/lib/onboarding/store";

export async function PersonalFeed({ title, lede }: { title: string; lede: string }) {
  const { user, admin } = await getHubAccess();
  const [content, modules, prefs, questions] = await Promise.all([getHubContent(), getAqModules(), getPrefs(user), getOnboardingQuestions()]);
  const terms = prefs.onboardingDone ? answerTerms(questions, prefs.onboardingAnswers) : [];
  const keep = (text: string, tags: string[], category: string) =>
    !prefs.onboardingDone || matchesFeed({ text, tags, category }, prefs.interests, terms);
  const telex = publishedTelex(content.telex, admin ? "all" : user.plan)
    .filter((item) => item.readable)
    .filter((item) => keep(`${item.headline} ${item.tags.join(" ")} ${item.paragraphs.join(" ")} ${item.product}`, item.tags, item.product));
  const notes = publishedAnalysis(modules).filter((note) => keep(`${note.title} ${note.products.join(" ")}`, note.products, note.products[0] ?? ""));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-mid">{lede}</p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white">
          <h2 className="border-b border-border px-4 py-3 text-[14px] font-semibold">Telex</h2>
          {telex.length === 0 ? (
            <p className="px-4 py-8 text-[13.5px] text-mid">No Telex flashes match your answers yet. New flashes appear here as the desk publishes them.</p>
          ) : (
            <ul className="divide-y divide-border">
              {telex.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={`/hub/telex/${item.id}`} className="block px-4 py-3 no-underline hover:bg-s2">
                    <p className="text-[13.5px] font-semibold text-ink">{item.headline}</p>
                    <p className="text-[12px] text-dim">{item.product}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-2xl border border-border bg-white">
          <h2 className="border-b border-border px-4 py-3 text-[14px] font-semibold">AQ View</h2>
          {notes.length === 0 ? (
            <p className="px-4 py-8 text-[13.5px] text-mid">No AQ View notes match your answers yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notes.slice(0, 8).map((note) => (
                <li key={note.id}>
                  <Link href={`/hub/analysis/${note.slug}`} className="block px-4 py-3 no-underline hover:bg-s2">
                    <p className="text-[13.5px] font-semibold text-ink">{note.title}</p>
                    <p className="text-[12px] text-dim">{note.products.join(" · ") || "Market analysis"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
