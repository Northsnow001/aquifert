import fs from "node:fs";

const source = fs.readFileSync(
  "../aquifert-wordpress/wp-content/plugins/aquifert/assets/js/freight-calculator.min.js",
  "utf8",
);
const start = source.indexOf("const WP=");
const end = source.indexOf("function ", start);
const snippet = source.slice(start, end);
const wp = Function(`${snippet}; return WP;`)();
const regionStart = source.indexOf("REGION_GROUP=");
const regionEnd = source.indexOf(";", regionStart);
let regionGroup = null;
if (regionStart > 0) {
  const regionSnippet = source.slice(regionStart, regionEnd + 1);
  regionGroup = Function(`${regionSnippet}; return REGION_GROUP;`)();
}
fs.writeFileSync("src/data/waypoints.json", JSON.stringify(wp, null, 2));
if (regionGroup) {
  fs.writeFileSync("src/data/region-group.json", JSON.stringify(regionGroup, null, 2));
}
console.log("waypoints", Object.keys(wp).length, "regions", regionGroup ? Object.keys(regionGroup).length : 0);
