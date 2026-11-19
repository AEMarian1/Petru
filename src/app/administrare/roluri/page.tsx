import { asc, eq, inArray } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { rolPermisiuni, roluri } from "@/baza/schema";
import { GRUPE, PERMISIUNI, type Permisiune } from "@/domeniu/permisiuni";
import { adaugaRol, salveazaDrepturi } from "../actiuni";

export default async function Roluri() {
  const u = await cere("administrare.roluri");
  const b = db()!;
  const rolurile = await b.select().from(roluri).where(eq(roluri.entitateId, u.entitateId)).orderBy(asc(roluri.nume));
  const drepturi = rolurile.length
    ? await b.select().from(rolPermisiuni).where(inArray(rolPermisiuni.rolId, rolurile.map((r) => r.id)))
    : [];
  const are = (rolId: string, p: string) => drepturi.some((d) => d.rolId === rolId && d.permisiune === p);
  const chei = Object.keys(PERMISIUNI) as Permisiune[];

  return (
    <>
      <h1>Rolurile și drepturile</h1>
      <p className="slab">Bifați ce poate face fiecare rol, apoi „Salvează”. Drepturile marcate „pe compartiment” se aplică numai compartimentului pentru care e dat rolul.</p>
      {rolurile.map((r) => (
        <form key={r.id} action={salveazaDrepturi} className="card" style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="rol" value={r.id} />
          <h3>{r.nume} {r.predefinit && <span className="eticheta">predefinit</span>}</h3>
          {r.descriere && <p className="slab">{r.descriere}</p>}
          {(Object.keys(GRUPE) as (keyof typeof GRUPE)[]).map((g) => (
            <fieldset key={g} style={{ border: 0, padding: 0, margin: "0.6rem 0" }}>
              <legend className="slab">{GRUPE[g]}</legend>
              {chei.filter((p) => PERMISIUNI[p].grupa === g).map((p) => (
                <label key={p} style={{ display: "block", fontWeight: 400, margin: "0.15rem 0" }}>
                  <input type="checkbox" name="permisiune" value={p} defaultChecked={are(r.id, p)} /> {PERMISIUNI[p].nume}
                </label>
              ))}
            </fieldset>
          ))}
          <button className="buton buton-mic" type="submit">Salvează</button>
        </form>
      ))}
      <h2>Rol nou</h2>
      <form action={adaugaRol} className="card rand-formular">
        <div><label htmlFor="rn">Numele</label><input id="rn" name="nume" type="text" required /></div>
        <div><label htmlFor="rd">Descrierea</label><input id="rd" name="descriere" type="text" /></div>
        <button className="buton" type="submit">Creează</button>
      </form>
    </>
  );
}
