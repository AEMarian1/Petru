import { describe, expect, it } from "vitest";
import { adaugaZile } from "./termene";

describe("termenele", () => {
  it("adună zile calendaristice", () => {
    expect(adaugaZile("2026-11-19", 10, "calendaristice")).toBe("2026-11-29");
  });
  it("sare peste sfârșitul de săptămână la zile lucrătoare", () => {
    // 20.11.2026 e vineri; +2 zile lucrătoare = marți 24.11.2026
    expect(adaugaZile("2026-11-20", 2, "lucrătoare")).toBe("2026-11-24");
  });
});
