import { PageHeader } from "@/components/admin/ui";
import { BookCrud } from "@/components/admin/trade/book-crud";
import { bookSpec } from "@/lib/trade/book";
import { listBookRows } from "@/lib/trade/book-store";

export async function TradeTablePage({ slug }: { slug: string }) {
  const spec = bookSpec(slug);
  if (!spec) return null;
  const rows = await listBookRows(slug).catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title={spec.title}
        description={`${spec.description} Workbook sheet: ${spec.sheet}.`}
      />
      <BookCrud spec={spec} initial={rows} />
    </div>
  );
}
