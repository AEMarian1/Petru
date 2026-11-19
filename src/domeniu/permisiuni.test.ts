import { describe, expect, it } from "vitest";
import { areDreptul, PERMISIUNI } from "./permisiuni";
import { ROLURI_PREDEFINITE } from "./roluri-predefinite";

describe("drepturile", () => {
  const functionarUrbanism = [{ permisiuni: ["documente.vede_compartiment", "documente.rezolva"], compartimentId: "urb" }];

  it("un funcționar vede numai documentele compartimentului său", () => {
    expect(areDreptul(functionarUrbanism, "documente.vede_compartiment", "urb")).toBe(true);
    expect(areDreptul(functionarUrbanism, "documente.vede_compartiment", "taxe")).toBe(false);
  });

  it("un drept lipsă e refuzat", () => {
    expect(areDreptul(functionarUrbanism, "administrare.utilizatori")).toBe(false);
  });

  it("un rol fără compartiment se aplică tuturor compartimentelor", () => {
    expect(areDreptul([{ permisiuni: ["documente.rezolva"], compartimentId: null }], "documente.rezolva", "taxe")).toBe(true);
  });

  it("rolurile predefinite folosesc numai drepturi din catalog", () => {
    for (const r of ROLURI_PREDEFINITE) for (const p of r.permisiuni) expect(p in PERMISIUNI).toBe(true);
  });

  it("registratura nu vede răspunsurile compartimentelor", () => {
    const reg = ROLURI_PREDEFINITE.find((r) => r.cheie === "registratura")!;
    expect(reg.permisiuni).not.toContain("documente.vede_tot");
    expect(reg.permisiuni).not.toContain("documente.vede_compartiment");
  });
});
