import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/dateTime.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { parseDateTime, calendarDateTime, monthDays, shiftMonth, localDateTime } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("wall-clock selection survives DST gaps and overlaps in any device zone", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/Los_Angeles", "Europe/Berlin", "Asia/Shanghai"]) {
      process.env.TZ = zone;
      for (const value of ["2027-03-14T02:30:00", "2027-03-28T02:30:00", "2027-11-07T01:30:00", "2028-02-29T23:59:59"]) {
        const selected = parseDateTime(value);
        assert(selected, `${zone}: ${value}`);
        assert.equal(calendarDateTime(selected), value);
      }
      const grid = monthDays(2027, 2);
      assert.equal(grid.length, 42);
      assert.equal(grid[0].getUTCDay(), 1);
      assert.equal(new Set(grid.map(calendarDateTime)).size, 42);
      for (let i = 1; i < grid.length; i++) assert.equal(grid[i] - grid[i - 1], 86400000);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("calendar rejects invalid dates and preserves wall time through month changes", () => {
  for (const value of ["2027-02-29T10:00:00", "2027-04-31T10:00:00", "2027-03-14T24:00:00", "2027-03-14T02:60:00", "", "2027-13-01T00:00:00"]) assert.equal(parseDateTime(value), null);
  assert.equal(calendarDateTime(shiftMonth(parseDateTime("2027-01-31T02:30:00"), 1)), "2027-02-28T02:30:00");
  assert.equal(calendarDateTime(shiftMonth(parseDateTime("2028-03-31T02:30:00"), -1)), "2028-02-29T02:30:00");
  assert.equal(localDateTime(new Date(2027, 0, 1, 12, 30, 5)), "2027-01-01T12:30:05");
});
