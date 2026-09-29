import waypoints from "@/data/waypoints.json";
import regionGroup from "@/data/region-group.json";
import { pathDistance, type LatLon } from "@/lib/geo";

export type Canal = "suez" | "panama" | "cape" | "none";

export type PortPoint = LatLon & {
  name: string;
  region: string;
  country?: string;
};

export type BuiltRoute = {
  nauticalMiles: number;
  canal: Canal;
  waypoints: string[];
  routeType: string;
  bunkPort: string;
};

const groups = regionGroup as Record<string, string>;
const wp = waypoints as Record<string, LatLon>;
const BOSPHORUS: LatLon = { lat: 41.01, lon: 28.95 };

function basin(region: string): string {
  return groups[region] ?? "indian";
}

function isGulf(port: LatLon): boolean {
  return port.lon > 48 && port.lon < 57.5 && port.lat > 22 && port.lat < 31;
}

function isRedSea(port: LatLon): boolean {
  return port.lon > 32 && port.lon < 44 && port.lat > 10 && port.lat < 32;
}

function route(
  points: LatLon[],
  canal: Canal,
  waypointLabels: string[],
  routeType: string,
  bunkPort: string,
  multiplier = 1,
): BuiltRoute {
  return {
    nauticalMiles: Math.round(pathDistance(points) * multiplier),
    canal,
    waypoints: waypointLabels,
    routeType,
    bunkPort,
  };
}

