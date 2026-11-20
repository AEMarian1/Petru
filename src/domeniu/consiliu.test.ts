import { describe, expect, it } from "vitest";
import {
  areCvorum, avertizareConvocare, catreCsv, conditiaL52, dataSedinteiValida, pasiiProiectului, poateFiVotat, poatePeOrdineaDeZi, pragul,
  semnaturiHotarareLipsa, stadiul, vedereaConsiliului, verificaVotul, type StareProiect,
} from "./consiliu";
import { pornesteCeasul, stareaAsteptarii } from "./ceas";
import { termenul } from "./termene";

const gata: StareProiect = {
  normativ: false, referatLa: "2026-11-02", raportLa: "2026-11-04", l52Termen: null, exceptieUrgenta: null,
  comisiiSesizate: 2, avizeDate: 2, sedintaId: "s", rezultat: null,
};

describe("regulile noi de termen", () => {
  it("comunicarea la prefect: 10 zile lucrătoare de la adoptare, de confirmat", () => {
    const t = termenul("hcl-prefect")!;
    expect(t.felZile).toBe("lucrătoare");
    expect(t.deConfirmat).toBe(true);
    // vineri 20.11.2026 + 10 zile lucrătoare, peste 30.11 și 1.12 (sărbători) = 08.12.2026
    expect(pornesteCeasul("hcl-prefect", "2026-11-20").termen).toBe("2026-12-08");
  });
  it("procesul-verbal: 3 zile lucrătoare de la aprobare, de confirmat", () => {
    expect(termenul("pv-publicare")!.deConfirmat).toBe(true);
    expect(pornesteCeasul("pv-publicare", "2026-11-20").termen).toBe("2026-11-25");
  });
  it("Legea 52: 30 de zile lucrătoare de așteptare; actul se poate face numai după ultima zi", () => {
    const c = pornesteCeasul("l52-anunt", "2026-10-01");
    expect(termenul("l52-anunt")!.sens).toBe("asteptare");
    expect(stareaAsteptarii(c, c.termen)).toBe("in_asteptare");
    expect(stareaAsteptarii(c, "2026-12-31")).toBe("indeplinit");
  });
});

describe("Legea 52 și ordinea de zi", () => {
  it("proiectul normativ neanunțat nu intră pe ordinea de zi; cel individual, da", () => {
    expect(poatePeOrdineaDeZi({ ...gata, sedintaId: null }, "2026-11-26").da).toBe(true);
    const v = poatePeOrdineaDeZi({ ...gata, sedintaId: null, normativ: true }, "2026-11-26");
    expect(v.da).toBe(false);
  });
  it("ședința trebuie să fie după termenul Legii 52; excepția de urgență trece, cu motiv", () => {
    const p = { ...gata, normativ: true, l52Termen: "2026-11-26" };
    expect(conditiaL52(p, "2026-11-26").da).toBe(false);
    expect(conditiaL52(p, "2026-11-27").da).toBe(true);
    expect(conditiaL52({ ...p, exceptieUrgenta: "calamitate (probă)" }, "2026-11-20").da).toBe(true);
  });
  it("fără referat sau raport, proiectul nu intră pe ordinea de zi", () => {
    expect(poatePeOrdineaDeZi({ ...gata, sedintaId: null, raportLa: null }, "2026-11-26")).toEqual({ da: false, motiv: "Lipsește raportul compartimentului de specialitate." });
  });
});

describe("votul", () => {
  it("cere toate avizele comisiilor sesizate; retragerea nu", () => {
    expect(poateFiVotat({ ...gata, avizeDate: 1 }, "2026-11-26", "aprobat").da).toBe(false);
    expect(poateFiVotat({ ...gata, comisiiSesizate: 0, avizeDate: 0 }, "2026-11-26", "aprobat").da).toBe(false);
    expect(poateFiVotat({ ...gata, avizeDate: 1 }, "2026-11-26", "retras").da).toBe(true);
    expect(poateFiVotat({ ...gata, sedintaId: null }, "2026-11-26", "retras").da).toBe(false);
  });
  it("cvorumul: mai mult de jumătate din consilierii în funcție", () => {
    expect(areCvorum(8, 15)).toBe(true);
    expect(areCvorum(7, 15)).toBe(false);
  });
  it("pragurile: simplă din prezenți, absolută și două treimi din cei în funcție", () => {
    expect(pragul("simpla", 12, 15)).toBe(7);
    expect(pragul("simpla", 13, 15)).toBe(7);
    expect(pragul("absoluta", 12, 15)).toBe(8);
    expect(pragul("doua_treimi", 12, 15)).toBe(10);
  });
  it("rezultatul trebuie să se potrivească cu pragul", () => {
    const baza = { majoritate: "absoluta" as const, prezenti: 12, inFunctie: 15 };
    expect(verificaVotul({ ...baza, rezultat: "aprobat", vot: { pentru: 7, contra: 3, abtineri: 2 } }).da).toBe(false);
    expect(verificaVotul({ ...baza, rezultat: "respins", vot: { pentru: 7, contra: 3, abtineri: 2 } }).da).toBe(true);
    expect(verificaVotul({ ...baza, rezultat: "aprobat", vot: { pentru: 8, contra: 3, abtineri: 1 } }).da).toBe(true);
    expect(verificaVotul({ ...baza, rezultat: "aprobat", vot: { pentru: 9, contra: 3, abtineri: 1 } }).da).toBe(false);
    expect(verificaVotul({ ...baza, prezenti: 7, rezultat: "aprobat", vot: { pentru: 7, contra: 0, abtineri: 0 } }).da).toBe(false);
    expect(verificaVotul({ ...baza, rezultat: "retras", vot: null }).da).toBe(true);
  });
});

