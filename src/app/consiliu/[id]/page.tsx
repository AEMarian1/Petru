import { notFound } from "next/navigation";
import { sedinta } from "@/date-proba/consiliu";
import { ETICHETE_PAS, ETICHETE_REZULTAT, ETICHETE_SEDINTA, PASI_PROIECT, cereAnuntPublic } from "@/domeniu/proiect-hotarare";
import { dataRo } from "@/componente/format";

export default async function Sedinta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = sedinta(id);
  if (!s) notFound();
  return (
    <>
      <p className="slab">Ședința {ETICHETE_SEDINTA[s.tip].toLowerCase()}</p>
      <h1>Ședința din {dataRo(s.data)}</h1>
      {s.tip === "de_indata" && <p className="nota">Ședință de îndată: convocarea și materialele pleacă în aceeași zi.</p>}
      {s.proiecte.map((p) => {
        const pozitie = PASI_PROIECT.indexOf(p.pas);
        const pasi = PASI_PROIECT.filter((x) => x !== "anuntat" || cereAnuntPublic(p.normativ, s.tip));
        return (
          <section key={p.id} className="card" style={{ marginBottom: "1rem" }}>
            <p className="slab">Proiectul nr. {p.numar} · {p.normativ ? "normativ" : "individual"} · inițiator: {p.initiator} · {p.compartiment}</p>
            <h3>{p.titlu}</h3>
            <ol className="drum">
              {pasi.map((x) => {
                const i = PASI_PROIECT.indexOf(x);
                return <li key={x} className={i < pozitie ? "facut" : i === pozitie ? "acum" : ""}>{ETICHETE_PAS[x]}</li>;
              })}
            </ol>
            {p.rezultat && (
              <p>
                <strong>{ETICHETE_REZULTAT[p.rezultat]}</strong>
                {p.vot && ` — pentru ${p.vot.pentru}, contra ${p.vot.contra}, abțineri ${p.vot.abtineri}`}
                {p.numarHcl && ` · HCL nr. ${p.numarHcl}`}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
