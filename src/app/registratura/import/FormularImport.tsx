"use client";

import { useActionState } from "react";
import { verificaImportul, type StareVerificare } from "../actiuni";

export function FormularImport() {
  const [stare, actiune, lucreaza] = useActionState<StareVerificare, FormData>(verificaImportul, undefined);
  return (
    <form action={actiune} className="card rand-formular">
      <div>
        <label htmlFor="fisier">Fișierul CSV exportat din registru</label>
        <input id="fisier" name="fisier" type="file" accept=".csv,text/csv" required />
      </div>
      <button className="buton" type="submit" disabled={lucreaza}>{lucreaza ? "Verific…" : "Verifică fișierul"}</button>
      {stare?.eroare && <p className="eroare" role="alert">{stare.eroare}</p>}
    </form>
  );
}
