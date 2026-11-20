import { describe, expect, it } from "vitest";
import { citesteCsv, citesteData, citesteExportul, citesteNumar, gasesteCompartimentul, potrivesteColoanele } from "./import-registru";

// Toate rândurile sunt inventate: nume „(probă)”, conținut generic.
const EXPORT = [
  "﻿Nr. înregistrare;Data;Emitent;Conținut;Compartiment;Sens;La nr.",
  "101;03.11.2026;Exemplu Ana (probă);Cerere certificat de urbanism;Urbanism;intrare;",
  '102;04.11.2026;"Probescu Ion (probă)";"Petiție privind iluminatul; strada Exemplu";;intrare;',
  "103;05.11.2026;;Răspuns la cererea 101;Urbanism;ieșire;101",
].join("\r\n");

describe("citirea CSV", () => {
  it("recunoaște separatorul, ghilimelele și BOM-ul", () => {
    const r = citesteCsv(EXPORT);
    expect(r).toHaveLength(4);
    expect(r[0]![0]).toBe("Nr. înregistrare");
    expect(r[2]![3]).toBe("Petiție privind iluminatul; strada Exemplu");
  });

  it("merge și cu virgulă și ghilimele dublate", () => {
    expect(citesteCsv('a,b\n1,"x ""y"", z"\n')).toEqual([["a", "b"], ["1", 'x "y", z']]);
  });
});

describe("potrivirea coloanelor", () => {
  it("găsește coloanele după sinonime, fără diacritice", () => {
    const p = potrivesteColoanele(["Nr. înregistrare", "Data înregistrării", "Petent", "Obiect", "Altceva"]);
    expect(p.campuri).toMatchObject({ numar: 0, data: 1, emitent: 2, continut: 3 });
    expect(p.ignorate).toEqual(["Altceva"]);
    expect(p.lipsa).toEqual([]);
  });

  it("spune ce coloane obligatorii lipsesc", () => {
    expect(potrivesteColoanele(["Nr", "Data"]).lipsa).toEqual(["emitent", "continut"]);
  });
});

describe("valorile", () => {
  it("citește datele în formatele obișnuite", () => {
    expect(citesteData("03.11.2026")).toBe("2026-11-03");
    expect(citesteData("3/11/2026 10:15")).toBe("2026-11-03");
    expect(citesteData("2026-11-03")).toBe("2026-11-03");
    expect(citesteData("31.02.2026")).toBeNull();
    expect(citesteData("mâine")).toBeNull();
  });

  it("citește numărul cu sau fără an", () => {
    expect(citesteNumar("1234")).toBe(1234);
    expect(citesteNumar("1234/2026")).toBe(1234);
    expect(citesteNumar("Nr. 77")).toBe(77);
    expect(citesteNumar("abc")).toBeNull();
  });
});

describe("exportul întreg", () => {
  it("citește intrările și ieșirile legate", () => {
    const r = citesteExportul(EXPORT);
    expect(r.erori).toEqual([]);
    expect(r.randuri).toHaveLength(3);
    expect(r.randuri[0]).toMatchObject({ numar: 101, an: 2026, data: "2026-11-03", compartiment: "Urbanism", directie: "intrare" });
    expect(r.randuri[2]).toMatchObject({ numar: 103, directie: "iesire", laNumar: 101 });
  });

  it("dă erori pe rânduri, fără să oprească restul", () => {
    const r = citesteExportul("Nr;Data;Emitent;Continut\n1;01.11.2026;A (probă);x\nx;azi;;\n1;02.11.2026;B (probă);y\n");
    expect(r.randuri).toHaveLength(1);
    expect(r.erori.map((e) => e.rand)).toEqual([3, 4]);
    expect(r.erori[1]!.mesaj).toMatch(/de două ori/);
  });

  it("nu citește rândurile când lipsesc coloane obligatorii", () => {
    const r = citesteExportul("Nr;Data\n1;01.11.2026\n");
    expect(r.potrivire.lipsa.length).toBeGreaterThan(0);
    expect(r.randuri).toEqual([]);
  });
});

describe("compartimentul din export", () => {
  const comp = [
    { id: "1", cheie: "urbanism", nume: "Urbanism și amenajarea teritoriului" },
    { id: "2", cheie: "taxe", nume: "Taxe și impozite" },
  ];
  it("se găsește după cheie, după nume sau după o parte din nume", () => {
    expect(gasesteCompartimentul("urbanism", comp)?.id).toBe("1");
    expect(gasesteCompartimentul("TAXE SI IMPOZITE", comp)?.id).toBe("2");
    expect(gasesteCompartimentul("Altceva", comp)).toBeNull();
  });
});
