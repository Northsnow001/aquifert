import fs from "node:fs";

const portsPhp = fs.readFileSync(
  "../aquifert-wordpress/wp-content/plugins/aquifert/inc/data/ports.php",
  "utf8",
);
const regionLabel = {
  middle_east: "Middle East",
  indian_subcontinent: "Indian Subcontinent",
  east_asia: "East Asia",
  southeast_asia: "Southeast Asia",
  se_asia: "Southeast Asia",
  north_america: "North America",
  south_america: "South America",
  northern_europe: "Northern Europe",
  atlantic_europe: "Atlantic Europe",
  mediterranean: "Mediterranean",
  north_africa: "North Africa",
  west_africa: "West Africa",
  east_africa: "East Africa",
  southern_africa: "Southern Africa",
  black_sea: "Black Sea",
  baltic: "Baltic",
  oceania: "Oceania",
  caribbean: "Caribbean",
  central_america: "Central America",
  arctic: "Arctic",
  red_sea: "Red Sea",
};

const str = String.raw`'((?:[^'\\]|\\.)*)'`;
const unescape = (value) => value.replace(/\\(.)/g, "$1");
const re = new RegExp(
  String.raw`'name' => ${str}, 'country' => ${str}, 'region' => ${str}, 'unlocode' => ${str}, 'lat' => ([-\d.]+), 'lng' => ([-\d.]+)(?:, 'aliases' => \[([^\]]*)\])?`,
  "g",
);

const ports = [];
let match;
while ((match = re.exec(portsPhp))) {
  const slug = match[3];
  const aliases = match[7] ? [...match[7].matchAll(new RegExp(str, "g"))].map((alias) => unescape(alias[1])) : [];
  ports.push({
    name: unescape(match[1]),
    country: unescape(match[2]),
    region: regionLabel[slug] ?? slug,
    code: unescape(match[4]),
    lat: Number(match[5]),
    lon: Number(match[6]),
    ...(aliases.length ? { aliases } : {}),
  });
}

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/ports.json", JSON.stringify(ports, null, 2));
console.log("ports", ports.length);
