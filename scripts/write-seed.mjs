import fs from "node:fs";

const ports = JSON.parse(fs.readFileSync("src/data/ports.json", "utf8"));
const lines = [
  "insert into public.urea_benchmarks (key, label, port, region, fob, lat, lon) values",
  "('egypt','Egypt (Europe)','Port Said','North Africa',710,32.1,31.8),",
  "('algeria','Algeria','Arzew','North Africa',680,35.85,-0.32),",
  "('nigeria','Nigeria','Onne','West Africa',645,4.72,7.2),",
  "('black_sea','Black Sea','Poti','Black Sea',600,42.15,41.67),",
  "('baltic','Baltic','Riga','Baltic',640,56.95,24.11),",
  "('middle_east','Middle East','Ruwais','Middle East',585,24.11,52.73),",
  "('se_asia','SE Asia','Singapore','Southeast Asia',715,1.29,103.85),",
  "('iran','Iran','Bandar Abbas','Middle East',0,27.19,56.27),",
  "('china','China','Shanghai','East Asia',0,31.23,121.47)",
  "on conflict (key) do update set fob = excluded.fob;",
  "",
  "insert into public.import_duties (country, rate, active, afrmm, note) values",
  "('Brazil', 0, false, true, 'AFRMM levy applies at 0.25% of freight.'),\n('India', 5, true, false, 'Sample duty. Confirm with the live customs table.'),\n('United States', 0, false, false, 'No duty in the sample table.')",
  "on conflict (country) do nothing;",
  "",
  "insert into public.bunker_prices (city, price) values",
  "('Singapore',726),('Fujairah',724),('Rotterdam',691),('Houston',707),('Hong Kong',775),('New York',692)",
  "on conflict (city) do update set price = excluded.price;",
  "",
  "insert into public.market_inputs (key, value) values ('bdi', 2044), ('iran_war_risk_per_mt', 16), ('seasonal_premium', 2.5)",
  "on conflict (key) do update set value = excluded.value;",
  "",
];

const values = ports
  .map(
    (port) =>
      `('${port.code.replaceAll("'", "''")}','${port.name.replaceAll("'", "''")}','${port.country.replaceAll("'", "''")}','${port.region.replaceAll("'", "''")}',${port.lat},${port.lon})`,
  )
  .join(",\n");
lines.push("insert into public.ports (code, name, country, region, lat, lon) values");
lines.push(values);
lines.push("on conflict (code) do nothing;");
fs.mkdirSync("supabase", { recursive: true });
fs.writeFileSync("supabase/seed.sql", lines.join("\n"));
console.log("seed bytes", fs.statSync("supabase/seed.sql").size);
