"use client";

export function CopyText({ value }: { value: string }) {
  if (!value) return <span className="text-dim">—</span>;
  return (
    <button
      type="button"
      title="Copy"
      className="max-w-[220px] truncate text-left text-ink hover:text-blue"
      onClick={() => void navigator.clipboard.writeText(value)}
    >
      {value}
    </button>
  );
}
