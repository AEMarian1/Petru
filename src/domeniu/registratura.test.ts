import { describe, expect, it } from "vitest";
import { aziInRomania, dataLimita, pasiiPosibili, recunoasteTermenul, stareaTermenului, vedereaRegistrului } from "./registratura";

describe("termenul după tipul documentului", () => {
  it("recunoaște tipurile cu termen legal", () => {
    expect(recunoasteTermenul(null, "Cerere de informații publice").termen.cheie).toBe("544");
    expect(recunoasteTermenul("Cerere", "eliberare certificat de urbanism").termen.cheie).toBe("certificat-urbanism");
    expect(recunoasteTermenul(null, "Sesizare privind un drum").termen.cheie).toBe("petitie");
  });

  it("pune termenul implicit de 30 de zile și spune că nu l-a recunoscut", () => {
    const r = recunoasteTermenul(null, "Adresă a unei instituții");
    expect(r.recunoscut).toBe(false);
    expect(r.termen.zile).toBe(30);
  });

  it("calculează data-limită", () => {
    expect(dataLimita("2026-11-02", recunoasteTermenul(null, "Legea 544").termen)).toBe("2026-11-12");
  });
});

describe("starea termenului", () => {
  const azi = "2026-11-20";
  it("depășit, aproape, în termen", () => {
    expect(stareaTermenului("2026-11-19", "in_lucru", azi)).toBe("depasit");
    expect(stareaTermenului("2026-11-20", "repartizat", azi)).toBe("aproape");
    expect(stareaTermenului("2026-11-23", "repartizat", azi)).toBe("aproape");
    expect(stareaTermenului("2026-11-24", "repartizat", azi)).toBe("in_termen");
  });

  it("un document rezolvat nu mai are termen de urmărit", () => {
    expect(stareaTermenului("2026-10-01", "emis", azi)).toBe("rezolvat");
    expect(stareaTermenului("2026-10-01", "arhivat", azi)).toBe("rezolvat");
  });

  it("ziua de azi se ia în fusul orar al României", () => {
    expect(aziInRomania(new Date("2026-11-19T22:30:00Z"))).toBe("2026-11-20");
  });
});

describe("pașii", () => {
  it("urmează drumul actului", () => {
    expect(pasiiPosibili("inregistrat")).toEqual(["repartizeaza"]);
    expect(pasiiPosibili("repartizat")).toEqual(["repartizeaza", "preia"]);
    expect(pasiiPosibili("in_lucru")).toEqual(["la_semnat", "claseaza"]);
    expect(pasiiPosibili("la_semnat")).toEqual(["inapoi_in_lucru", "iesire"]);
    expect(pasiiPosibili("arhivat")).toEqual([]);
  });
});

describe("ce vede fiecare din registru", () => {
  it("conducerea vede tot", () => {
    expect(vedereaRegistrului([{ permisiuni: ["documente.vede_tot"], compartimentId: null }])).toEqual({ fel: "tot" });
  });
  it("biroul vede numai compartimentele lui", () => {
    expect(vedereaRegistrului([{ permisiuni: ["documente.vede_compartiment"], compartimentId: "u" }])).toEqual({ fel: "compartimente", ids: ["u"] });
  });
  it("registratura vede numai fișa de înregistrare", () => {
    expect(vedereaRegistrului([{ permisiuni: ["documente.inregistreaza", "documente.repartizeaza"], compartimentId: null }])).toEqual({ fel: "fisa" });
  });
  it("fără drepturi pe documente, nimic", () => {
    expect(vedereaRegistrului([{ permisiuni: ["consiliu.vede"], compartimentId: null }])).toEqual({ fel: "nimic" });
  });
});
