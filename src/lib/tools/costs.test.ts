import assert from "node:assert/strict";
import test from "node:test";
import { productCosts } from "./costs";

function costOf(gas: number, rock: number, sulphur: number, id: string) {
  const row = productCosts({ gas, rock, sulphur }).find((product) => product.id === id);
  assert.ok(row);
  return row.cost;
}

test("default feedstock matches the live tools calculator", () => {
  assert.equal(costOf(7, 175, 165, "nh3prod"), 261);
  assert.equal(costOf(7, 175, 165, "urea"), 251);
  assert.equal(costOf(7, 175, 165, "hno3"), 106);
  assert.equal(costOf(7, 175, 165, "an"), 226);
  assert.equal(costOf(7, 175, 165, "amsul"), 161);
  assert.equal(costOf(7, 175, 165, "h2so4"), 84);
  assert.equal(costOf(7, 175, 165, "phos"), 896);
  assert.equal(costOf(7, 175, 165, "ssp"), 189);
  assert.equal(costOf(7, 175, 165, "tsp"), 360);
  assert.equal(costOf(7, 175, 165, "map"), 480);
  assert.equal(costOf(7, 175, 165, "dap"), 459);
});

test("raising sulphur reprices acid and phosphate products only", () => {
  assert.equal(costOf(7, 175, 635, "nh3prod"), 261);
  assert.equal(costOf(7, 175, 635, "urea"), 251);
  assert.equal(costOf(7, 175, 635, "h2so4"), 240);
  assert.equal(costOf(7, 175, 635, "amsul"), 278);
  assert.equal(costOf(7, 175, 635, "phos"), 1331);
  assert.equal(costOf(7, 175, 635, "ssp"), 288);
  assert.equal(costOf(7, 175, 635, "tsp"), 580);
  assert.equal(costOf(7, 175, 635, "map"), 704);
  assert.equal(costOf(7, 175, 635, "dap"), 659);
});
