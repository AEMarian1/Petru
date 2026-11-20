# Istoricul lucrării

Jurnalul hotărârilor și al pașilor, ca o sesiune nouă să poată continua de unde a rămas. Se completează la sfârșitul fiecărei sesiuni.

## Sesiunea 1 — 19.11.2026

### Ce s-a hotărât

| Hotărârea | Unde e scrisă |
|---|---|
| Petru pornește de la zero, fără nimic din Sfera sau din `primaria-sanpetru` | `CLAUDE.md`, `docs/provenienta.md` |
| Numele produsului: **Petru** (nu Petra) | `docs/provenienta.md` |
| Arhitectura: Next.js, PostgreSQL standard, containere; Entra ID; producția în Azure (UE) pe contul primăriei | `docs/arhitectura.md` (aprobată) |
| Hotărârile de la § 9: Drizzle; două ramuri Neon (`previzualizare`, principală pentru test); observațiile într-un tabel care nu se reface; CSS propriu; Azure Container Apps; imaginea o construiește firma de IT a primăriei; numele afișat „Petru — [instituția]” | `docs/arhitectura.md` § 9 |
| Sursele publice (site, Monitorul Oficial Local, execuții bugetare) se pot folosi la proiectare, fără date personale, numai ca note în `docs/cercetare/` | `CLAUDE.md` regula 5 |
| Birourile primăriei: 19 birouri, plus Resurse umane și Serviciul Domeniul public | `docs/birouri.md` |
| Serviciul de salubrizare: entitate cu formă juridică distinctă, **lucrează în Petru** cu datele lui; salubrizarea e **taxă specială** (declarația ajunge la Taxe și impozite) | `docs/arhitectura-date.md` |
| Primăria smart, pe date: un model de date comun, imobilul ca piesă centrală, harta GIS (PostGIS, MapLibre, Stereo 70), taxele calculate și simulate din date, indicatori pentru decizii, dicționar de date | `docs/arhitectura-date.md` (propunere) |
| SOBIS rămâne; contractul permite exportul și integrarea. Petru se leagă de el, nu îl înlocuiește dintr-odată | `docs/arhitectura-date.md` § 10 |
| GIS-ul (QGIS) și inventarul sunt pe laptopul de serviciu al primăriei și **rămân acolo**; se importă numai în producție, de colegi | `docs/arhitectura-date.md` § 10–11 |
| Ordinea de lucru: întâi stratul de bază (utilizatori, roluri, drepturi), apoi **birou cu birou**, funcțiune cu funcțiune | această pagină |

### Ce s-a construit

| PR | Ce | Starea la sfârșitul sesiunii |
|---|---|---|
| (commit pe `main`) | Regulile și documentele: `CLAUDE.md`, `impartirea.md`, `nota-de-autor.md`, `provenienta.md` | pe `main` |
| #1 | Arhitectura și planul scheletului | unit |
| #2 | Numele Petru | unit |
| #3 | Excepția pentru datele publice | unit |
| #4 | S1: scheletul Next.js și demo-ul | unit |
| #5 | Cercetarea pe surse publice | unit |
| #6 | Demo: birourile, catalogul de formulare, consiliul local, harta nevoilor (`docs/nevoi.md`, `docs/birouri.md`) | unit |
| #7 | S2: baza de date, migrările, datele de probă (pornește de la #6) | unit |
| #8 | Propunerea: datele și harta (pornește de la #7) | unit (propunere) |
| #9 | S3: utilizatorii, rolurile și drepturile (pornește de la #7) | unit |
| #10 | Acest istoric | unit |

La sfârșitul sesiunii, **toate PR-urile sunt unite în `main`**.

### Mediile

