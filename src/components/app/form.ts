/** Shared form and button styles for the member app. Focus rings come from globals.css. */
export const fieldClass =
  "block h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[15.5px] text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none placeholder:text-dim hover:border-[#cdd7e1] disabled:bg-s2 disabled:text-dim";
export const areaClass =
  "block w-full rounded-xl border border-border bg-white px-3.5 py-3 text-[15.5px] leading-relaxed text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none placeholder:text-dim hover:border-[#cdd7e1]";
export const labelClass = "mb-1.5 block text-[14.5px] font-medium text-mid";
export const hintClass = "mt-1.5 text-[13px] leading-relaxed text-dim";
export const cardClass = "aq-card";
export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue px-5 text-[15.5px] font-semibold text-white no-underline shadow-[0_6px_16px_-8px_rgb(47_111_179/0.7)] transition hover:bg-blue-dim disabled:cursor-not-allowed disabled:opacity-55";
export const btnSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-white px-5 text-[15.5px] font-semibold text-ink no-underline transition hover:border-blue/35 hover:text-blue disabled:cursor-not-allowed disabled:opacity-55";
export const noticeOk = "flex items-start gap-2 rounded-xl border border-[#cdebd8] bg-[#f1faf4] px-4 py-3 text-[15px] font-medium text-[#1f7a45]";
export const noticeError = "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-medium text-danger";

/** Dialog form layout: the body scrolls and the footer with the submit button stays pinned. Children must not shrink, or short dialogs squash inputs and buttons. */
export const dialogBody = "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-5 [&>*]:shrink-0";
export const dialogFooter = "flex shrink-0 flex-col gap-2.5 border-t border-border bg-white px-5 pb-4 pt-3.5";
export const btnSubmit =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-5 py-2.5 text-[15.5px] font-semibold leading-snug text-white shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";
