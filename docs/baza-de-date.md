# Baza de date

PostgreSQL standard, cu migrări SQL numerotate în `migrari/` (Drizzle).

## Schemele

| Schema | Ce ține | Se reface la publicare? |
|---|---|---|
| `petru` | datele aplicației: instituția, compartimentele, registrul comun (persoane), utilizatorii, documentele, jurnalul | da, în mediile de probă |
| `petru_migrari` | evidența migrărilor aplicate | da, odată cu `petru` |
| `observatii` | observațiile din „Ce lipsește?” | **niciodată** |

Jurnalul (`petru.jurnal`) se poate doar completa: modificarea, ștergerea și golirea sunt refuzate de bază (migrarea `0001`).

## Comenzile

| Comanda | Ce face |
|---|---|
| `docker compose up -d` | pornește PostgreSQL local |
| `npm run db:genereaza` | scrie migrarea nouă după o schimbare în `src/baza/schema.ts` |
| `npm run db:migreaza` | aplică migrările (orice mediu, inclusiv producția) |
| `npm run db:refacere` | șterge `petru`, aplică migrările, încarcă datele de probă; **refuză în producție** |

Fără `DATABASE_URL`, comenzile nu fac nimic.

## Datele de probă

- Generate determinist (aceeași sămânță, aceleași date), toate marcate `este_proba`.
- CNP-urile de probă au cifra de control corectă și **codul de județ 99**, neatribuit, deci nu pot fi ale unei persoane reale.
- Adresele sunt „Strada Exemplu”, e-mailurile au domeniul `.invalid`, firmele au „(probă)” în nume.

## Mediile

- **Previzualizări și site-ul de test (Netlify):** comanda de construire rulează `db:refacere`, apoi construcția. Adresa bazei stă numai în setările Netlify. Pentru refacere se poate pune și `DATABASE_URL_DIRECTA` (conexiunea Neon fără pooler), ca lacătul de refacere să fie sigur.
- **Producția (Azure):** numai `db:migreaza`, la instalarea unei versiuni; nicio refacere.
