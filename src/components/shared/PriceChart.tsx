import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";

export type PricePoint = { date: string; [series: string]: string | number };

const SERIES_COLORS = ["#254F76", "#4F7F72", "#FF8C00", "#31648F", "#7C3AED"];

export function PriceChart({
  data,
  series,
  area = false,
  height = 320,
  currency = "$",
}: {
  data: PricePoint[];
  series: string[];
  area?: boolean;
  height?: number;
  currency?: string;
}) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${currency}${v}`}
            domain={["dataMin - 10", "dataMax + 10"]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              fontSize: 12,
            }}
            formatter={(value) => [`${currency}${Number(value).toFixed(2)}/t`]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) =>
            area ? (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2.2}
                dot={false}
              />
            ) : (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2.2}
                dot={false}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

/** Minimal sparkline for teasers */
export function Sparkline({ data, color = "#4F7F72", height = 48 }: { data: number[]; color?: string; height?: number }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
