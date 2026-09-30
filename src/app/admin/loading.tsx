export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className="aq-skeleton h-8 w-60" />
        <div className="aq-skeleton h-4 w-[min(460px,80%)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="aq-skeleton h-24 rounded-[18px]" />
        ))}
      </div>
      <div className="aq-skeleton h-[380px] rounded-[18px]" />
    </div>
  );
}
