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

const ports = [];
const re =
  /'name' => '([^']*)', 'country' => '([^']*)', 'region' => '([^']*)', 'unlocode' => '([^']*)', 'lat' => ([-\d.]+), 'lng' => ([-\d.]+)/g;
let match;
while ((match = re.exec(portsPhp))) {
  const slug = match[3];
  ports.push({
    name: match[1],
    country: match[2],
    region: regionLabel[slug] ?? slug,
    code: match[4],
    lat: Number(match[5]),
    lon: Number(match[6]),
  });
}

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/ports.json", JSON.stringify(ports, null, 2));
console.log("ports", ports.length);
