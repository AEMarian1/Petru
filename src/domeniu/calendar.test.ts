import { describe, expect, it } from "vitest";
import { esteZiLucratoare, pasteOrtodox, plusZileLucratoare, primaZiLucratoare, sarbatoriLegale } from "./calendar";
import { adaugaZile } from "./termene";

describe("calendarul", () => {
  it("calculează Paștele ortodox", () => {
    expect(pasteOrtodox(2024)).toBe("2024-05-05");
    expect(pasteOrtodox(2025)).toBe("2025-04-20");
    expect(pasteOrtodox(2026)).toBe("2026-04-12");
    expect(pasteOrtodox(2027)).toBe("2027-05-02");
  });

  it("are sărbătorile legale ale anului, cu Vinerea Mare și Rusaliile", () => {
    const s = sarbatoriLegale(2026).map((x) => x.data);
    expect(s).toContain("2026-04-10"); // Vinerea Mare
    expect(s).toContain("2026-04-13"); // a doua zi de Paște
    expect(s).toContain("2026-05-31"); // Rusaliile
    expect(s).toContain("2026-06-01"); // a doua zi de Rusalii și Ziua Copilului, o singură zi
    expect(s).toContain("2026-11-30");
    expect(s).toHaveLength(17 - 1);
  });

  it("sâmbăta, duminica și sărbătorile nu sunt zile lucrătoare", () => {
    expect(esteZiLucratoare("2026-11-20")).toBe(true); // vineri
    expect(esteZiLucratoare("2026-11-21")).toBe(false); // sâmbătă
    expect(esteZiLucratoare("2026-11-30")).toBe(false); // Sfântul Andrei, luni
    expect(esteZiLucratoare("2026-12-01")).toBe(false); // Ziua Națională, marți
  });

  it("zilele lucrătoare sar peste sărbători", () => {
    // Vineri 27.11.2026 + 2 zile lucrătoare: luni 30.11 și marți 1.12 sunt sărbători → joi 3.12.
    expect(plusZileLucratoare("2026-11-27", 2)).toBe("2026-12-03");
    expect(adaugaZile("2026-11-27", 2, "lucrătoare")).toBe("2026-12-03");
    expect(primaZiLucratoare("2026-12-25")).toBe("2026-12-28");
  });
});
