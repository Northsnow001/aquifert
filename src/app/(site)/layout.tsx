import { getSiteContent } from "@/lib/site-content/store";
import { SiteGlobalProvider } from "@/marketing/lib/site-global";

/** Saving in the admin refreshes pages straight away; this is the backstop. */
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { global } = await getSiteContent();
  return (
    <SiteGlobalProvider value={global}>
      <div className="mkt">{children}</div>
    </SiteGlobalProvider>
  );
}
