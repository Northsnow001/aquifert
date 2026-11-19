"use client";

import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH, projectPoint } from "@/lib/tools/world-map";
import { PACE_FILL } from "@/components/admin/aq-analytics/kpi";

type Arc = {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  qty: number;
  load: string;
  disch: string;
};

export function WorldBoard({
  pace,
  arcs,
  hrefFor,
}: {
  pace: { country: string; status: string }[];
  arcs: Arc[];
  hrefFor?: (country: string) => string;
}) {
  const byName = new Map(pace.map((row) => [row.country.toLowerCase(), row.status]));
  const max = Math.max(...arcs.map((arc) => arc.qty), 1);
  return (
    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-auto w-full" role="img" aria-label="Import pace and freight lanes">
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#eef3f8" />
      {COUNTRY_SHAPES.map((shape) => {
        const status = byName.get(shape.name.toLowerCase());
        const fill = status ? PACE_FILL[status] ?? "#d5dee8" : "#d5dee8";
        const href = hrefFor?.(shape.name);
        const node = <path d={shape.d} fill={fill} stroke="#fff" strokeWidth={0.4} />;
        return href && status ? (
          <a key={shape.id} href={href} aria-label={shape.name}>
            {node}
          </a>
        ) : (
          <g key={shape.id}>{node}</g>
        );
      })}
      {arcs.map((arc, index) => {
        const a = projectPoint(arc.fromLon, arc.fromLat);
        const b = projectPoint(arc.toLon, arc.toLat);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 28;
        return (
          <path
            key={`${arc.load}-${arc.disch}-${index}`}
            d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
            fill="none"
            stroke="#2f6fb3"
            strokeOpacity={0.55}
            strokeWidth={0.8 + (arc.qty / max) * 3.2}
          >
            <title>
              {arc.load} → {arc.disch} · {Math.round(arc.qty).toLocaleString("en-GB")} MT
            </title>
          </path>
        );
      })}
    </svg>
  );
}
