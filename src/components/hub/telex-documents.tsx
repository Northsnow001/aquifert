"use client";

import { useState } from "react";
import { Download, Eye, ExternalLink, FileImage, FileSpreadsheet, FileText, Paperclip, Presentation, X } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { formatBytes, telexDocExt, telexDocHref, telexDocView, type TelexDocument } from "@/lib/content-types";

function DocIcon({ name }: { name: string }) {
  const ext = telexDocExt(name);
  const Icon = ["xls", "xlsx", "csv"].includes(ext) ? FileSpreadsheet : ["ppt", "pptx"].includes(ext) ? Presentation : telexDocView(name) === "image" ? FileImage : FileText;
  return (
    <span className="aq-chip aq-chip-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white">
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </span>
  );
}

const OPENS_WITH: Record<string, string> = {
  doc: "Opens in Word",
  docx: "Opens in Word",
  xls: "Opens in Excel",
  xlsx: "Opens in Excel",
  csv: "Opens in Excel or Sheets",
  ppt: "Opens in PowerPoint",
  pptx: "Opens in PowerPoint",
  txt: "Plain text",
};

/**
 * The files attached to a flash. PDFs open in a viewer under the list (a new tab on phones, where embedded
 * PDFs do not render), pictures show inline, Office files download.
 */
export function TelexDocuments({ telexId, documents }: { telexId: string; documents: TelexDocument[] }) {
  const [open, setOpen] = useState<string | null>(() => documents.find((doc) => telexDocView(doc.name) !== "download")?.id ?? null);
  const current = documents.find((doc) => doc.id === open) ?? null;
  const currentView = current ? telexDocView(current.name) : null;

  return (
    <section aria-labelledby="telex-documents" className="mt-6 print:hidden">
      <h2 id="telex-documents" className="flex items-center gap-2 text-[15.5px] font-semibold text-ink">
        <Paperclip className="h-4 w-4 text-blue" aria-hidden />
        {documents.length === 1 ? "Attached document" : `Attached documents (${documents.length})`}
      </h2>

      <ul className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
        {documents.map((doc) => {
          const view = telexDocView(doc.name);
          const ext = telexDocExt(doc.name).toUpperCase();
          const active = doc.id === open;
          return (
            <li key={doc.id} className={`flex flex-col gap-3 border-b border-border p-3.5 last:border-b-0 sm:flex-row sm:items-center ${active ? "bg-blue-light/40" : ""}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <DocIcon name={doc.name} />
                <div className="min-w-0">
                  <p className="break-words text-[15px] font-semibold leading-snug text-ink">{doc.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-dim">{[ext, formatBytes(doc.size), OPENS_WITH[telexDocExt(doc.name)]].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                {view === "pdf" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpen(active ? null : doc.id)}
                      aria-expanded={active}
                      aria-controls="telex-document-viewer"
                      className={`${btnSecondary} max-lg:hidden`}
                    >
                      {active ? <X className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      {active ? "Close" : "View"}
                    </button>
                    <a href={telexDocHref(telexId, doc, true)} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} lg:hidden`}>
                      <Eye className="h-4 w-4" aria-hidden />
                      View
                      <span className="sr-only"> (opens a new tab)</span>
                    </a>
                  </>
                ) : view === "image" ? (
                  <button type="button" onClick={() => setOpen(active ? null : doc.id)} aria-expanded={active} aria-controls="telex-document-viewer" className={btnSecondary}>
                    {active ? <X className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    {active ? "Close" : "View"}
                  </button>
                ) : null}
                <a href={telexDocHref(telexId, doc)} className={view === "download" ? btnPrimary : btnSecondary}>
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {current && currentView !== "download" ? (
        <div id="telex-document-viewer" className={`mt-3 overflow-hidden rounded-xl border border-border bg-s2 ${currentView === "pdf" ? "max-lg:hidden" : ""}`}>
          <div className="flex items-center gap-2 border-b border-border bg-white px-3.5 py-2">
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{current.title}</p>
            <a
              href={telexDocHref(telexId, current, true)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-semibold text-blue no-underline hover:bg-blue-light"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Full screen
              <span className="sr-only"> (opens a new tab)</span>
            </a>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close the viewer" className="rounded-md p-1 text-dim hover:bg-s2 hover:text-ink">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {currentView === "pdf" ? (
            <iframe key={current.id} src={telexDocHref(telexId, current, true)} title={`${current.title} viewer`} className="block h-[80dvh] min-h-[36rem] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a signed storage link that changes every request
            <img key={current.id} src={telexDocHref(telexId, current, true)} alt={current.title} className="mx-auto block max-h-[80dvh] w-auto max-w-full object-contain" />
          )}
        </div>
      ) : null}
    </section>
  );
}
