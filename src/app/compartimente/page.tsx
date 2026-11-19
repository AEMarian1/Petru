import { COMPARTIMENTE } from "@/date-proba/compartimente";
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
    </>
  );
}
