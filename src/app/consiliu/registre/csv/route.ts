import { utilizatorulCurent } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { catreCsv, vedereaConsiliului } from "@/domeniu/consiliu";
import { esteFelRegistru, randurileRegistrului } from "../date";

/** Exportul registrului pentru încărcarea pe platforma Monitorului Oficial Local. */
export async function GET(cerere: Request) {
  const u = await utilizatorulCurent();
  if (!u || vedereaConsiliului(u.acordari).fel !== "tot") return new Response("Fără drept.", { status: 403 });
  const b = db();
  if (!b) return new Response("Baza de date nu e configurată.", { status: 503 });
  const q = new URL(cerere.url).searchParams;
  const fel = q.get("fel") ?? "";
  const an = Number(q.get("an"));
  if (!esteFelRegistru(fel) || !Number.isInteger(an) || an < 2000 || an > 2100) return new Response("Cerere greșită.", { status: 400 });
  const r = await inEntitate(b, u.entitateId, (tx) => randurileRegistrului(tx, fel, an));
  return new Response(catreCsv([r.cap, ...r.randuri]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="registrul-${fel}-${an}.csv"`,
      "cache-control": "no-store",
    },
  });
}
