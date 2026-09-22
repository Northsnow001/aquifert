import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fmtDate, statusLabel } from "@/lib/format";

export type MapShipment = {
  id: number;
  containerNumber?: string | null;
  vesselName?: string | null;
  carrier?: string | null;
  currentLocation?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  eta?: Date | string | null;
  status: string;
  route?: unknown;
};

export function TrackingMap({
  shipments,
  height = 380,
  focusId,
}: {
  shipments: MapShipment[];
  height?: number;
  focusId?: number;
}) {
  const valid = shipments.filter((s) => s.currentLat != null && s.currentLng != null);
  const focus = valid.find((s) => s.id === focusId) ?? valid[0];
  const center: [number, number] = focus
    ? [Number(focus.currentLat), Number(focus.currentLng)]
    : [25, 60];
  const focusRoute = (focus?.route ?? null) as { name: string; lat: number; lng: number }[] | null;
  const route = focusRoute && focusRoute.length > 1
    ? focusRoute.map((p) => [p.lat, p.lng] as [number, number])
    : null;

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-xl border border-border">
      <MapContainer center={center} zoom={3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && <Polyline positions={route} color="#4F7F72" weight={2.5} dashArray="6 8" opacity={0.8} />}
        {valid.map((s) => (
          <CircleMarker
            key={s.id}
            center={[Number(s.currentLat), Number(s.currentLng)]}
            radius={s.id === focus?.id ? 9 : 6}
            pathOptions={{
              color: s.status === "DELIVERED" ? "#4CAF50" : "#254F76",
              fillColor: s.status === "DELIVERED" ? "#4CAF50" : "#4F7F72",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {s.containerNumber ?? "Container"} · {statusLabel(s.status)}
            </Tooltip>
            <Popup>
              <div className="text-xs leading-relaxed">
                <strong>{s.containerNumber}</strong>
                <br />
                {s.vesselName} · {s.carrier}
                <br />
                {s.currentLocation}
                <br />
                Status: {statusLabel(s.status)}
                <br />
                ETA: {fmtDate(s.eta)}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
