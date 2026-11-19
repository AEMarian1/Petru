import Link from "next/link";
import { cere } from "@/autentificare/utilizator";

export default async function Administrare() {
  const u = await cere();
  return (
    <>
      <h1>Administrarea aplicației</h1>
      <p className="slab">{u.entitateNume}. Fiecare schimbare de aici intră în jurnal.</p>
      <div className="grila">
        {u.poate("administrare.utilizatori") && (
          <Link href="/administrare/utilizatori" className="card"><h3>Utilizatorii</h3><p>Conturi, roluri pe compartimente, oprirea unui cont.</p></Link>
        )}
        {u.poate("administrare.roluri") && (
          <Link href="/administrare/roluri" className="card"><h3>Rolurile și drepturile</h3><p>Ce poate face fiecare rol.</p></Link>
        )}
        {u.poate("jurnal.citeste") && (
          <Link href="/administrare/jurnal" className="card"><h3>Jurnalul</h3><p>Cine, ce, când.</p></Link>
        )}
      </div>
    </>
  );
}
