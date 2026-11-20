import { describe, expect, it } from "vitest";
import { inTermen, jaloanele, opreste, poatePrelungi, poatePropunePrelungirea, pornesteCeasul, prelungeste, stareaCeasului, ziNelucratoare } from "./ceas";

describe("ceasul termenelor", () => {
  it("pornește cu termenul legii", () => {
    expect(pornesteCeasul("petitie", "2026-11-02").termen).toBe("2026-12-02");
    expect(pornesteCeasul("544", "2026-11-02").termen).toBe("2026-11-12");
    expect(() => pornesteCeasul("nu-exista", "2026-11-02")).toThrow();
  });

  it("petiția se prelungește o dată cu 15 zile, numai înainte de termen", () => {
    const c = pornesteCeasul("petitie", "2026-11-02");
    const p = prelungeste(c, "2026-11-20");
    expect(p.termen).toBe("2026-12-17");
    expect(p.termenInitial).toBe("2026-12-02");
    expect(poatePrelungi(p, "2026-11-21")).toEqual({ da: false, motiv: "Termenul a fost deja prelungit o dată." });
    expect(poatePrelungi(c, "2026-12-03").da).toBe(false);
    expect(poatePrelungi(c, "2026-12-02").da).toBe(true);
  });

  it("cererea 544 merge la 30 de zile numai cu înștiințarea în primele 10", () => {
    const c = pornesteCeasul("544", "2026-11-02");
    expect(prelungeste(c, "2026-11-12").termen).toBe("2026-12-02");
    expect(poatePrelungi(c, "2026-11-13").da).toBe(false);
  });

  it("nu prelungește termenele pe care legea nu le prelungește", () => {
    expect(poatePrelungi(pornesteCeasul("certificat-fiscal", "2026-11-02"), "2026-11-02").da).toBe(false);
  });

  it("starea: depășit, aproape, în termen, oprit", () => {
    const c = pornesteCeasul("544", "2026-11-02"); // termen 12.11
    expect(stareaCeasului(c, "2026-11-13")).toBe("depasit");
    expect(stareaCeasului(c, "2026-11-09")).toBe("aproape");
    expect(stareaCeasului(c, "2026-11-05")).toBe("in_termen");
    expect(stareaCeasului(opreste(c, "2026-11-10"), "2026-11-20")).toBe("oprit");
  });

  it("spune dacă s-a rezolvat în termen", () => {
    const c = pornesteCeasul("544", "2026-11-02");
    expect(inTermen(c)).toBeNull();
    expect(inTermen(opreste(c, "2026-11-12"))).toBe(true);
    expect(inTermen(opreste(c, "2026-11-13"))).toBe(false);
    expect(() => opreste(c, "2026-11-01")).toThrow();
  });

  it("arată termenele intermediare cât timp ceasul merge", () => {
    const c = pornesteCeasul("544", "2026-11-02");
    expect(jaloanele(c, "2026-11-03").map((j) => [j.cheie, j.pana])).toEqual([
      ["refuz", "2026-11-07"], ["redirectionare", "2026-11-07"], ["instiintare_prelungire", "2026-11-12"],
    ]);
    expect(jaloanele(prelungeste(c, "2026-11-05"), "2026-11-05").map((j) => j.cheie)).not.toContain("instiintare_prelungire");
    expect(jaloanele(opreste(c, "2026-11-05"), "2026-11-05")).toEqual([]);
  });

  it("semnalează termenul căzut într-o zi nelucrătoare, fără să-l mute", () => {
    expect(ziNelucratoare("2026-11-30")).toBe("Sfântul Andrei");
    expect(ziNelucratoare("2026-11-22")).toBe("duminică");
    expect(ziNelucratoare("2026-11-20")).toBeNull();
  });

  it("compartimentul propune o singură dată, cât timp prelungirea e posibilă", () => {
    const c = pornesteCeasul("petitie", "2026-11-02");
    expect(poatePropunePrelungirea(c, null, "2026-11-20").da).toBe(true);
    expect(poatePropunePrelungirea(c, "2026-11-19", "2026-11-20").da).toBe(false);
    expect(poatePropunePrelungirea(c, null, "2026-12-03").da).toBe(false);
  });
});
