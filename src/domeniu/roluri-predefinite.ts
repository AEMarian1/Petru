import type { Permisiune } from "./permisiuni";

/**
 * Rolurile predefinite, pe funcții. Se creează pentru fiecare entitate; administratorul poate
 * schimba drepturile lor sau adăuga roluri noi.
 */
export type RolPredefinit = { cheie: string; nume: string; descriere: string; permisiuni: Permisiune[]; tipuri: ("primarie" | "serviciu_public")[] };

export const ROLURI_PREDEFINITE: RolPredefinit[] = [
  {
    cheie: "administrator", nume: "Administratorul aplicației", tipuri: ["primarie", "serviciu_public"],
    descriere: "Conturile, rolurile, setările. Fiecare acțiune intră în jurnal.",
    permisiuni: ["administrare.utilizatori", "administrare.roluri", "administrare.setari", "jurnal.citeste", "observatii.citeste"],
  },
  {
    cheie: "primar", nume: "Primarul în funcție", tipuri: ["primarie"],
    descriere: "Conducerea executivă: vede tot, semnează actele și dispozițiile, aprobă publicarea.",
    permisiuni: ["documente.vede_tot", "documente.semneaza", "dispozitii.semneaza", "publicare.aproba", "consiliu.vede", "jurnal.citeste"],
  },
  {
    cheie: "viceprimar", nume: "Viceprimarul", tipuri: ["primarie"],
    descriere: "Atribuțiile delegate de primar.",
    permisiuni: ["documente.vede_tot", "consiliu.vede"],
  },
  {
    cheie: "secretar", nume: "Secretarul general", tipuri: ["primarie"],
    descriere: "Legalitatea actelor, repartizarea, consiliul local, registrele.",
    permisiuni: ["documente.vede_tot", "documente.repartizeaza", "cereri.gestioneaza", "dispozitii.contrasemneaza", "consiliu.gestioneaza", "consiliu.vede", "publicare.aproba", "jurnal.citeste"],
  },
  {
    cheie: "registratura", nume: "Registratura", tipuri: ["primarie", "serviciu_public"],
    descriere: "Înregistrează și repartizează; nu deschide răspunsurile compartimentelor.",
    permisiuni: ["documente.inregistreaza", "documente.repartizeaza"],
  },
  {
    cheie: "responsabil_cereri", nume: "Responsabilul cu petițiile și informațiile publice", tipuri: ["primarie", "serviciu_public"],
    descriere: "Ține registrul cererilor pe Legea 544 și reclamațiile administrative; vede toate petițiile și rapoartele. Petițiile le lucrează fiecare compartiment.",
    permisiuni: ["cereri.gestioneaza"],
  },
  {
    cheie: "functionar", nume: "Funcționarul de compartiment", tipuri: ["primarie", "serviciu_public"],
    descriere: "Lucrează documentele compartimentului său.",
    permisiuni: ["documente.vede_compartiment", "documente.rezolva", "dispozitii.initiaza"],
  },
  {
    cheie: "consilier", nume: "Consilierul local", tipuri: ["primarie"],
    descriere: "Vede materialele ședințelor.",
    permisiuni: ["consiliu.vede"],
  },
];
