import { redirect } from "next/navigation";

type Query = Record<string, string | string[] | undefined>;

/** Sends an old hub URL to its new home under Account, keeping the query string. */
export async function moved(path: string, searchParams?: Promise<Query>): Promise<never> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries((await searchParams) ?? {})) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const text = query.toString();
  redirect(text ? `${path}?${text}` : path);
}
