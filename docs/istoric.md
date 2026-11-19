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
| #6 | Demo: birourile, catalogul de formulare, consiliul local, harta nevoilor (`docs/nevoi.md`, `docs/birouri.md`) | **deschis** |
| #7 | S2: baza de date, migrările, datele de probă (pornește de la #6) | **deschis** |
| #8 | Propunerea: datele și harta (pornește de la #7) | **deschis**, de aprobat |
| #9 | S3: utilizatorii, rolurile și drepturile (pornește de la #7) | **deschis** |

**Ordinea de unire:** #6 → #7 → #8 → #9. Ramurile #7–#9 includ commit-urile celor dinainte. După unirea lui #6, diferențele celorlalte se micșorează singure.

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

1. Unirea PR-urilor #6 → #7 → #8 → #9, după ce autorul le aprobă.
2. **Primul birou: Registratura.** Autorul descrie cum se lucrează azi:
   - ce intră (hârtie, e-mail, platforme);
   - numerotarea;
   - repartizarea;
   - ce iese și cum pleacă;
   - ce încurcă.

   Pe baza descrierii se construiește modulul. În același pas: documentele legate de entitate și izolarea entităților în bază (securitate la nivel de rând).

### Mesaj pentru sesiunea următoare

> Citește `CLAUDE.md`, `docs/istoric.md`, `docs/arhitectura.md`, `docs/arhitectura-date.md`, `docs/nevoi.md` și `docs/birouri.md`. Verifică pe GitHub starea PR-urilor #6–#9. Continuăm cu biroul Registratura: întreabă-mă cum lucrează azi și construiește modulul pe baza răspunsurilor, cu PR propriu.
