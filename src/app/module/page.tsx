const MODULE: { versiune: string; nume: string; ce: string }[] = [
  { versiune: "0.1", nume: "Registratura", ce: "Registrul de intrare-ieșire, repartizarea, scanarea, răspunsul legat de cerere" },
  { versiune: "0.1", nume: "Termenele și sarcinile", ce: "Termenele legale puse singure, cu atenționări" },
  { versiune: "0.2", nume: "Dispozițiile primarului", ce: "Registrul, numerotarea, comunicarea la prefect, publicarea" },
  { versiune: "0.2", nume: "Consiliul local", ce: "Proiectele de hotărâre, avizele, ședințele, votul, registrul HCL" },
  { versiune: "0.3", nume: "Cabinetul primarului", ce: "Panoul: termene, ședințe, bugetul, achizițiile" },
  { versiune: "0.3", nume: "Bugetul și investițiile", ce: "Execuția bugetului, din exporturi; investițiile pe obiective" },
  { versiune: "0.3", nume: "Achizițiile", ce: "Planul anual, achizițiile directe, contractele, scadențele" },
  { versiune: "0.4", nume: "Patrimoniul și contractele", ce: "Inventarul, chiriile, concesiunile" },
  { versiune: "0.4", nume: "Urbanismul", ce: "Certificatele și autorizațiile, cu termenele de emitere" },
  { versiune: "0.4", nume: "Sesizările cetățenilor", ce: "Primirea, repartizarea, răspunsul" },
];

export default function Module() {
  return (
    <>
      <h1>Modulele propuse</h1>
      <p className="slab">Ordinea e o propunere; o hotărăște autorul.</p>
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
