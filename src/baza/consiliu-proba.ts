/**
 * Consiliul local de probă: comisiile, patru ședințe (trei ținute, una convocată) și proiecte în toate
 * stadiile. DATE INVENTATE, marcate „(probă)”; nicio localitate și niciun nume de persoană.
 *
 * Datele se încarcă prin aceleași funcții ca în aplicație (`src/baza/consiliu.ts`), deci trec prin
 * aceleași verificări: Legea 52, avizele, cvorumul, pragul majorității, semnăturile, poarta de publicare.
 * Datele sunt socotite față de ziua de azi, ca termenele să arate și depășiri, și termene în curs.
 */
import { caSistem } from "./entitate";
import type { bazaDeDate } from "./conexiune";
import { eq } from "drizzle-orm";
import { avizeComisii, comisii } from "./schema";
import {
  adaugaPropunerea, anuntaProiectul, aprobaPublicarea, comunicaPrefectului, confirmaPrimireaLaPrefect, convoaca, creeazaSedinta, initiazaProiectul,
  marcheazaCopiaAnonimizata, marcheazaPublicarea, puneOrdineaDeZi, scrieAvizul, scrieMaterialul, scriePrezenta, scriePv, semneazaHotararea,
  sesizeazaComisiile, voteaza,
} from "./consiliu";
import { aziInRomania } from "@/domeniu/registratura";
import { adaugaZile } from "@/domeniu/termene";
import type { Majoritate, Rezultat, TipSedinta } from "@/domeniu/consiliu";

/** Cinci comisii de specialitate (răspunsul autorului); domeniile sunt generice, de probă. */
export const COMISII_PROBA = [
  { nume: "Comisia 1 — buget, finanțe, dezvoltare economică (probă)", domeniu: "bugetul local, taxele și impozitele, investițiile" },
  { nume: "Comisia 2 — urbanism, amenajarea teritoriului, patrimoniu (probă)", domeniu: "urbanismul, domeniul public și privat" },
  { nume: "Comisia 3 — agricultură, mediu, servicii publice (probă)", domeniu: "agricultura, salubrizarea, utilitățile" },
  { nume: "Comisia 4 — învățământ, sănătate, cultură, asistență socială (probă)", domeniu: "școlile, sănătatea, cultura, asistența socială" },
  { nume: "Comisia 5 — juridică, disciplină, ordine publică (probă)", domeniu: "legalitatea, regulamentele, ordinea publică" },
];

const CONSILIERI_IN_FUNCTIE = 15;

type Db = ReturnType<typeof bazaDeDate>;

