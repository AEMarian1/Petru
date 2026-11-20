/**
 * Catalogul funcționalităților (drepturilor). Lista e în cod, ca fiecare drept să aibă un sens
 * clar și să poată fi verificat în teste. Rolurile din bază aleg din această listă.
 */
export const GRUPE = {
  documente: "Documente și registratură",
  cereri: "Petiții și informații publice",
  publicare: "Publicare",
  consiliu: "Consiliul local",
  dispozitii: "Dispozițiile primarului",
  jurnal: "Jurnalul",
  administrare: "Administrarea aplicației",
} as const;

export const PERMISIUNI = {
  "documente.inregistreaza": { grupa: "documente", nume: "Înregistrează documente" },
  "documente.repartizeaza": { grupa: "documente", nume: "Repartizează documente pe compartimente" },
  "documente.vede_compartiment": { grupa: "documente", nume: "Vede documentele compartimentului său" },
  "documente.vede_tot": { grupa: "documente", nume: "Vede toate documentele entității" },
  "documente.rezolva": { grupa: "documente", nume: "Lucrează și redactează răspunsul" },
  "documente.semneaza": { grupa: "documente", nume: "Semnează actele și hotărăște prelungirea termenelor (conducătorul)" },
  "documente.contrasemneaza": { grupa: "documente", nume: "Contrasemnează răspunsurile (secretarul general)" },
  "cereri.gestioneaza": { grupa: "cereri", nume: "Ține registrele petițiilor și ale cererilor 544, cu rapoartele" },
  "publicare.aproba": { grupa: "publicare", nume: "Aprobă publicarea (poarta de publicare)" },
  "consiliu.initiaza": { grupa: "consiliu", nume: "Inițiază proiecte de hotărâre (referatul de aprobare)" },
  "consiliu.gestioneaza": { grupa: "consiliu", nume: "Ține proiectele, comisiile, ședințele, procesele-verbale și registrele consiliului" },
  "consiliu.vede": { grupa: "consiliu", nume: "Vede materialele ședințelor" },
  "dispozitii.initiaza": { grupa: "dispozitii", nume: "Inițiază proiecte de dispoziție" },
  "dispozitii.contrasemneaza": { grupa: "dispozitii", nume: "Dă avizul de legalitate și contrasemnează" },
  "dispozitii.semneaza": { grupa: "dispozitii", nume: "Semnează dispozițiile" },
  "jurnal.citeste": { grupa: "jurnal", nume: "Citește jurnalul" },
  "administrare.utilizatori": { grupa: "administrare", nume: "Administrează utilizatorii" },
  "administrare.roluri": { grupa: "administrare", nume: "Administrează rolurile și drepturile" },
  "administrare.setari": { grupa: "administrare", nume: "Modifică setările entității" },
  "observatii.citeste": { grupa: "administrare", nume: "Citește observațiile „Ce lipsește?”" },
} as const satisfies Record<string, { grupa: keyof typeof GRUPE; nume: string }>;

export type Permisiune = keyof typeof PERMISIUNI;

export function estePermisiune(x: string): x is Permisiune {
  return x in PERMISIUNI;
}

/** Drepturile care se limitează la compartimentul pentru care a fost dat rolul. */
export const PE_COMPARTIMENT: readonly Permisiune[] = ["documente.vede_compartiment", "documente.rezolva", "dispozitii.initiaza"];

export type Acordare = { permisiuni: readonly string[]; compartimentId: string | null };

/**
 * Are utilizatorul dreptul? Un drept „pe compartiment” cere ca rolul să fie dat pentru acel compartiment
 * (sau pentru toate, când compartimentul rolului e gol).
 */
export function areDreptul(acordari: readonly Acordare[], permisiune: Permisiune, compartimentId?: string | null): boolean {
  return acordari.some((a) => {
    if (!a.permisiuni.includes(permisiune)) return false;
    if (!PE_COMPARTIMENT.includes(permisiune) || compartimentId === undefined) return true;
    return a.compartimentId === null || a.compartimentId === compartimentId;
  });
}
