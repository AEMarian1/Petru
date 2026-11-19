/**
 * Catalogul de formulare, pe compartimente. Titlurile sunt cele obișnuite în primării
 * (cercetare: docs/cercetare/structura-primariei.md). În producție le întreține administratorul.
 */
export type Formular = {
  titlu: string;
  compartiment: string;
  termen?: string;
  taxa?: boolean;
};

export const FORMULARE: Formular[] = [
  { titlu: "Cerere de informații de interes public", compartiment: "secretar", termen: "544" },
  { titlu: "Petiție", compartiment: "registratura", termen: "petitie" },
  { titlu: "Cerere de certificat de atestare fiscală", compartiment: "taxe", termen: "certificat-fiscal", taxa: true },
  { titlu: "Declarație pentru clădiri (persoane fizice și juridice)", compartiment: "taxe" },
  { titlu: "Declarație pentru teren", compartiment: "taxe" },
  { titlu: "Declarație pentru mijloace de transport", compartiment: "taxe" },
  { titlu: "Cerere de restituire", compartiment: "taxe" },
  { titlu: "Cerere de scutire", compartiment: "taxe" },
  { titlu: "Cerere de certificat de urbanism de informare", compartiment: "urbanism", termen: "certificat-urbanism", taxa: true },
  { titlu: "Cerere de certificat de urbanism pentru construire sau desființare", compartiment: "urbanism", termen: "certificat-urbanism", taxa: true },
  { titlu: "Cerere de autorizație de construire sau desființare", compartiment: "urbanism", termen: "autorizatie-construire", taxa: true },
  { titlu: "Înștiințare de începere a lucrărilor", compartiment: "urbanism" },
  { titlu: "Cerere de adeverință din registrul agricol", compartiment: "agricol" },
  { titlu: "Cerere de atestat de producător", compartiment: "agricol", taxa: true },
  { titlu: "Cerere de carnet de comercializare", compartiment: "agricol", taxa: true },
  { titlu: "Cerere de eliberare a certificatului de naștere (duplicat)", compartiment: "stare-civila" },
  { titlu: "Cerere de eliberare a certificatului de căsătorie (duplicat)", compartiment: "stare-civila" },
  { titlu: "Cerere de transcriere a unui certificat emis în străinătate", compartiment: "stare-civila" },
  { titlu: "Cerere de extras multilingv", compartiment: "stare-civila" },
  { titlu: "Cerere de alocație de stat pentru copii", compartiment: "asistenta" },
  { titlu: "Cerere de ajutor pentru încălzirea locuinței", compartiment: "asistenta" },
  { titlu: "Cerere de evaluare complexă (încadrare în grad de handicap)", compartiment: "asistenta" },
];
