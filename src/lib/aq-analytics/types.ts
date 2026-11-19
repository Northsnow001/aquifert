export type FreightOrder = {
  id: number;
  importId: string;
  segment: "quoted" | "week";
  account: string;
  orderType: "cargo" | "tonnage";
  product: string;
  packing: string | null;
  qtyMin: number;
  qtyMax: number;
  loadPort: string;
  loadCountry: string;
  loadLat: number;
  loadLon: number;
  dischPort: string;
  dischCountry: string;
  dischLat: number;
  dischLon: number;
  laycanStart: string;
  laycanEnd: string;
  needsReview: boolean;
};

export type FreightImport = {
  id: string;
  source: string;
  reportDate: string;
  totalOrders: number;
};

export type PortLineup = {
  port: string;
  country: string;
  berth: number;
  anchor: number;
  expected: number;
  note: string;
};

export type ProducerStatus = {
  country: string;
  label: string;
  note: string;
  status: string;
  updatedAt: string;
};

export type CountryProfile = {
  country: string;
  role: "import" | "export";
  monthlyCapacityMt: number | null;
  primaryWindow: number[];
  secondaryWindow: number[];
  calendarNote: string;
};

export type AqViewItem = {
  kind: string;
  at: string;
  title: string;
  body: string;
  country: string | null;
  product: string | null;
};

export type UserMarkets = {
  countries: string[];
  originCountries: string[];
  products: string[];
  ports: string[];
  alertTypes: string[];
  channels: string[];
  timing: "instant" | "daily" | "weekly";
  reportEmail: boolean;
};

export type ReportSchedule = { id: string; name: string; cadence: string; market: string; active: boolean };
export type ReportRun = { id: string; name: string; market: string; period: string; at: string };
export type AccessRequest = {
  id: string;
  plan: string;
  name: string;
  email: string;
  company: string;
  message: string;
  at: string;
};

export type AqAnalyticsState = {
  version: 1;
  imports: FreightImport[];
  orders: FreightOrder[];
  lineups: PortLineup[];
  producers: ProducerStatus[];
  profiles: CountryProfile[];
  view: AqViewItem[];
  markets: UserMarkets;
  schedules: ReportSchedule[];
  runs: ReportRun[];
  accessRequests: AccessRequest[];
};

export const qtyOf = (order: Pick<FreightOrder, "qtyMin" | "qtyMax">) => (order.qtyMin + order.qtyMax) / 2;

export function weekCommencing(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const weekday = d.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