describe("ședința", () => {
  it("convocarea: avertizare sub 5 zile la ordinară, nimic la cea de îndată", () => {
    expect(avertizareConvocare("ordinara", "2026-11-23", "2026-11-26")).toMatch(/cel puțin 5 zile/);
    expect(avertizareConvocare("ordinara", "2026-11-20", "2026-11-26")).toBeNull();
    expect(avertizareConvocare("de_indata", "2026-11-26", "2026-11-26")).toBeNull();
    expect(avertizareConvocare("extraordinara", "2026-11-27", "2026-11-26")).toMatch(/după ședință/);
  });
  it("datele imposibile din platforma publică (0001, 9999) sunt refuzate", () => {
    expect(dataSedinteiValida("0001-01-01")).toBe(false);
    expect(dataSedinteiValida("9999-12-31")).toBe(false);
    expect(dataSedinteiValida("2026-11-26")).toBe(true);
  });
});

describe("hotărârea, stadiul și registrele", () => {
  it("se emite cu semnătura președintelui și contrasemnătura secretarului general", () => {
    expect(semnaturiHotarareLipsa({ semnatLa: "2026-11-27", contrasemnatLa: null })).toEqual(["contrasemnătura secretarului general"]);
    expect(semnaturiHotarareLipsa({ semnatLa: "2026-11-27", contrasemnatLa: "2026-11-27" })).toEqual([]);
  });
  it("pașii: anunțul apare numai la normative; prefectul și publicarea, numai după aprobare", () => {
    const fara = { emisa: false, comunicatPrefect: false, publicat: false };
    expect(pasiiProiectului({ ...gata, ...fara }).map((p) => p.cheie)).not.toContain("l52");
    expect(pasiiProiectului({ ...gata, normativ: true, ...fara }).map((p) => p.cheie)).toContain("l52");
    expect(pasiiProiectului({ ...gata, rezultat: "aprobat", ...fara }).map((p) => p.cheie)).toContain("prefect");
    expect(pasiiProiectului({ ...gata, rezultat: "respins", ...fara }).map((p) => p.cheie)).not.toContain("prefect");
  });
  it("stadiul pe scurt", () => {
    const fara = { emisa: false, comunicatPrefect: false, publicat: false };
    expect(stadiul({ ...gata, sedintaId: null, raportLa: null, ...fara })).toBe("Inițiat");
    expect(stadiul({ ...gata, rezultat: "aprobat", ...fara, emisa: true, comunicatPrefect: true })).toBe("Hotărâre comunicată la prefect");
    expect(stadiul({ ...gata, rezultat: "retras", ...fara })).toBe("Retras de pe ordinea de zi");
  });
  it("CSV-ul pentru MOL: BOM, „;” și ghilimele unde trebuie", () => {
    expect(catreCsv([["Nr.", "Titlul"], ["1/2026", 'Privind „x”; și "y"']])).toBe('﻿Nr.;Titlul\r\n1/2026;"Privind „x”; și ""y"""\r\n');
  });
  it("vederea: consiliul și conducerea văd tot; compartimentul, numai proiectele lui", () => {
    expect(vedereaConsiliului([{ permisiuni: ["consiliu.vede"], compartimentId: null }])).toEqual({ fel: "tot" });
    expect(vedereaConsiliului([{ permisiuni: ["documente.vede_compartiment"], compartimentId: "c1" }])).toEqual({ fel: "compartimente", ids: ["c1"] });
    expect(vedereaConsiliului([{ permisiuni: ["documente.inregistreaza"], compartimentId: null }])).toEqual({ fel: "nimic" });
  });
});
