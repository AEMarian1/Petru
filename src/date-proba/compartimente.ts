/**
 * Compartimentele unei primării de comună, ca setări implicite pentru mediul de probă.
 * Lista birourilor e cea dată de autor (docs/birouri.md); programul și
 * numerele de interior sunt INVENTATE. În producție, compartimentele le setează administratorul.
 */
export type Compartiment = {
  cheie: string;
  nume: string;
  ce: string;
  program: string;
  interior: string;
};

const PROGRAM_OBISNUIT = "Luni–Miercuri 8–12 și 13–16 · Joi 8–12 și 14–18 · Vineri 8–12";

export const COMPARTIMENTE: Compartiment[] = [
  { cheie: "primar", nume: "Primarul", ce: "Conducerea executivă, dispozițiile, semnarea actelor, aprobarea publicării", program: PROGRAM_OBISNUIT, interior: "100" },
  { cheie: "viceprimar", nume: "Viceprimarul", ce: "Atribuțiile delegate de primar", program: PROGRAM_OBISNUIT, interior: "101" },
  { cheie: "secretar", nume: "Secretarul general", ce: "Legalitatea actelor, contrasemnarea, registrele, Monitorul Oficial Local", program: PROGRAM_OBISNUIT, interior: "102" },
  { cheie: "registratura", nume: "Registratura", ce: "Înregistrarea și repartizarea documentelor", program: PROGRAM_OBISNUIT, interior: "103" },
  { cheie: "administratie", nume: "Administrativ – Consiliul local", ce: "Ședințele consiliului local, proiectele de hotărâre, materialele pentru consilieri", program: PROGRAM_OBISNUIT, interior: "104" },
  { cheie: "agricol", nume: "Registrul agricol", ce: "Registrul agricol, adeverințe, atestate de producător, oferte de vânzare a terenurilor", program: PROGRAM_OBISNUIT, interior: "105" },
  { cheie: "taxe", nume: "Taxe și impozite (persoane fizice și juridice)", ce: "Declarații fiscale, certificate fiscale, scutiri, restituiri", program: PROGRAM_OBISNUIT, interior: "106" },
  { cheie: "casierie", nume: "Casieria", ce: "Încasarea taxelor și impozitelor, chitanțe", program: PROGRAM_OBISNUIT, interior: "107" },
  { cheie: "executari", nume: "Executări silite", ce: "Recuperarea creanțelor restante: somații, titluri executorii, popriri", program: PROGRAM_OBISNUIT, interior: "108" },
  { cheie: "contabilitate", nume: "Contabilitatea", ce: "Bugetul, execuția bugetară, plățile, situațiile financiare", program: PROGRAM_OBISNUIT, interior: "109" },
  { cheie: "asistenta", nume: "Asistența socială", ce: "Beneficii sociale, alocații, ajutor de încălzire, handicap, venitul minim de incluziune", program: PROGRAM_OBISNUIT, interior: "110" },
  { cheie: "stare-civila", nume: "Starea civilă", ce: "Certificate de naștere, căsătorie, deces, transcrieri, divorț administrativ", program: PROGRAM_OBISNUIT, interior: "111" },
  { cheie: "urbanism", nume: "Urbanismul", ce: "Certificate de urbanism, autorizații de construire, avize PUZ/PUD, disciplina în construcții", program: PROGRAM_OBISNUIT, interior: "112" },
  { cheie: "proiecte", nume: "Proiecte și fonduri nerambursabile", ce: "Cererile de finanțare, contractele, raportările", program: PROGRAM_OBISNUIT, interior: "113" },
  { cheie: "achizitii", nume: "Achizițiile publice", ce: "Programul anual, procedurile, contractele", program: PROGRAM_OBISNUIT, interior: "114" },
  { cheie: "patrimoniu", nume: "Patrimoniul", ce: "Inventarul domeniului public și privat, chirii, concesiuni", program: PROGRAM_OBISNUIT, interior: "115" },
  { cheie: "mediu", nume: "Mediu și salubritate", ce: "Protecția mediului; legătura primăriei cu serviciul de salubrizare (entitate separată)", program: PROGRAM_OBISNUIT, interior: "116" },
  { cheie: "domeniu-public", nume: "Serviciul Domeniul public", ce: "Întreținerea domeniului public: drumuri, spații verzi, iluminat, clădiri", program: PROGRAM_OBISNUIT, interior: "119" },
  { cheie: "asociatii", nume: "Asociațiile de proprietari", ce: "Îndrumarea asociațiilor de proprietari", program: PROGRAM_OBISNUIT, interior: "117" },
  { cheie: "politie", nume: "Poliția locală", ce: "Ordinea publică, controale, procese-verbale de contravenție", program: PROGRAM_OBISNUIT, interior: "118" },
];

export function compartimentul(cheie: string): Compartiment | undefined {
  return COMPARTIMENTE.find((c) => c.cheie === cheie);
}

/**
 * Entitățile legate de primărie, dar cu formă juridică proprie. Nu sunt compartimente:
 * au datele lor, iar schimbul de documente cu ele trece prin registratură, ca la orice instituție.
 */
export type EntitateLegata = { cheie: string; nume: string; legatura: string; prinCompartiment: string };

export const ENTITATI_LEGATE: EntitateLegata[] = [
  {
    cheie: "salubrizare",
    nume: "Serviciul de salubrizare",
    legatura: "Serviciu cu formă juridică distinctă, înființat de primărie; colectarea și transportul deșeurilor",
    prinCompartiment: "mediu",
  },
];
