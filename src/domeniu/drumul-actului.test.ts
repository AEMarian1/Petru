import { describe, expect, it } from "vitest";
import { poatePublica, poateTrece } from "./drumul-actului";

describe("drumul actului", () => {
  it("merge înainte pe drumul obișnuit", () => {
    expect(poateTrece("inregistrat", "repartizat")).toBe(true);
    expect(poateTrece("la_semnat", "emis")).toBe(true);
    expect(poateTrece("emis", "arhivat")).toBe(true);
  });

  it("nu sare peste semnare", () => {
    expect(poateTrece("in_lucru", "emis")).toBe(false);
    expect(poateTrece("inregistrat", "publicat")).toBe(false);
  });

  it("nu iese din arhivă", () => {
    expect(poateTrece("arhivat", "in_lucru")).toBe(false);
  });
});

describe("poarta de publicare", () => {
  it("cere aprobarea și copia anonimizată", () => {
    expect(poatePublica({ stare: "emis", aprobatDe: null, copieAnonimizata: true }).da).toBe(false);
    expect(poatePublica({ stare: "emis", aprobatDe: "secretarul general", copieAnonimizata: false }).da).toBe(false);
    expect(poatePublica({ stare: "emis", aprobatDe: "secretarul general", copieAnonimizata: true }).da).toBe(true);
  });

  it("nu publică un act neemis", () => {
    expect(poatePublica({ stare: "in_lucru", aprobatDe: "secretarul general", copieAnonimizata: true }).da).toBe(false);
  });
});