export async function incarcaConsiliulDeProba(db: Db, a: { entitateId: string; compId: Map<string, string>; secretarId: string; secretariatId: string; primarId: string }) {
  const azi = aziInRomania();
  const zi = (d: number) => adaugaZile(azi, d, "calendaristice");
  const { entitateId } = a;
  await caSistem(db, async (tx) => {
    const com = await tx
      .insert(comisii)
      .values(COMISII_PROBA.map((c, i) => ({ entitateId, numar: i + 1, nume: c.nume, domeniu: c.domeniu })))
      .returning({ id: comisii.id });
    const comisia = (n: number) => com[n - 1]!.id;

    const sedinta = (data: string, tip: TipSedinta) => creeazaSedinta(tx, { entitateId, data, tip, consilieriInFunctie: CONSILIERI_IN_FUNCTIE, utilizatorId: a.secretarId });
    const s1 = await sedinta(zi(-50), "ordinara");
    const s2 = await sedinta(zi(-25), "de_indata");
    const s3 = await sedinta(zi(-6), "ordinara");
    const s4 = await sedinta(zi(6), "ordinara");

    let nrInregistrare = 5001;
    let nrIesire = 6001;
    /** Un proiect: inițiat la `initiat` zile față de azi, cu raportul, avizele și anunțul cerute. */
    async function proiect(o: {
      titlu: string; comp: string; normativ: boolean; majoritate?: Majoritate; initiat: number; raport?: boolean; anunt?: number;
      comisii: number[]; avize?: number; legalitate?: boolean;
    }) {
      const data = zi(o.initiat);
      const p = await initiazaProiectul(tx, {
        entitateId, utilizatorId: a.secretariatId, numarInregistrare: nrInregistrare++, data, titlu: o.titlu, initiator: "primar",
        compartimentId: a.compId.get(o.comp)!, normativ: o.normativ, majoritate: o.majoritate ?? "simpla", referatLa: data,
      });
      if (o.anunt !== undefined) await anuntaProiectul(tx, { entitateId, proiectId: p.id, la: zi(o.anunt), unde: "pagina de internet și Monitorul Oficial Local (probă)", utilizatorId: a.secretariatId });
      if (o.raport !== false) {
        await scrieMaterialul(tx, { proiectId: p.id, fel: "raport", la: zi(Math.min(o.initiat + 3, 0)), utilizatorId: a.secretariatId });
        if (o.legalitate !== false) await scrieMaterialul(tx, { proiectId: p.id, fel: "aviz_legalitate", la: zi(Math.min(o.initiat + 4, 0)), utilizatorId: a.secretarId });
        const sesizata = zi(Math.min(o.initiat + 4, 0));
        await sesizeazaComisiile(tx, { entitateId, proiectId: p.id, comisieIds: o.comisii.map(comisia), la: sesizata, utilizatorId: a.secretariatId });
        const deDat = o.avize ?? o.comisii.length;
        const randuri = await tx.select({ id: avizeComisii.id }).from(avizeComisii).where(eq(avizeComisii.proiectId, p.id));
        for (const [i, r] of randuri.slice(0, deDat).entries()) {
          const sens = i === 1 && o.comisii.length > 2 ? "favorabil_cu_amendamente" : "favorabil";
          await scrieAvizul(tx, { avizId: r.id, sens, data: zi(Math.min(o.initiat + 6, 0)), amendamente: sens === "favorabil" ? null : "o corectură de formulare la art. 2 (probă)", utilizatorId: a.secretariatId });
        }
      }
      return p.id;
    }

    const vot = (proiectId: string, rezultat: Rezultat, v: [number, number, number] | null, majoritate: Majoritate = "simpla") =>
      voteaza(tx, { entitateId, proiectId, rezultat, vot: v ? { pentru: v[0], contra: v[1], abtineri: v[2] } : null, majoritate, utilizatorId: a.secretariatId });
    const semneaza = async (proiectId: string, la: string, siSecretarul = true) => {
      await semneazaHotararea(tx, { proiectId, fel: "presedinte", la, utilizatorId: a.secretariatId });
      if (siSecretarul) await semneazaHotararea(tx, { proiectId, fel: "secretar", la, utilizatorId: a.secretarId });
    };
    const prefect = (proiectId: string, la: string) => comunicaPrefectului(tx, { entitateId, proiectId, numar: nrIesire++, data: la, mod: "curier", utilizatorId: a.secretarId });

    // Ședința 1, ordinară: o rectificare aprobată (comunicată, publicată), un regulament respins, un proiect retras.
    const p1 = await proiect({ titlu: "Proiect de hotărâre privind rectificarea bugetului local (probă)", comp: "contabilitate", normativ: false, majoritate: "absoluta", initiat: -62, comisii: [1] });
    const p2 = await proiect({ titlu: "Proiect de hotărâre privind aprobarea unui regulament local de gospodărire (probă)", comp: "mediu", normativ: true, initiat: -112, anunt: -110, comisii: [3, 5] });
    const p3 = await proiect({ titlu: "Proiect de hotărâre privind atribuirea unei denumiri de stradă (probă)", comp: "urbanism", normativ: false, initiat: -60, comisii: [2] });
    for (const p of [p1, p2, p3]) await puneOrdineaDeZi(tx, { proiectId: p, sedintaId: s1, utilizatorId: a.secretarId });
    await convoaca(tx, { sedintaId: s1, la: zi(-57), convocare: "Dispoziția de convocare nr. 101 (probă)", materialeLa: zi(-57), utilizatorId: a.secretarId });
    await scriePrezenta(tx, { sedintaId: s1, prezenti: 14, presedinte: "consilierul local ales președinte de ședință (probă)", utilizatorId: a.secretariatId });
    await vot(p1, "aprobat", [13, 0, 1], "absoluta");
    await vot(p2, "respins", [6, 7, 1]);
    await vot(p3, "retras", null);
    await semneaza(p1, zi(-49));
    await prefect(p1, zi(-46));
    await confirmaPrimireaLaPrefect(tx, { proiectId: p1, la: zi(-45), utilizatorId: a.secretarId });
    await aprobaPublicarea(tx, { proiectId: p1, azi: zi(-45), utilizatorId: a.primarId });
    await marcheazaCopiaAnonimizata(tx, { proiectId: p1, azi: zi(-45), utilizatorId: a.secretarId });
    await marcheazaPublicarea(tx, { proiectId: p1, la: zi(-44), unde: "Monitorul Oficial Local (probă)", utilizatorId: a.secretarId });

    // Ședința 2, de îndată: o cofinanțare comunicată; o hotărâre necomunicată, cu termenul la prefect depășit.
    const p4 = await proiect({ titlu: "Proiect de hotărâre privind aprobarea cofinanțării unui proiect de investiții (probă)", comp: "proiecte", normativ: false, majoritate: "absoluta", initiat: -26, comisii: [1] });
    const p5 = await proiect({ titlu: "Proiect de hotărâre privind aprobarea unui acord de parteneriat (probă)", comp: "proiecte", normativ: false, initiat: -26, comisii: [1, 5] });
    for (const p of [p4, p5]) await puneOrdineaDeZi(tx, { proiectId: p, sedintaId: s2, utilizatorId: a.secretarId });
    await convoaca(tx, { sedintaId: s2, la: zi(-25), convocare: "Dispoziția de convocare nr. 118 (probă)", materialeLa: zi(-25), utilizatorId: a.secretarId });
    await scriePrezenta(tx, { sedintaId: s2, prezenti: 15, presedinte: "consilierul local ales președinte de ședință (probă)", utilizatorId: a.secretariatId });
    await vot(p4, "aprobat", [15, 0, 0], "absoluta");
    await vot(p5, "aprobat", [12, 2, 1]);
    await semneaza(p4, zi(-24));
    await semneaza(p5, zi(-24));
    await prefect(p4, zi(-22));
    await confirmaPrimireaLaPrefect(tx, { proiectId: p4, la: zi(-21), utilizatorId: a.secretarId });
    await aprobaPublicarea(tx, { proiectId: p4, azi: zi(-21), utilizatorId: a.primarId });
    await marcheazaCopiaAnonimizata(tx, { proiectId: p4, azi: zi(-21), utilizatorId: a.secretarId });

    // Ședința 3, ordinară: o hotărâre la semnat (fără contrasemnătură), una emisă, de comunicat.
    const p6 = await proiect({ titlu: "Proiect de hotărâre privind darea în administrare a unui spațiu (probă)", comp: "patrimoniu", normativ: false, initiat: -20, comisii: [2] });
    const p7 = await proiect({ titlu: "Proiect de hotărâre privind aprobarea planului anual de acțiuni pentru venitul minim de incluziune (probă)", comp: "asistenta", normativ: false, initiat: -19, comisii: [4] });
    for (const p of [p6, p7]) await puneOrdineaDeZi(tx, { proiectId: p, sedintaId: s3, utilizatorId: a.secretarId });
    await convoaca(tx, { sedintaId: s3, la: zi(-12), convocare: "Dispoziția de convocare nr. 131 (probă)", materialeLa: zi(-12), utilizatorId: a.secretarId });
    await scriePrezenta(tx, { sedintaId: s3, prezenti: 13, presedinte: "consilierul local ales președinte de ședință (probă)", utilizatorId: a.secretariatId });
    await vot(p6, "aprobat", [11, 1, 1]);
    await vot(p7, "aprobat", [13, 0, 0]);
    await semneaza(p6, zi(-5), false);
    await semneaza(p7, zi(-5));

    // Procesele-verbale: primul publicat, al doilea aprobat și nepublicat (ceasul merge), al treilea redactat.
    await scriePv(tx, { entitateId, sedintaId: s1, pas: "redactat", la: zi(-48), utilizatorId: a.secretariatId });
    await scriePv(tx, { entitateId, sedintaId: s1, pas: "semnat", la: zi(-47), utilizatorId: a.secretarId });
    await scriePv(tx, { entitateId, sedintaId: s1, pas: "aprobat", la: zi(-25), aprobatInSedintaId: s2, utilizatorId: a.secretariatId });
    await scriePv(tx, { entitateId, sedintaId: s1, pas: "publicat", la: zi(-24), utilizatorId: a.secretarId });
    await scriePv(tx, { entitateId, sedintaId: s2, pas: "redactat", la: zi(-24), utilizatorId: a.secretariatId });
    await scriePv(tx, { entitateId, sedintaId: s2, pas: "semnat", la: zi(-23), utilizatorId: a.secretarId });
    await scriePv(tx, { entitateId, sedintaId: s2, pas: "aprobat", la: zi(-6), aprobatInSedintaId: s3, utilizatorId: a.secretariatId });
    await scriePv(tx, { entitateId, sedintaId: s3, pas: "redactat", la: zi(-4), utilizatorId: a.secretariatId });

    // Ședința 4, ordinară, convocată: taxele locale (normativ, după Legea 52, cu un aviz lipsă) și inventarul.
    const p8 = await proiect({ titlu: "Proiect de hotărâre privind nivelul impozitelor și taxelor locale pentru anul următor (probă)", comp: "taxe", normativ: true, initiat: -52, anunt: -50, comisii: [1, 2, 5], avize: 2 });
    const p9 = await proiect({ titlu: "Proiect de hotărâre privind actualizarea inventarului domeniului public (probă)", comp: "patrimoniu", normativ: false, initiat: -9, comisii: [2] });
    for (const p of [p8, p9]) await puneOrdineaDeZi(tx, { proiectId: p, sedintaId: s4, utilizatorId: a.secretarId });
    await convoaca(tx, { sedintaId: s4, la: zi(0), convocare: "Dispoziția de convocare nr. 140 (probă)", materialeLa: zi(0), utilizatorId: a.secretarId });

    // În lucru: un regulament anunțat (în așteptare pe Legea 52, cu o propunere primită) și două proiecte fără raport.
    const p10 = await proiect({ titlu: "Proiect de hotărâre privind aprobarea regulamentului pieței agroalimentare (probă)", comp: "agricol", normativ: true, initiat: -12, anunt: -10, comisii: [3, 5], avize: 0, legalitate: false });
    await adaugaPropunerea(tx, { entitateId, proiectId: p10, la: zi(-5), numar: "5099 (probă)", rezumat: "Programul de funcționare să înceapă mai devreme în zilele de sâmbătă (probă).", utilizatorId: a.secretariatId });
    await proiect({ titlu: "Proiect de hotărâre privind aprobarea unui plan urbanistic de detaliu (probă)", comp: "urbanism", normativ: false, initiat: -3, raport: false, comisii: [] });
    await proiect({ titlu: "Proiect de hotărâre privind aprobarea unor scutiri de la plata impozitului (probă)", comp: "taxe", normativ: false, initiat: -2, raport: false, comisii: [] });
  });
}
