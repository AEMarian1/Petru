import { COMPARTIMENTE, ENTITATI_LEGATE, compartimentul } from "@/date-proba/compartimente";
import { FORMULARE } from "@/date-proba/formulare";

export default function Compartimente() {
  return (
    <>
      <h1>Compartimentele</h1>
      <p className="slab">Setări de probă. În aplicația reală le completează administratorul: denumirea, atribuțiile, programul cu publicul, interiorul.</p>
      <div className="grila">
        {COMPARTIMENTE.map((c) => (
          <div key={c.cheie} className="card">
            <h3>{c.nume}</h3>
            <p>{c.ce}</p>
            <p className="slab">Program: {c.program}<br />Interior: {c.interior} (probă)</p>
            <p className="slab">{FORMULARE.filter((f) => f.compartiment === c.cheie).length} formulare în catalog</p>
          </div>
        ))}
      </div>
      <h2>Entități legate, cu formă juridică proprie</h2>
      <p className="slab">Nu sunt compartimente ale primăriei: au datele lor. Documentele schimbate cu ele trec prin registratură.</p>
      <div className="grila">
        {ENTITATI_LEGATE.map((e) => (
          <div key={e.cheie} className="card">
            <h3>{e.nume}</h3>
            <p>{e.legatura}</p>
            <p className="slab">Legătura cu primăria: {compartimentul(e.prinCompartiment)?.nume}</p>
          </div>
        ))}
      </div>
    </>
  );
}
