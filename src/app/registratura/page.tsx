import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { compartimente } from "@/baza/schema";
import { cifrele, listaRegistrului, type FiltruTermen } from "@/baza/registratura";
import { ETICHETE } from "@/domeniu/drumul-actului";
import { aziInRomania, ETICHETE_TERMEN, stareaTermenului, vedereaRegistrului } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

const FILTRE_TERMEN: { cheie: FiltruTermen; nume: string }[] = [
  { cheie: "toate", nume: "Toate" },
  { cheie: "deschise", nume: "Fără răspuns" },
  { cheie: "depasit", nume: "Termen depășit" },
  { cheie: "aproape", nume: "Scad în curând" },
  { cheie: "la_semnat", nume: "La semnat" },
  { cheie: "fara_confirmare", nume: "Ieșiri fără confirmare" },
];

type Cautare = { cauta?: string; termen?: string; compartiment?: string; directie?: string };

export default async function Registratura({ searchParams }: { searchParams: Promise<Cautare> }) {
  const u = await cere();
  const vedere = vedereaRegistrului(u.acordari);
  if (vedere.fel === "nimic") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;

  const p = await searchParams;
  const termen = (FILTRE_TERMEN.find((x) => x.cheie === p.termen)?.cheie ?? "toate") as FiltruTermen;
  const directie = p.directie === "intrare" || p.directie === "iesire" ? p.directie : undefined;
  const azi = aziInRomania();
  const comp = await b.select({ id: compartimente.id, nume: compartimente.nume }).from(compartimente).where(eq(compartimente.entitateId, u.entitateId)).orderBy(asc(compartimente.nume));
  const compartimentId = comp.some((c) => c.id === p.compartiment) ? p.compartiment : undefined;

  const { lista, cifre } = await inEntitate(b, u.entitateId, async (tx) => ({
    lista: await listaRegistrului(tx, vedere, { cauta: p.cauta?.slice(0, 100), termen, compartimentId, directie }, azi),
    cifre: await cifrele(tx, vedere, azi),
  }));

  const legatura = (t: FiltruTermen) => `/registratura?${new URLSearchParams({ ...(p.cauta ? { cauta: p.cauta } : {}), ...(compartimentId ? { compartiment: compartimentId } : {}), termen: t })}`;

  return (
    <>
      <h1>Registrul de intrare-ieșire</h1>
      <p className="slab">
        Registrul oficial rămâne în programul de registratură; aici se urmărește unde e fiecare document, termenul, răspunsul și confirmarea de primire.
        {vedere.fel === "fisa" && " Vedeți fișa de înregistrare a documentelor, fără mersul lor prin birouri."}
        {vedere.fel === "compartimente" && " Vedeți documentele compartimentelor dumneavoastră."}
      </p>

      <div className="grila">
        <Link href={legatura("depasit")} className="card"><h3>{cifre.depasite}</h3><p className="slab">termene depășite</p></Link>
        <Link href={legatura("aproape")} className="card"><h3>{cifre.aproape}</h3><p className="slab">scad în următoarele 3 zile</p></Link>
        <Link href={legatura("deschise")} className="card"><h3>{cifre.deschise}</h3><p className="slab">documente fără răspuns</p></Link>
        <Link href={legatura("fara_confirmare")} className="card"><h3>{cifre.faraConfirmare}</h3><p className="slab">ieșiri fără confirmare de primire</p></Link>
      </div>

      {u.poate("documente.inregistreaza") && (
        <p><Link href="/registratura/import" className="buton">Importă exportul registrului</Link></p>
      )}

      <form className="rand-formular" method="get" role="search">
        <div><label htmlFor="cauta">Caută</label><input id="cauta" name="cauta" type="search" defaultValue={p.cauta ?? ""} placeholder="număr, emitent, conținut" /></div>
        <div>
          <label htmlFor="compartiment">Compartimentul</label>
          <select id="compartiment" name="compartiment" defaultValue={compartimentId ?? ""}>
            <option value="">— toate —</option>
            {comp.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="directie">Sensul</label>
          <select id="directie" name="directie" defaultValue={directie ?? ""}>
            <option value="">intrări și ieșiri</option>
            <option value="intrare">numai intrări</option>
            <option value="iesire">numai ieșiri</option>
          </select>
        </div>
        <div>
          <label htmlFor="termen">Termenul</label>
          <select id="termen" name="termen" defaultValue={termen}>
            {FILTRE_TERMEN.map((x) => <option key={x.cheie} value={x.cheie}>{x.nume}</option>)}
          </select>
        </div>
        <button className="buton" type="submit">Arată</button>
      </form>

      <div className="tabel-invelis">
        <table>
          <thead>
            <tr><th>Nr.</th><th>Data</th><th>Sens</th><th>Conținut</th><th>Emitent / destinatar</th><th>Compartiment</th><th>Stare</th><th>Termen</th></tr>
          </thead>
          <tbody>
            {lista.map((d) => {
              const st = d.directie === "iesire" ? null : stareaTermenului(d.termen, d.stare, azi);
              return (
                <tr key={d.id}>
                  <td><Link href={`/registratura/${d.id}`}>{d.numar}/{d.an}</Link></td>
                  <td>{dataRo(d.data.toISOString())}</td>
                  <td>{d.directie === "iesire" ? "ieșire" : d.directie}</td>
                  <td>{d.continut}{d.raspunsNumar ? <span className="slab"> · răspuns nr. {d.raspunsNumar}</span> : null}</td>
                  <td>{d.directie === "iesire" ? d.destinatar : d.emitent}</td>
                  <td>{d.compartiment ?? <span className="slab">nerepartizat</span>}</td>
                  <td><span className="eticheta">{ETICHETE[d.stare]}</span></td>
                  <td>
                    {d.directie === "iesire"
                      ? (d.confirmatLa ? `primit ${dataRo(d.confirmatLa)}` : <span className="eticheta termen-aproape">fără confirmare</span>)
                      : (<>{d.termen ? dataRo(d.termen) : "—"} {st && st !== "in_termen" && st !== "fara_termen" && <span className={`eticheta termen-${st}`}>{ETICHETE_TERMEN[st]}</span>}</>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length === 0 && <p className="slab">Niciun document pentru alegerea făcută.</p>}
      {lista.length === 200 && <p className="slab">Se arată primele 200. Restrângeți căutarea.</p>}
    </>
  );
}
