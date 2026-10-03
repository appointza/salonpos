import { describe, expect, it } from "vitest";
import { plannedShiftRows, windowsFromRow } from "./from-hours";
import type { Row } from "@/store";

function staff(id: string, locationId: string): Row {
  return { id, name: `Staff ${id}`, locationId, status: "Active" };
}

describe("plannedShiftRows", () => {
  it("creates two slots per day for each selected staff across a date range", () => {
    const rows = plannedShiftRows({
      orgId: 1,
      locations: [{ locationId: "10", name: "Main" }],
      staff: [staff("1", "10"), staff("2", "10")],
      existing: [],
      from: "2026-03-01",
      to: "2026-03-07",
      staffIds: ["1", "2"],
      windows: [
        { startTime: "10:00", endTime: "13:00", shiftType: "Morning" },
        { startTime: "15:00", endTime: "21:00", shiftType: "Evening" },
      ],
    });
    expect(rows).toHaveLength(2 * 7 * 2);
    expect(rows.filter((r) => r["staffId"] === "1" && r["date"] === "2026-03-01")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startTime: "10:00", endTime: "13:00" }),
        expect.objectContaining({ startTime: "15:00", endTime: "21:00" }),
      ]),
    );
  });

  it("reads first and second slot from the new-shift form", () => {
    expect(
      windowsFromRow({
        startTime: "10:00",
        endTime: "13:00",
        splitStart: "15:00",
        splitEnd: "21:00",
      }),
    ).toEqual([
      { startTime: "10:00", endTime: "13:00", shiftType: "Morning" },
      { startTime: "15:00", endTime: "21:00", shiftType: "Evening" },
    ]);
  });
});