export function buildRoute(load: PortPoint, discharge: PortPoint): BuiltRoute {
  const loadBasin = basin(load.region);
  const dischargeBasin = basin(discharge.region);
  const loadGulf = isGulf(load);
  const dischargeGulf = isGulf(discharge);
  const loadRedSea = isRedSea(load);
  const dischargeRedSea = isRedSea(discharge);
  const loadBlackSea = load.region === "Black Sea";
  const dischargeBlackSea = discharge.region === "Black Sea";
  const gulfExit = (port: LatLon) => [port, wp.hormuzExit, wp.rasHadd];

  if (loadRedSea && ["atlantic", "med", "pacific"].includes(dischargeBasin)) {
    if (dischargeBasin === "pacific") {
      return route(
        [load, wp.babelMandeb, wp.guardafui, wp.sriLanka, wp.malacca, discharge],
        "none",
        ["Bab-el-Mandeb", "Sri Lanka", "Malacca"],
        "Red Sea → Bab-el-Mandeb → Pacific",
        "Singapore",
      );
    }
    return route(
      [load, wp.babelMandeb, wp.capeHope, wp.capeWest, discharge],
      "cape",
      ["Bab-el-Mandeb", "Cape of Good Hope"],
      "Red Sea → Cape → Atlantic/Med",
      "Rotterdam",
    );
  }

  if (dischargeRedSea && ["atlantic", "med"].includes(loadBasin)) {
    return route(
      [load, wp.gibraltar, wp.suezNorth, wp.suezSouth, discharge],
      "suez",
      ["Gibraltar", "Suez Canal", "Red Sea"],
      "Atlantic/Med → Suez → Red Sea",
      "Fujairah",
    );
  }

  if (dischargeRedSea) {
    return route(
      [load, wp.babelMandeb, discharge],
      "none",
      ["Bab-el-Mandeb"],
      "Indian Ocean → Bab-el-Mandeb → Red Sea",
      "Fujairah",
    );
  }

  if (loadRedSea) {
    return route(
      [load, wp.babelMandeb, wp.aden, discharge],
      "none",
      ["Bab-el-Mandeb", "Indian Ocean"],
      "Red Sea → Bab-el-Mandeb → Indian Ocean",
      "Fujairah",
    );
  }

  if (
    loadBlackSea &&
    (dischargeBasin === "indian" ||
      discharge.region === "East Africa" ||
      discharge.region === "Southern Africa")
  ) {
    if (discharge.region === "East Africa") {
      return route(
        [load, BOSPHORUS, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.aden, wp.guardafui, discharge],
        "suez",
        ["Bosphorus", "Suez", "Bab-el-Mandeb", "East Africa"],
        "Black Sea → Bosphorus → Suez → East Africa",
        "Fujairah",
      );
    }
    if (discharge.region === "Southern Africa") {
      const suezMiles = pathDistance([
        load,
        BOSPHORUS,
        wp.suezNorth,
        wp.suezSouth,
        wp.babelMandeb,
        wp.guardafui,
        discharge,
      ]);
      const capeMiles = pathDistance([
        load,
        BOSPHORUS,
        wp.gibraltar,
        wp.capeWest,
        wp.capeHope,
        discharge,
      ]);
      if (suezMiles <= capeMiles * 1.2) {
        return route(
          [load, BOSPHORUS, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.guardafui, discharge],
          "suez",
          ["Bosphorus", "Suez", "Indian Ocean"],
          "Black Sea → Bosphorus → Suez → Southern Africa",
          "Fujairah",
        );
      }
      return route(
        [load, BOSPHORUS, wp.gibraltar, wp.capeWest, wp.capeHope, discharge],
        "cape",
        ["Bosphorus", "Gibraltar", "Cape of Good Hope"],
        "Black Sea → Cape → Southern Africa",
        "Rotterdam",
      );
    }
    return route(
      [load, BOSPHORUS, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.aden, discharge],
      "suez",
      ["Bosphorus", "Suez Canal", "Indian Ocean"],
      "Black Sea → Bosphorus → Suez → Indian Ocean",
      "Fujairah",
    );
  }

  if (dischargeBlackSea && (loadBasin === "indian" || load.region === "East Africa")) {
    return route(
      [load, wp.babelMandeb, wp.suezSouth, wp.suezNorth, BOSPHORUS, discharge],
      "suez",
      ["Bab-el-Mandeb", "Suez Canal", "Bosphorus"],
      "Indian Ocean → Suez → Black Sea",
      "Fujairah",
    );
  }

  if (loadBlackSea && dischargeBasin === "med" && !dischargeBlackSea) {
    return route([load, BOSPHORUS, discharge], "none", ["Bosphorus"], "Black Sea → Bosphorus → Mediterranean", "Rotterdam");
  }
  if (dischargeBlackSea && loadBasin === "med" && !loadBlackSea) {
    return route([load, BOSPHORUS, discharge], "none", ["Bosphorus"], "Mediterranean → Bosphorus → Black Sea", "Rotterdam");
  }
  if (loadBlackSea && dischargeBasin === "atlantic") {
    return route(
      [load, BOSPHORUS, wp.gibraltar, discharge],
      "none",
      ["Bosphorus", "Gibraltar"],
      "Black Sea → Bosphorus → Gibraltar → Atlantic",
      "Rotterdam",
    );
  }
  if (dischargeBlackSea && loadBasin === "atlantic") {
    return route(
      [load, wp.gibraltar, BOSPHORUS, discharge],
      "none",
      ["Gibraltar", "Bosphorus"],
      "Atlantic → Gibraltar → Bosphorus → Black Sea",
      "Rotterdam",
    );
  }

  if (load.region === "Baltic" && dischargeBasin === "atlantic") {
    const northern = ["Northern Europe", "Atlantic Europe"].includes(discharge.region);
    return route(
      northern ? [load, wp.skaw, discharge] : [load, wp.skaw, wp.dover, discharge],
      "none",
      northern ? ["Skaw"] : ["Skaw", "Dover"],
      "Baltic → Skaw → Atlantic",
      "Rotterdam",
    );
  }
  if (discharge.region === "Baltic" && loadBasin === "atlantic") {
    const northern = ["Northern Europe", "Atlantic Europe"].includes(load.region);
    return route(
      northern ? [load, wp.skaw, discharge] : [load, wp.dover, wp.skaw, discharge],
      "none",
      northern ? ["Skaw"] : ["Dover", "Skaw"],
      "Atlantic → Skaw → Baltic",
      "Rotterdam",
    );
  }

  if (loadBasin === "med" && dischargeBasin === "atlantic") {
    return route([load, wp.gibraltar, discharge], "none", ["Gibraltar"], "Mediterranean → Gibraltar → Atlantic", "Rotterdam");
  }
  if (loadBasin === "atlantic" && dischargeBasin === "med") {
    return route([load, wp.gibraltar, discharge], "none", ["Gibraltar"], "Atlantic → Gibraltar → Mediterranean", "Rotterdam");
  }

  if (loadBasin === dischargeBasin && !loadGulf && !dischargeGulf) {
    return route([load, discharge], "none", ["Direct (coastal)"], "Same region", "Rotterdam", 1.08);
  }

  if (loadGulf) {
    const prefix = gulfExit(load);
    if (dischargeBasin === "indian" && discharge.region !== "East Africa" && discharge.region !== "Southern Africa") {
      return route(
        [...prefix, wp.sriLanka, discharge],
        "none",
        ["Gulf", "Hormuz", "Ras al Hadd", "Sri Lanka", "Destination"],
        "Gulf → Hormuz → Ras al Hadd → Sri Lanka → Destination",
        "Fujairah",
      );
    }
    if (discharge.region === "Southern Africa") {
      return route(
        [...prefix, wp.guardafui, discharge],
        "none",
        ["Gulf", "Hormuz", "Guardafui", "Southern Africa"],
        "Gulf → Hormuz → Ras al Hadd → Cape Guardafui → Southern Africa",
        "Fujairah",
        1.05,
      );
    }
    if (discharge.region === "East Africa") {
      return route(
        [...prefix, wp.guardafui, discharge],
        "none",
        ["Gulf", "Hormuz", "Ras al Hadd", "Cape Guardafui", "East Africa"],
        "Gulf → Hormuz → Ras al Hadd → Cape Guardafui → East Africa",
        "Fujairah",
        1.175,
      );
    }
    if (dischargeBasin === "pacific") {
      return route(
        [...prefix, wp.sriLanka, wp.malacca, discharge],
        "none",
        ["Gulf", "Hormuz", "Sri Lanka", "Malacca", "Destination"],
        "Gulf → Hormuz → Sri Lanka → Malacca → Destination",
        "Singapore",
      );
    }
    const suezPoints = [...prefix, wp.guardafui, wp.babelMandeb, wp.aden, wp.suezSouth, wp.suezNorth];
    if (dischargeBasin === "med") {
      return route(
        [...suezPoints, discharge],
        "suez",
        ["Gulf", "Suez Canal", "Mediterranean"],
        "Gulf → Suez Canal → Mediterranean",
        "Rotterdam",
      );
    }
    return route(
      [...suezPoints, wp.gibraltar, discharge],
      "suez",
      ["Gulf", "Suez Canal", "Gibraltar", "Atlantic"],
      "Gulf → Suez Canal → Gibraltar → Atlantic",
      "Rotterdam",
    );
  }

  if (dischargeGulf) {
    const suffix = [wp.rasHadd, wp.hormuzExit, discharge];
    if (loadBasin === "indian" && load.region !== "East Africa") {
      return route(
        [load, wp.sriLanka, ...suffix],
        "none",
        ["Origin", "Sri Lanka", "Hormuz", "Gulf"],
        "Origin → Sri Lanka → Hormuz → Gulf",
        "Fujairah",
      );
    }
    if (load.region === "East Africa") {
      return route(
        [load, wp.guardafui, wp.rasHadd, wp.hormuzExit, discharge],
        "none",
        ["East Africa", "Guardafui", "Hormuz", "Gulf"],
        "East Africa → Guardafui → Hormuz → Gulf",
        "Fujairah",
      );
    }
    if (loadBasin === "pacific") {
      return route(
        [load, wp.malacca, wp.sriLanka, ...suffix],
        "none",
        ["Pacific", "Malacca", "Sri Lanka", "Gulf"],
        "Pacific → Malacca → Sri Lanka → Gulf",
        "Fujairah",
      );
    }
    return route(
      [load, wp.gibraltar, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.aden, wp.guardafui, wp.rasHadd, wp.hormuzExit, discharge],
      "suez",
      ["Atlantic/Med", "Gibraltar", "Suez", "Gulf"],
      "Atlantic/Med → Gibraltar → Suez → Gulf",
      "Fujairah",
    );
  }

  if (
    (loadBasin === "pacific" && dischargeBasin === "atlantic") ||
    (loadBasin === "atlantic" && dischargeBasin === "pacific")
  ) {
    const suezPoints =
      loadBasin === "pacific"
        ? [load, wp.malacca, wp.sriLanka, wp.babelMandeb, wp.suezSouth, wp.suezNorth, wp.gibraltar, discharge]
        : [load, wp.gibraltar, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.sriLanka, wp.malacca, discharge];
    const panamaPoints =
      loadBasin === "pacific"
        ? [load, wp.panamaPac, wp.panamaAtl, discharge]
        : [load, wp.panamaAtl, wp.panamaPac, discharge];
    if (pathDistance(panamaPoints) < pathDistance(suezPoints)) {
      return route(panamaPoints, "panama", ["Panama Canal Route"], "Pacific ↔ Atlantic via Panama", "Houston");
    }
    return route(suezPoints, "suez", ["Suez Canal Route"], "Pacific ↔ Atlantic via Suez", "Singapore");
  }

  if (["med", "atlantic"].includes(loadBasin) && ["indian", "pacific"].includes(dischargeBasin)) {
    const suezPrefix = [load, wp.gibraltar, wp.suezNorth, wp.suezSouth, wp.babelMandeb, wp.aden];
    const capePrefix = [load, wp.capeWest, wp.capeHope];
    if (dischargeBasin === "pacific") {
      const suezPoints = [...suezPrefix, wp.guardafui, wp.sriLanka, wp.malacca, discharge];
      const capePoints = [...capePrefix, wp.sriLanka, wp.malacca, discharge];
      if (pathDistance(suezPoints) <= pathDistance(capePoints) * 1.25) {
        return route(suezPoints, "suez", ["Gibraltar", "Suez", "Sri Lanka", "Malacca"], "Atlantic/Med → Suez → Pacific", "Singapore");
      }
      return route(capePoints, "cape", ["Cape of Good Hope", "Sri Lanka", "Malacca"], "Atlantic/Med → Cape → Pacific", "Singapore");
    }
    if (discharge.region === "East Africa") {
      const suezPoints = [...suezPrefix, wp.guardafui, discharge];
      const capePoints = [...capePrefix, discharge];
      if (pathDistance(suezPoints) <= pathDistance(capePoints) * 1.25) {
        return route(suezPoints, "suez", ["Suez", "Bab-el-Mandeb", "East Africa"], "Atlantic → Suez → East Africa", "Rotterdam");
      }
      return route(capePoints, "cape", ["Cape of Good Hope", "East Africa"], "Atlantic → Cape → East Africa", "Rotterdam");
    }
    const suezPoints = [...suezPrefix, wp.guardafui, wp.sriLanka, discharge];
    const capePoints = [...capePrefix, discharge];
    if (pathDistance(suezPoints) <= pathDistance(capePoints) * 1.25) {
      return route(suezPoints, "suez", ["Gibraltar", "Suez", "Indian Ocean"], "Atlantic/Med → Suez → Indian Ocean", "Fujairah");
    }
    return route(capePoints, "cape", ["Cape of Good Hope"], "Atlantic/Med → Cape → Indian Ocean", "Fujairah");
  }

  if (["indian", "pacific"].includes(loadBasin) && ["med", "atlantic"].includes(dischargeBasin)) {
    const suezPrefix =
      loadBasin === "pacific"
        ? [load, wp.malacca, wp.sriLanka, wp.guardafui, wp.babelMandeb, wp.aden, wp.suezSouth, wp.suezNorth]
        : [load, wp.sriLanka, wp.guardafui, wp.babelMandeb, wp.aden, wp.suezSouth, wp.suezNorth];
    const capePrefix =
      loadBasin === "pacific"
        ? [load, wp.malacca, wp.capeHope, wp.capeWest]
        : [load, wp.capeHope, wp.capeWest];
    const suezPoints = dischargeBasin === "med" ? [...suezPrefix, discharge] : [...suezPrefix, wp.gibraltar, discharge];
    const capePoints = [...capePrefix, discharge];
    if (pathDistance(suezPoints) <= pathDistance(capePoints) * 1.25) {
      return route(suezPoints, "suez", ["Suez Canal", "Mediterranean/Atlantic"], "Indian/Pacific → Suez → West", "Rotterdam");
    }
    return route(capePoints, "cape", ["Cape of Good Hope"], "Indian/Pacific → Cape → West", "Rotterdam");
  }

  if (load.region === "East Africa" || discharge.region === "East Africa") {
    return route([load, wp.guardafui, discharge], "none", ["Cape Guardafui"], "Indian Ocean via Guardafui", "Singapore", 1.02);
  }

  if (loadBasin === "pacific" && dischargeBasin === "indian") {
    if (load.lon < 100) {
      return route([load, discharge], "none", ["Bay of Bengal"], "Bay of Bengal Direct", "Singapore", 1.06);
    }
    if (discharge.lon < 55 && discharge.lat > 10) {
      return route(
        [load, wp.malacca, wp.sriLanka, wp.guardafui, wp.babelMandeb, wp.aden, discharge],
        "none",
        ["Malacca", "Sri Lanka", "Bab-el-Mandeb"],
        "Pacific → Malacca → Indian Ocean → Red Sea",
        "Singapore",
      );
    }
    return route(
      [load, wp.malacca, wp.sriLanka, discharge],
      "none",
      ["Strait of Malacca", "Sri Lanka"],
      "Pacific → Malacca → Indian Ocean",
      "Singapore",
    );
  }

  if (loadBasin === "indian" && dischargeBasin === "pacific") {
    if (discharge.lon < 100) {
      return route([load, discharge], "none", ["Bay of Bengal"], "Bay of Bengal Direct", "Singapore", 1.06);
    }
    return route(
      [load, wp.sriLanka, wp.malacca, discharge],
      "none",
      ["Sri Lanka", "Strait of Malacca"],
      "Indian Ocean → Malacca → Pacific",
      "Singapore",
    );
  }

  return route([load, discharge], "none", ["Direct"], "Direct", "Singapore", 1.08);
}

export function isGulfPort(port: LatLon): boolean {
  return isGulf(port);
}
