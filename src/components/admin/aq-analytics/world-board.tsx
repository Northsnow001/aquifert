import { PACE_FILL } from "@/components/admin/aq-analytics/kpi";
import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH, projectPoint } from "@/lib/tools/world-map";

type Arc = {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  qty: number;
  load: string;
  disch: string;
};

const LEGEND = [
  { status: "ahead", label: "Ahead of pace" },
  { status: "on", label: "On pace" },
  { status: "behind", label: "Behind pace" },
  { status: "gap", label: "Coverage gap" },
];

export function WorldBoard({
  pace,
  arcs,
  hrefBase,
}: {
  pace: { country: string; status: string }[];
  arcs: Arc[];
  hrefBase?: string;
}) {
  const byName = new Map(pace.map((row) => [row.country.toLowerCase(), row.status]));
  const max = Math.max(...arcs.map((arc) => arc.qty), 1);
  return (
    <div>
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="block h-auto w-full" role="img" aria-label="Import pace and freight lanes">
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#dce4ea" />
        {COUNTRY_SHAPES.map((shape) => {
          const status = byName.get(shape.name.toLowerCase());
          const fill = status ? PACE_FILL[status] ?? "#f4f7f8" : "#f4f7f8";
          const href = hrefBase && status ? `${hrefBase}?country=${encodeURIComponent(shape.name)}` : undefined;
          const path = <path d={shape.d} fill={fill} stroke="#b7c5ce" strokeWidth={0.6} />;
          return href ? (
            <a key={shape.id} href={href} aria-label={`${shape.name}: ${status}`}>
              {path}
            </a>
          ) : (
            <g key={shape.id}>{path}</g>
          );
        })}
        {arcs.map((arc, index) => {
          const from = projectPoint(arc.fromLon, arc.fromLat);
          const to = projectPoint(arc.toLon, arc.toLat);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2 - 28;
          return (
            <g key={`${arc.load}-${arc.disch}-${index}`}>
              <path
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke="#1d4f8c"
                strokeOpacity={0.7}
                strokeWidth={1 + (arc.qty / max) * 3.5}
              />
              <title>
                {arc.load} → {arc.disch} · {Math.round(arc.qty).toLocaleString("en-GB")} MT
              </title>
              <circle cx={from.x} cy={from.y} r={2.4} fill="#10263b" />
              <circle cx={to.x} cy={to.y} r={2.4} fill="#2f6fb3" />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11.5px] text-mid">
        {LEGEND.map((item) => (
          <span key={item.status} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: PACE_FILL[item.status] }} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 bg-[#1d4f8c]" />
          Freight lane (load → discharge)
        </span>
      </div>
    </div>
  );
}
