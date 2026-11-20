import type { Tranzactie } from "@/baza/entitate";
import { registrulHotararilor, registrulProceselorVerbale, registrulProiectelor } from "@/baza/consiliu";
import { ETICHETE_INITIATOR, ETICHETE_SEDINTA, stadiulMol } from "@/domeniu/consiliu";
import { dataRo } from "@/componente/format";

/**
 * Registrele consiliului local, ca în anexa Codului administrativ pentru Monitorul Oficial Local.
 * Coloanele exacte ale anexei sunt de confirmat de jurist (J25); până atunci, acestea.
 */
export const REGISTRE = {
  proiecte: "Registrul proiectelor de hotărâri",
  hotarari: "Registrul hotărârilor",
  "procese-verbale": "Registrul proceselor-verbale ale ședințelor",
} as const;

export type FelRegistru = keyof typeof REGISTRE;

export function esteFelRegistru(x: string): x is FelRegistru {
  return x in REGISTRE;
}

const d = (x: string | null | undefined) => (x ? dataRo(x) : "");

/** Capul de tabel și rândurile registrului, ca text (pentru pagină și pentru CSV). */
export async function randurileRegistrului(tx: Tranzactie, fel: FelRegistru, an: number): Promise<{ cap: string[]; randuri: string[][]; legaturi: (string | null)[] }> {
  if (fel === "proiecte") {
    const r = await registrulProiectelor(tx, an);
    return {
      cap: ["Nr. proiect", "Data înregistrării", "Titlul", "Inițiatorul", "Caracterul", "Stadiul", "Ședința", "Nr. hotărârii"],
      randuri: r.map((p) => [
        `${p.numar}/${p.an}`, dataRo(p.dataInregistrare.toISOString()), p.titlu, ETICHETE_INITIATOR[p.initiator], p.normativ ? "normativ" : "individual",
        stadiulMol(p.rezultat), p.sedintaData ? `${ETICHETE_SEDINTA[p.sedintaTip!].toLowerCase()}, ${dataRo(p.sedintaData)}` : "", p.numarHcl ? `${p.numarHcl}/${p.anHcl}` : "",
      ]),
      legaturi: r.map((p) => `/consiliu/proiecte/${p.id}`),
    };
  }
  if (fel === "hotarari") {
    const r = await registrulHotararilor(tx, an);
    return {
      cap: ["Nr. hotărârii", "Data adoptării", "Titlul", "Nr. proiect", "Votul (pentru / contra / abțineri)", "Comunicată la prefect", "Publicată în MOL"],
      randuri: r.map((p) => [
        `${p.numarHcl}/${p.anHcl}`, d(p.rezultatLa), p.titlu, `${p.numar}/${p.an}`, p.votPentru !== null ? `${p.votPentru} / ${p.votContra} / ${p.votAbtineri}` : "",
        p.prefectNumar ? `nr. ${p.prefectNumar} din ${d(p.prefectLa)}` : "", d(p.publicatLa),
      ]),
      legaturi: r.map((p) => `/consiliu/proiecte/${p.id}`),
    };
  }
  const r = await registrulProceselorVerbale(tx, an);
  return {
    cap: ["Ședința", "Tipul", "Proiecte", "Hotărâri adoptate", "Redactat", "Aprobat", "Afișat și publicat"],
    randuri: r.map((s) => [dataRo(s.data), ETICHETE_SEDINTA[s.tip], String(s.proiecte), String(s.adoptate), d(s.pvRedactatLa), d(s.pvAprobatLa), d(s.pvPublicatLa)]),
    legaturi: r.map((s) => `/consiliu/sedinte/${s.id}`),
  };
}
