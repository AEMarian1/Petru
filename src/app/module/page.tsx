type Modul = { versiune: string; nume: string; ce: string };

const REGISTRE = [
  { nume: "Registrul de intrare-ieșire", ce: "Orice document, cu termen și jurnal: drumul actului" },
  { nume: "Registrul comun al persoanelor", ce: "Cetățeni, firme, agenți economici, ferme, instituții" },
  { nume: "Registrul bunurilor", ce: "Terenuri, clădiri, drumuri, rețele, vehicule, pe domeniul public sau privat" },
  { nume: "Registrul contractelor", ce: "Achiziții, concesiuni, închirieri, utilități, delegări, finanțări" },
  { nume: "Registrul dosarelor", ce: "Litigii, deferate, controale" },
];

const MODULE: Modul[] = [
  { versiune: "0.1", nume: "Registratura și petițiile", ce: "Înregistrare, repartizare, răspuns în termen" },
  { versiune: "0.1", nume: "Informații publice (Legea 544)", ce: "Termenele de 10/30 de zile, raportul anual" },
  { versiune: "0.1", nume: "Termenele și sarcinile", ce: "Termenele legale puse singure, cu atenționări" },
  { versiune: "0.2", nume: "Consiliul local (HCL)", ce: "Proiecte, avize, ședințe, vot, registrul HCL, Monitorul Oficial Local" },
  { versiune: "0.2", nume: "Dispozițiile primarului", ce: "Proiecte, avizul de legalitate, registrul, comunicarea la prefect" },
  { versiune: "0.2", nume: "Controlul de legalitate (deferate)", ce: "Actele atacate de prefect, termenele, legătura cu litigiul" },
  { versiune: "0.3", nume: "Patrimoniul și inventarul", ce: "Domeniul public și privat, actualizat prin HCL" },
  { versiune: "0.3", nume: "Clădirile publice", ce: "Școli, grădinițe, dispensare: fișa clădirii, lucrări, utilități" },
  { versiune: "0.3", nume: "Drumurile și rețelele publice", ce: "Nomenclatorul stradal, starea drumurilor; apă, canal, iluminat, gaz" },
  { versiune: "0.4", nume: "Concesiuni și închirieri", ce: "Bunul, concesionarul, redevența, scadențele" },
  { versiune: "0.4", nume: "Contractele de utilități", ce: "Furnizori, locuri de consum, consumuri și facturi pe clădiri" },
  { versiune: "0.4", nume: "Achizițiile publice", ce: "Programul anual, achizițiile directe, procedurile, contractele" },
  { versiune: "0.4", nume: "Transportul public", ce: "Contractul de delegare, traseele, operatorul" },
  { versiune: "0.5", nume: "Juridic (litigii)", ce: "Dosarele, termenele de judecată, hotărârile, cheltuielile" },
  { versiune: "0.5", nume: "Controlul intern managerial (SCIM)", ce: "Procedurile pe versiuni, registrul riscurilor, raportarea anuală" },
  { versiune: "0.5", nume: "Parcul auto", ce: "Vehicule, foi de parcurs, consum, ITP, RCA, revizii" },
  { versiune: "0.6", nume: "Agenții economici", ce: "Firmele din comună, autorizațiile de funcționare, orarul" },
  { versiune: "0.6", nume: "Registrul agricol (legătură)", ce: "Fermele și terenurile agricole, citite din exporturi" },
  { versiune: "0.6", nume: "Bugetul și investițiile", ce: "Execuția din rapoartele ANAF, investițiile pe obiective" },
];

export default function Module() {
  return (
    <>
      <h1>Modulele propuse</h1>
      <p className="slab">Ordinea e o propunere; o hotărăște autorul. Detaliile: docs/nevoi.md.</p>
      <h2>Registrele comune</h2>
      <p className="slab">Toate modulele folosesc aceleași câteva registre, ca datele să fie introduse o singură dată.</p>
      <div className="grila">
        {REGISTRE.map((r) => (
          <div key={r.nume} className="card"><h3>{r.nume}</h3><p>{r.ce}</p></div>
        ))}
      </div>
      <h2>Modulele, pe versiuni</h2>
      <div className="grila">
        {MODULE.map((m) => (
          <div key={m.nume} className="card">
            <p className="slab">Versiunea {m.versiune}</p>
            <h3>{m.nume}</h3>
            <p>{m.ce}</p>
          </div>
        ))}
      </div>
    </>
  );
}
