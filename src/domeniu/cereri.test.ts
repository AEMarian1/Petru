import { describe, expect, it } from "vitest";
import { anul, felulDupaTermen, poateAveaReclamatie, raportul544, raportulPetitiilor, redirectionareInTermen, refuzInTermen, semestrul, type RandRaport } from "./cereri";

const rand = (x: Partial<RandRaport>): RandRaport => ({
  fel: "petitie", data: "2026-03-02", canal: "ghiseu", solicitant: "fizica", compartiment: "Urbanism",
  termenInitial: "2026-04-01", termen: "2026-04-01", prelungitLa: null, opritLa: null, solutie: null,
  reclamatieLa: null, reclamatieSolutie: null, plangereInstanta: false, ...x,
});

describe("felul cererii", () => {
  it("se ia din regula recunoscută, fără ghicit", () => {
    expect(felulDupaTermen("petitie", true)).toBe("petitie");
    expect(felulDupaTermen("544", true)).toBe("informatii_publice");
    expect(felulDupaTermen("petitie", false)).toBeNull();
    expect(felulDupaTermen("certificat-urbanism", true)).toBeNull();
  });
});

describe("termenele scurte", () => {
  it("refuzul și redirecționarea în 5 zile", () => {
    expect(refuzInTermen("2026-11-02", "2026-11-07")).toBe(true);
    expect(refuzInTermen("2026-11-02", "2026-11-08")).toBe(false);
    expect(redirectionareInTermen("2026-11-02", "2026-11-07")).toBe(true);
    expect(redirectionareInTermen("2026-11-02", "2026-11-09")).toBe(false);
  });

  it("reclamația administrativă numai la Legea 544, după refuz, răspuns parțial sau tăcere", () => {
    expect(poateAveaReclamatie("informatii_publice", "respinsa_exceptata")).toBe(true);
    expect(poateAveaReclamatie("informatii_publice", null)).toBe(true);
    expect(poateAveaReclamatie("informatii_publice", "comunicata")).toBe(false);
    expect(poateAveaReclamatie("petitie", null)).toBe(false);
  });
});

describe("rapoartele", () => {
  it("semestrele și anul", () => {
    expect(semestrul(2026, 1)).toMatchObject({ de: "2026-01-01", pana: "2026-06-30" });
    expect(semestrul(2026, 2)).toMatchObject({ de: "2026-07-01", pana: "2026-12-31" });
    expect(anul(2026)).toMatchObject({ de: "2026-01-01", pana: "2026-12-31" });
  });

  it("raportul petițiilor numără numai perioada și felul ei", () => {
    const r = raportulPetitiilor([
      rand({ opritLa: "2026-03-20", solutie: "favorabila" }),
      rand({ opritLa: "2026-04-10", solutie: "nefavorabila", canal: "email", prelungitLa: "2026-03-20", termen: "2026-04-16" }),
      rand({ opritLa: "2026-04-05", solutie: "nefavorabila" }),
      rand({ solutie: "redirectionata", opritLa: "2026-03-04", canal: null, compartiment: null }),
      rand({}),
      rand({ data: "2026-07-01" }),
      rand({ fel: "informatii_publice" }),
    ], semestrul(2026, 1), "2026-06-30");
    expect(r.primite).toBe(5);
    expect(r.peCanal).toEqual({ hartie: 3, electronic: 1, nespecificat: 1 });
    expect(r.solutii).toMatchObject({ favorabile: 1, nefavorabile: 2, redirectionate: 1 });
    expect(r.rezolvateInTermen).toBe(3);
    expect(r.rezolvateDupaTermen).toBe(1);
    expect(r.prelungite).toBe(1);
    expect(r.inLucru).toBe(1);
    expect(r.inLucruCuTermenDepasit).toBe(1);
    expect(r.peCompartimente).toEqual([{ cheie: "Urbanism", numar: 4 }, { cheie: "nerepartizate", numar: 1 }]);
  });

  it("raportul 544 desparte răspunsurile în 10 zile, în 30 de zile și după termen", () => {
    const b = { fel: "informatii_publice" as const, data: "2026-02-02", termenInitial: "2026-02-12", termen: "2026-02-12" };
    const r = raportul544([
      rand({ ...b, opritLa: "2026-02-10", solutie: "comunicata", solicitant: "juridica" }),
      rand({ ...b, opritLa: "2026-02-25", solutie: "comunicata_partial", termen: "2026-03-04", prelungitLa: "2026-02-05" }),
      rand({ ...b, opritLa: "2026-02-09", solutie: "respinsa_exceptata", reclamatieLa: "2026-02-15", reclamatieSolutie: "respinsa", plangereInstanta: true }),
      rand({ ...b, opritLa: "2026-02-20", solutie: "comunicata" }),
      rand({ ...b, reclamatieLa: "2026-02-20" }),
    ], anul(2026), "2026-11-20");
    expect(r.total).toBe(5);
    expect(r.peSolicitant).toEqual({ fizice: 4, juridice: 1, nespecificat: 0 });
    expect(r.termene).toEqual({ in10Zile: 2, in30Zile: 1, dupaTermen: 1, refuzuriDupa5Zile: 1, prelungite: 1 });
    expect(r.solutii).toMatchObject({ comunicate: 2, partial: 1, exceptate: 1 });
    expect(r.reclamatii).toEqual({ total: 2, admise: 0, respinse: 1, inLucru: 1 });
    expect(r.plangeriInstanta).toBe(1);
    expect(r.inLucruCuTermenDepasit).toBe(1);
  });
});
