"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}

export function ConfirmSubmit({
  message,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      {...props}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function PendingButton({ children, pendingLabel, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || props.disabled}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Select-all checkbox plus the bulk action bar for a server-rendered table inside the same form. */
export function BulkBar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => setCount(form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked').length);
    form.addEventListener("change", update);
    update();
    return () => form.removeEventListener("change", update);
  }, []);

  return (
    <div ref={ref} className={`flex flex-wrap items-center gap-2 ${count ? "" : "opacity-60"}`}>
      <span className="font-mono text-[11.5px] text-mid">{count ? `${count} selected` : "Select rows for bulk actions"}</span>
      <fieldset disabled={count === 0} className="flex items-center gap-2">
        {children}
      </fieldset>
    </div>
  );
}

export function BulkApply({
  className,
  confirmMessage = "Delete the selected messages? Members will no longer see them.",
}: {
  className?: string;
  confirmMessage?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        const select = event.currentTarget.form?.elements.namedItem("bulk") as HTMLSelectElement | null;
        if (select?.value === "delete" && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      Apply
    </button>
  );
}

export function SelectAll() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all rows"
      className="h-4 w-4 accent-[#2e6da4]"
      onChange={(event) => {
        const form = event.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
          box.checked = event.currentTarget.checked;
        });
        form?.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    />
  );
}
