import { describe, expect, it } from "vitest";
import { cereAnuntPublic, poateAveaRezultat } from "./proiect-hotarare";

describe("proiectul de hotărâre", () => {
  it("cere anunț public numai pentru proiectele normative din ședințe obișnuite", () => {
    expect(cereAnuntPublic(true, "ordinara")).toBe(true);
    expect(cereAnuntPublic(true, "de_indata")).toBe(false);
    expect(cereAnuntPublic(false, "ordinara")).toBe(false);
  });
  it("aprobat sau respins numai după vot; retras de pe ordinea de zi", () => {
    expect(poateAveaRezultat("avizat", "aprobat")).toBe(false);
    expect(poateAveaRezultat("votat", "respins")).toBe(true);
    expect(poateAveaRezultat("pe_ordinea_de_zi", "retras")).toBe(true);
  });
});
