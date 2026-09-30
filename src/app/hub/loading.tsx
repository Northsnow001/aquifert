export default function HubLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2 pt-1">
        <div className="aq-skeleton h-7 w-56" />
        <div className="aq-skeleton h-4 w-[min(420px,80%)]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="aq-skeleton h-36 rounded-[18px]" />
        ))}
      </div>
      <div className="aq-skeleton h-[420px] rounded-[18px]" />
    </div>
  );
}