- **Netlify:** site-ul `petru-test` (https://petru-test.netlify.app), legat de depozit. La sfârșitul sesiunii era încă privat („only you”). `DATABASE_URL` e pusă de autor, aceeași pentru „live app” și „versions”. De făcut la nevoie, de autor:
  - accesul pentru colegi: Visitor access;
  - a doua ramură Neon pentru previzualizări;
  - opțional, `DATABASE_URL_DIRECTA`;
  - în producție, `AUTH_SECRET`.
- **Neon:** proiectul `petra`, Frankfurt (eu-central-1), baza `neondb`, conexiunea „pooled”.
- **Rețeaua sesiunilor Claude:** mediul permite site-ul primăriei, platforma Monitorului Oficial Local, `executii-bugetare.g4d.ro` și `www.transparenta-bugetara.gov.ro`.
- **Foaia de calcul cu execuția bugetară 2020–2026** a fost dată autorului separat. Nu e în depozit.

### Întrebări deschise

1. Birourile posibil omise (`docs/birouri.md`): juridic, SVSU, evidența persoanelor, cultură, arhivă, audit, SSM/PSI, administrativ-gospodăresc, IT, cantină.
2. SOBIS: ce module folosiți și cine cere documentația de integrare.
3. Straturile din QGIS și coloanele inventarului: în cuvinte, fără date.
4. Ordinea propusă: registrul bunurilor și harta la 0.3, taxele din date la 0.4.
5. Proiectul finanțat „Digitalizarea administrației publice locale” (anunțat în iulie 2026): ce platformă aduce, ca Petru să nu dubleze.
6. Întrebările pentru jurist din `docs/impartirea.md`.

### Pasul următor

1. **Primul birou: Registratura.** Autorul descrie cum se lucrează azi:
   - ce intră (hârtie, e-mail, platforme);
   - numerotarea;
   - repartizarea;
   - ce iese și cum pleacă;
   - ce încurcă.

   Pe baza descrierii se construiește modulul. În același pas: documentele legate de entitate și izolarea entităților în bază (securitate la nivel de rând).

### Mesaj pentru sesiunea următoare

> Citește `CLAUDE.md`, `docs/istoric.md`, `docs/arhitectura.md`, `docs/arhitectura-date.md`, `docs/nevoi.md` și `docs/birouri.md`. Continuăm cu biroul Registratura: întreabă-mă cum lucrează azi și construiește modulul pe baza răspunsurilor, cu PR propriu.

## Sesiunea 2 — 20.11.2026

### Ce s-a hotărât

| Hotărârea | Unde e scrisă |
|---|---|
| Registratura azi: intră hârtie, poștă, e-mail, platforme; registru unic pe an; repartizare directă de registratură; ieșirea cu număr nou; vede biroul și conducerea | `docs/registratura.md`, `docs/birouri.md` |
| La 0.1, **registrul oficial rămâne în SOBIS**; Petru importă exportul CSV și adaugă urmărirea | `docs/registratura.md` |
| Mersul documentului îl scriu birourile în Petru; registratura scrie ieșirea, expedierea și confirmarea | `docs/registratura.md` |
| Termenele se socotesc după lege, pe tipul documentului | `src/domeniu/registratura.ts` |
| Documentele și importurile sunt izolate pe entități în bază (securitate la nivel de rând) | migrarea `0004`, `docs/baza-de-date.md` |
| Numele, localitatea și județul instituției sunt setări (`PETRU_INSTITUTIE`, `PETRU_LOCALITATE`, `PETRU_JUDET`); autorul nu le-a pus încă în Netlify | `docs/baza-de-date.md` (PR #13) |
| Petru rămâne primăriei, ca donație; o eventuală aplicație viitoare a autorului va fi alta, pe alt cod și altă tehnologie | această pagină; forma juridică („donație” față de licența din `nota-de-autor.md`) e de lămurit cu juristul |
| **Petru se construiește peste proiectul finanțat „Digitalizarea administrației publice locale”** (iulie 2026): îl completează și se leagă de el, nu îl dublează | această pagină |
| Autorul confirmă propunerile din nota de cercetare, inclusiv ordinea: 0.1.x ceasul termenelor, petițiile, Legea 544; 0.2 șabloanele, avizele, consiliul local, dispozițiile, poarta și MOL; 0.3 bunurile și harta; 0.4 contractele, achizițiile și proiectele | `docs/cercetare/platforma-concurenta-si-lege.md` |
| Nu ne limităm la consiliul local: Petru e un ecosistem pe un singur drum al actului (șabloane, termene pe lege, avize, proiecte cu status și prioritate, referate, achiziții, emitere, registratură, MOL), transparent în limita legii | `docs/cercetare/platforma-concurenta-si-lege.md` (PR #14, propunere) |

### Ce s-a construit

| PR | Ce | Starea la sfârșitul sesiunii |
|---|---|---|
| #12 | Registratura 0.1: importul exportului SOBIS, termenele, mersul documentului, ieșirea și confirmarea, panoul; izolarea entităților în bază | unit (după sesiune) |
| #13 | Localitatea și județul instituției ca setări | unit (după sesiune) |
| #14 | Cercetarea: concurența, legea, transparența și clipurile trunchiate, ecosistemul propus | unit (după sesiune) |

### Întrebări deschise

1. **Numele exacte ale coloanelor** din exportul registrului SOBIS (numai numele, fără rânduri cu date).
2. **Proiectul de digitalizare, peste care construim:** ce furnizor, ce module și ce interfețe (export, API) aduce, ca Petru să se lege de el. Numai descrierea modulelor, fără date.
3. Celelalte întrebări pentru autor (A1–A8) și pentru jurist (J1–J12) din nota de cercetare.
4. Rețeaua sesiunilor nu ajunge la `legislatie.just.ro`, `cdep.ro`, `sobis.ro`, `cityon.ro`: de permis în setările mediului, ca textele de lege să fie citite pe forma oficială.
5. Rămân întrebările din sesiunea 1.

### Pasul următor

Autorul unește PR-urile #12, #13, #14. Se construiește 0.1.x (ceasul termenelor ca serviciu comun, petițiile, Legea 544), apoi 0.2, cu legăturile spre proiectul de digitalizare pe măsură ce se află ce aduce.

### Mesaj pentru sesiunea următoare

> Citește `CLAUDE.md`, `docs/istoric.md`, `docs/arhitectura.md`, `docs/arhitectura-date.md`, `docs/registratura.md` și `docs/cercetare/platforma-concurenta-si-lege.md`. Continuăm cu ecosistemul: construim peste proiectul de digitalizare, în ordinea confirmată; începe cu 0.1.x (ceasul termenelor, petițiile, Legea 544), cu PR propriu.

## Sesiunea 3 — 20.11.2026

### Ce s-a hotărât

| Hotărârea | Unde e scrisă |
|---|---|
| Se construiește 0.1.1: ceasul termenelor ca serviciu comun, registrele petițiilor și ale cererilor 544, cu rapoartele | `docs/termene.md` |
| Termenele în zile calendaristice care cad într-o zi nelucrătoare nu se mută (calcul prudent); întrebarea merge la jurist (J13) | `docs/termene.md` |
| O cerere e un document din registru, nu un registru paralel; redirecționarea, clasarea și conexarea o închid fără răspuns în fond (înregistrat/repartizat → arhivat) | `docs/termene.md`, `src/domeniu/drumul-actului.ts` |
| Drept nou `cereri.gestioneaza` și rol nou „Responsabilul cu petițiile și informațiile publice”; secretarul general primește dreptul | `docs/utilizatori-si-roluri.md` |
| Petiția o ține fiecare compartiment (termenul și răspunsul); compartimentul își vede registrul și raportul și stabilește felul cererii | `docs/termene.md` |
| Prelungirea o propune compartimentul și o hotărăște conducătorul; răspunsul la cerere pleacă numai semnat de conducător și contrasemnat de secretarul general (drept nou `documente.contrasemneaza`) | `docs/termene.md` |

### Ce s-a construit

| PR | Ce | Starea la sfârșitul sesiunii |
|---|---|---|
| (acest PR) | 0.1.1: calendarul cu sărbătorile legale, ceasul termenelor (prelungire, termene intermediare, oprire), registrele petițiilor și ale cererilor 544, reclamația administrativă, rapoartele semestrial și anual, migrarea `0005` cu izolarea pe entități | deschis |

### Întrebări deschise

1. J13–J17 din `docs/termene.md` (termenul căzut în zi nelucrătoare, redirecționarea în 5 zile, prelungirea petiției, reclamația 544, lista sărbătorilor).
2. Cine e azi responsabilul cu Legea 544 (funcția). Prelungirea: o hotărăște conducătorul (răspunsul autorului; aplicat). Petițiile: **le ține fiecare compartiment**, care ține termenul și dă răspunsul (răspunsul autorului; aplicat în acest PR).
3. Ce coloane are exportul SOBIS: autorul nu știe. De aflat de la cine folosește modulul de registratură sau de la furnizor (numai numele coloanelor). Până atunci, felul cererii îl stabilește compartimentul din fișă, când nu se recunoaște singur.
4. Rămân întrebările din sesiunile 1 și 2.

### Pasul următor

Autorul verifică PR-ul pe previzualizare (contul de probă „Responsabilul cu petițiile și informațiile publice” și „Secretarul general”) și îl unește. Apoi 0.2: șabloanele, avizele, consiliul local și dispozițiile, cu ceasul la prefect.
