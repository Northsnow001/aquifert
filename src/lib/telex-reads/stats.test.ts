import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration, MAX_VISIT_SECONDS, membersOf, mergeVisit, readersOf, statsFor, type TelexVisit } from "./stats";

const START = "2026-10-06T10:00:00.000Z";
const at = (seconds: number) => new Date(Date.parse(START) + seconds * 1000).toISOString();

const visit = (patch: Partial<TelexVisit> = {}): TelexVisit => ({
  id: "u1:v1",
  at: START,
  startedAt: START,
  userId: "u1",
  email: "ada@example.com",
  name: "Ada",
  plan: "core",
  admin: false,
  telexId: "t1",
  headline: "Urea firms",
  seconds: 0,
  depth: 0,
  readAt: null,
  ...patch,
});

test("a visit is marked read the moment it reaches 10 active seconds, and keeps that moment", () => {
  const opened = mergeVisit(visit(), { seconds: 0, depth: 40 }, at(1));
  assert.equal(opened.readAt, null);
  const read = mergeVisit(opened, { seconds: 10, depth: 80 }, at(11));
  assert.equal(read.readAt, at(11));
  const later = mergeVisit(read, { seconds: 45, depth: 100 }, at(50));
  assert.equal(later.readAt, at(11));
  assert.equal(later.seconds, 45);
});

test("reported time can never exceed the time since the visit started", () => {
  const merged = mergeVisit(visit(), { seconds: 600, depth: 10 }, at(20));
  assert.equal(merged.seconds, 25);
  assert.equal(mergeVisit(visit(), { seconds: 10, depth: 0 }, at(2)).readAt, null);
});

test("time and depth never go backwards and stay within bounds", () => {
  const current = visit({ seconds: 30, depth: 70 });
  const merged = mergeVisit(current, { seconds: 5, depth: 20 }, at(60));
  assert.equal(merged.seconds, 30);
  assert.equal(merged.depth, 70);
  assert.equal(mergeVisit(current, { seconds: 1e9, depth: 400 }, at(1e6)).seconds, MAX_VISIT_SECONDS);
  assert.equal(mergeVisit(current, { seconds: 40, depth: 400 }, at(60)).depth, 100);
});

test("readers fold several visits by one member into one row", () => {
  const rows = readersOf([
    visit({ id: "u1:a", seconds: 4, depth: 30, at: at(5) }),
    visit({ id: "u1:b", startedAt: at(100), at: at(130), seconds: 25, depth: 90, readAt: at(112) }),
    visit({ id: "u2:a", userId: "u2", name: "Bo", email: "bo@example.com", at: at(200), seconds: 3, depth: 100 }),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].userId, "u2");
  const ada = rows[1];
  assert.equal(ada.visits, 2);
  assert.equal(ada.seconds, 29);
  assert.equal(ada.depth, 90);
  assert.equal(ada.readAt, at(112));
  assert.equal(ada.firstAt, START);
});

test("stats count members, not visits, and average time over readers only", () => {
  const stats = statsFor([
    visit({ id: "u1:a", seconds: 12, readAt: at(10), depth: 100 }),
    visit({ id: "u1:b", seconds: 8, depth: 50 }),
    visit({ id: "u2:a", userId: "u2", seconds: 40, readAt: at(10), depth: 60 }),
    visit({ id: "u3:a", userId: "u3", seconds: 3, depth: 20 }),
  ]);
  assert.equal(stats.opened, 3);
  assert.equal(stats.read, 2);
  assert.equal(stats.visits, 4);
  assert.equal(stats.avgSeconds, 30);
  assert.equal(stats.medianSeconds, 30);
  assert.equal(stats.avgDepth, 60);
  assert.deepEqual(statsFor([]), { opened: 0, read: 0, visits: 0, avgSeconds: 0, medianSeconds: 0, avgDepth: 0, lastAt: null });
});

test("member activity counts distinct flashes and ranks by flashes read", () => {
  const members = membersOf([
    visit({ id: "u1:a", telexId: "t1", seconds: 15, readAt: at(10) }),
    visit({ id: "u1:b", telexId: "t1", seconds: 5 }),
    visit({ id: "u1:c", telexId: "t2", seconds: 2 }),
    visit({ id: "u2:a", userId: "u2", telexId: "t1", seconds: 20, readAt: at(10) }),
    visit({ id: "u2:b", userId: "u2", telexId: "t3", seconds: 11, readAt: at(10) }),
  ]);
  assert.deepEqual(
    members.map((member) => [member.userId, member.read, member.opened, member.seconds]),
    [
      ["u2", 2, 2, 31],
      ["u1", 1, 2, 22],
    ],
  );
});

test("durations read naturally", () => {
  assert.equal(formatDuration(0), "0s");
  assert.equal(formatDuration(42), "42s");
  assert.equal(formatDuration(95), "1m 35s");
  assert.equal(formatDuration(120), "2m");
  assert.equal(formatDuration(3725), "1h 2m");
});
