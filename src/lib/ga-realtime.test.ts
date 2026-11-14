import assert from "node:assert/strict";
import test from "node:test";
import { metricMap, minutesFrom } from "./ga-realtime-shared";

test("a totals report reads the active user count", () => {
  assert.deepEqual(
    metricMap({
      metricHeaders: [{ name: "activeUsers" }, { name: "eventCount" }],
      rows: [{ metricValues: [{ value: "4" }, { value: "12" }] }],
    }),
    { activeUsers: 4, eventCount: 12 },
  );
});

test("minutes fill the gaps so the live chart stays thirty bars", () => {
  const minutes = minutesFrom({
    dimensionHeaders: [{ name: "minutesAgo" }],
    metricHeaders: [{ name: "activeUsers" }],
    rows: [
      { dimensionValues: [{ value: "0" }], metricValues: [{ value: "2" }] },
      { dimensionValues: [{ value: "29" }], metricValues: [{ value: "1" }] },
    ],
  });
  assert.equal(minutes.length, 30);
  assert.deepEqual(minutes[0], { ago: 29, users: 1 });
  assert.deepEqual(minutes[29], { ago: 0, users: 2 });
  assert.equal(minutes[15].users, 0);
});
