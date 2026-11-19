/**
 * Compartimentele unei primării de comună, ca setări implicite pentru mediul de probă.
 * Structura e luată din cercetare (docs/cercetare/structura-primariei.md); programul și
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
  { cheie: "secretar", nume: "Secretarul general", ce: "Consiliul local, dispozițiile, registrele, avizul de legalitate", program: PROGRAM_OBISNUIT, interior: "101" },
  { cheie: "registratura", nume: "Registratura", ce: "Înregistrarea și repartizarea documentelor", program: PROGRAM_OBISNUIT, interior: "100" },
  { cheie: "taxe", nume: "Taxe și impozite", ce: "Declarații fiscale, certificate fiscale, încasări, scutiri, restituiri", program: PROGRAM_OBISNUIT, interior: "102" },
  { cheie: "urbanism", nume: "Urbanism", ce: "Certificate de urbanism, autorizații de construire, avize PUZ/PUD, disciplina în construcții", program: PROGRAM_OBISNUIT, interior: "103" },
  { cheie: "agricol", nume: "Registrul agricol", ce: "Registrul agricol, adeverințe, atestate de producător, oferte de vânzare a terenurilor", program: PROGRAM_OBISNUIT, interior: "104" },
  { cheie: "stare-civila", nume: "Stare civilă", ce: "Certificate de naștere, căsătorie, deces, transcrieri, divorț administrativ", program: PROGRAM_OBISNUIT, interior: "105" },
  { cheie: "asistenta", nume: "Asistență socială și autoritate tutelară", ce: "Beneficii sociale, alocații, ajutor de încălzire, handicap, venitul minim de incluziune", program: PROGRAM_OBISNUIT, interior: "106" },
  { cheie: "contabilitate", nume: "Contabilitate", ce: "Execuția bugetară, plățile, situațiile financiare", program: PROGRAM_OBISNUIT, interior: "114" },
  { cheie: "administratie", nume: "Administrație locală", ce: "Regulamente, evidențe administrative", program: PROGRAM_OBISNUIT, interior: "107" },
  { cheie: "achizitii", nume: "Achiziții publice", ce: "Programul anual, procedurile, contractele", program: PROGRAM_OBISNUIT, interior: "108" },
  { cheie: "patrimoniu", nume: "Patrimoniu", ce: "Inventarul domeniului public și privat, chirii, concesiuni", program: PROGRAM_OBISNUIT, interior: "109" },
  { cheie: "mediu", nume: "Mediu și salubrizare", ce: "Salubrizarea, colectarea selectivă, protecția mediului", program: PROGRAM_OBISNUIT, interior: "110" },
  { cheie: "asociatii", nume: "Asociații de proprietari", ce: "Îndrumarea asociațiilor de proprietari", program: PROGRAM_OBISNUIT, interior: "111" },
  { cheie: "resurse-umane", nume: "Resurse umane", ce: "Personalul, concursurile, evidența", program: PROGRAM_OBISNUIT, interior: "112" },
  { cheie: "proiecte", nume: "Proiecte cu finanțare externă", ce: "Cererile de finanțare, contractele, raportările", program: PROGRAM_OBISNUIT, interior: "113" },
];

export function compartimentul(cheie: string): Compartiment | undefined {
  return COMPARTIMENTE.find((c) => c.cheie === cheie);
}
