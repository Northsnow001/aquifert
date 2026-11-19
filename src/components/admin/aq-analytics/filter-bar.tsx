import { btnSecondary, input } from "@/components/admin/ui";

export function FilterBar({
  action,
  values,
  products,
  origins,
  destinations,
  extra,
}: {
  action: string;
  values: Record<string, string | undefined>;
  products: string[];
  origins: string[];
  destinations: string[];
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-white p-3">
      <label className="text-[12px] text-mid">
        Product
        <select name="product" defaultValue={values.product ?? "All"} className={`${input} mt-1 h-9 w-40`}>
          <option>All</option>
          {products.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-[12px] text-mid">
        Origin
        <select name="origin" defaultValue={values.origin ?? "All"} className={`${input} mt-1 h-9 w-40`}>
          <option>All</option>
          {origins.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-[12px] text-mid">
        Destination
        <select name="destination" defaultValue={values.destination ?? "All"} className={`${input} mt-1 h-9 w-44`}>
          <option>All</option>
          {destinations.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-[12px] text-mid">
        Search
        <input name="q" defaultValue={values.q ?? ""} className={`${input} mt-1 h-9 w-44`} placeholder="Port, account…" />
      </label>
      {extra}
      <button className={btnSecondary} type="submit">
        Apply
      </button>
    </form>
  );
}
