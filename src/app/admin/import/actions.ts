"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import {
  applyImport,
  cleanOptions,
  discardExport,
  downloadFile,
  loadExport,
  pendingFiles,
  planImport,
  type ImportOptions,
  type PendingFile,
  type SectionPlan,
} from "@/lib/wp-import/import";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
}

type Failure = { ok: false; message: string };
const failure = (error: unknown): Failure => ({ ok: false, message: error instanceof Error ? error.message : "Something went wrong." });
const noExport: Failure = { ok: false, message: "Upload the WordPress export file first." };

export async function previewWpImport(options: ImportOptions): Promise<{ ok: true; sections: SectionPlan[] } | Failure> {
  await requireAdmin();
  const data = await loadExport();
  if (!data) return noExport;
  try {
    return { ok: true, sections: await planImport(data, cleanOptions(options, data)) };
  } catch (error) {
    return failure(error);
  }
}

export async function runWpImport(options: ImportOptions): Promise<{ ok: true; sections: SectionPlan[]; pending: PendingFile[] } | Failure> {
  await requireAdmin();
  const data = await loadExport();
  if (!data) return noExport;
  try {
    const clean = cleanOptions(options, data);
    const sections = await applyImport(data, clean);
    refresh();
    return { ok: true, sections, pending: clean.sections.library ? await pendingFiles(data) : [] };
  } catch (error) {
    return failure(error);
  }
}

export async function downloadWpFile(id: number): Promise<{ ok: true; title: string; bytes: number } | Failure> {
  await requireAdmin();
  const data = await loadExport();
  if (!data) return noExport;
  try {
    const result = await downloadFile(data, Number(id));
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function finishWpDownloads(): Promise<{ ok: true }> {
  await requireAdmin();
  refresh();
  return { ok: true };
}

export async function discardWpImport(): Promise<{ ok: true }> {
  await requireAdmin();
  await discardExport();
  revalidatePath("/admin/import");
  return { ok: true };
}
