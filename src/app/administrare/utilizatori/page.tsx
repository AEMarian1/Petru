import { asc, eq } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { compartimente, roluri, utilizatori, utilizatorRoluri } from "@/baza/schema";
import { acordaRol, adaugaUtilizator, retrageRol, schimbaActiv } from "../actiuni";

export default async function Utilizatori() {
  const u = await cere("administrare.utilizatori");
  const b = db()!;
  const lista = await b.select().from(utilizatori).where(eq(utilizatori.entitateId, u.entitateId)).orderBy(asc(utilizatori.numeAfisat));
  const rolurile = await b.select().from(roluri).where(eq(roluri.entitateId, u.entitateId)).orderBy(asc(roluri.nume));
  const comp = await b.select().from(compartimente).where(eq(compartimente.entitateId, u.entitateId)).orderBy(asc(compartimente.nume));
  const acordari = await b
    .select({ id: utilizatorRoluri.id, utilizatorId: utilizatorRoluri.utilizatorId, rol: roluri.nume, compartiment: compartimente.nume })
    .from(utilizatorRoluri)
    .innerJoin(roluri, eq(roluri.id, utilizatorRoluri.rolId))
    .leftJoin(compartimente, eq(compartimente.id, utilizatorRoluri.compartimentId))
    .where(eq(roluri.entitateId, u.entitateId));

  const alegeRol = (
    <select name="rol" defaultValue="">
      <option value="">— rolul —</option>
      {rolurile.map((r) => <option key={r.id} value={r.id}>{r.nume}</option>)}
    </select>
  );
  const alegeCompartiment = (
    <select name="compartiment" defaultValue="">
      <option value="">— toate compartimentele —</option>
      {comp.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
    </select>
  );

  return (
    <>
      <h1>Utilizatorii</h1>
      <p className="slab">
        În producție, utilizatorul intră cu contul Microsoft al instituției: îl creați aici cu aceeași adresă de e-mail, iar la prima intrare se leagă singur de contul Entra.
      </p>

      <h2>Utilizator nou</h2>
      <form action={adaugaUtilizator} className="card rand-formular">
        <div><label htmlFor="nume">Numele afișat</label><input id="nume" name="nume" type="text" required /></div>
        <div><label htmlFor="email">E-mailul instituțional</label><input id="email" name="email" type="email" required /></div>
        <div><label htmlFor="functie">Funcția</label><input id="functie" name="functie" type="text" placeholder="de pildă: inspector" /></div>
        <div><label>Rolul</label>{alegeRol}</div>
        <div><label>Compartimentul</label>{alegeCompartiment}</div>
        <button className="buton" type="submit">Adaugă</button>
      </form>

      <h2>Conturile</h2>
      {lista.map((x) => (
        <section key={x.id} className="card" style={{ marginBottom: "0.8rem" }}>
          <h3>{x.numeAfisat} {!x.activ && <span className="eticheta">oprit</span>} {x.contLocal && <span className="eticheta">cont de probă</span>}</h3>
          <p className="slab">{[x.functie, x.email, x.entraOid ? "legat de Entra ID" : null].filter(Boolean).join(" · ")}</p>
          <ul>
            {acordari.filter((a) => a.utilizatorId === x.id).map((a) => (
              <li key={a.id}>
                {a.rol}{a.compartiment ? ` — ${a.compartiment}` : ""}
                {x.id !== u.id && (
                  <form action={retrageRol} style={{ display: "inline", marginLeft: "0.5rem" }}>
                    <input type="hidden" name="acordare" value={a.id} />
                    <button className="buton-text" type="submit">retrage</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {x.id !== u.id && (
            <div className="rand-formular">
              <form action={acordaRol} className="rand-formular">
                <input type="hidden" name="utilizator" value={x.id} />
                {alegeRol}
                {alegeCompartiment}
                <button className="buton buton-mic" type="submit">Acordă rolul</button>
              </form>
              <form action={schimbaActiv}>
                <input type="hidden" name="id" value={x.id} />
                <input type="hidden" name="activ" value={x.activ ? "nu" : "da"} />
                <button className="buton-text" type="submit">{x.activ ? "Oprește contul" : "Pornește contul"}</button>
              </form>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
