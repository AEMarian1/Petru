import { notFound } from "next/navigation";
import { documentul } from "@/date-proba/documente";
import { ETICHETE, STARI } from "@/domeniu/drumul-actului";
import { dataRo } from "@/componente/format";

export default async function Act({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = documentul(id);
  if (!d) notFound();
  const pozitie = STARI.indexOf(d.stare);
  return (
    <>
      <p className="slab">Nr. {d.numar} din {dataRo(d.data)}</p>
      <h1>{d.tip}</h1>
      <p>{d.continut}</p>
      <p className="slab">Emitent: {d.emitent} · Compartiment: {d.compartiment} · Termen: {dataRo(d.termen)}</p>
      <h2>Drumul actului</h2>
      <ol className="drum">
        {STARI.map((s, i) => (
          <li key={s} className={i < pozitie ? "facut" : i === pozitie ? "acum" : ""}>
            {ETICHETE[s]}
          </li>
        ))}
      </ol>
      <h2>Jurnalul</h2>
      <ul className="jurnal">
        {d.jurnal.map((e, i) => (
          <li key={i}><strong>{e.cand}</strong> — {e.cine}: {e.ce}</li>
        ))}
      </ul>
      <p className="nota">Nimic nu se publică fără aprobarea de publicare și fără copia anonimizată.</p>
    </>
  );
}
