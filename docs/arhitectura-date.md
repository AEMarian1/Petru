# Datele și harta: primăria construită pe date

> Stare: **propunere**, cerută de autor la 19.11.2026. Completează `docs/arhitectura.md` și `docs/nevoi.md`. Nu se construiește până nu hotărăște autorul pe întrebările de la § 10.

## 1. Principiul

**O singură bază, un singur model de date; modulele și harta sunt vederi peste aceleași date.**

- Un lucru se scrie o singură dată, în biroul care răspunde de el. Celelalte birouri îl văd, nu îl copiază.
- Fiecare tabel are un **birou proprietar**, o **sursă** și un **temei legal** (dicționarul de date, § 8).
- Harta nu are datele ei. Arată pe teren ce e deja în registre.
- Deciziile (taxele, investițiile, prioritățile) se sprijină pe cifre calculate din aceleași date, nu pe tabele separate.

## 2. Piesa centrală: imobilul

Aproape toate nevoile se leagă de un loc. De aceea registrul bunurilor (din `docs/nevoi.md`) se extinde la **toate imobilele din comună**, nu doar la cele ale primăriei:

```
Imobil (parcelă cu geometrie, nr. cadastral, nr. CF, adresă, zonă)
 ├─ Construcții (geometrie, destinație, suprafață, an)
 ├─ Situația urbanistică: zona din PUG / UTR, certificate de urbanism, autorizații
 ├─ Situația fiscală: rolul fiscal, impozitul pe clădire și teren, plățile, restanțele
 ├─ Salubrizarea: contractul sau declarația, numărul de persoane, recipientele
 ├─ Registrul agricol: categoria de folosință, parcelele agricole
 └─ Documentele: tot ce a intrat sau a ieșit despre acest imobil (drumul actului)
```

Persoanele (proprietari, contribuabili, solicitanți) vin din **registrul comun al persoanelor** și se leagă de imobil prin calitatea lor (proprietar, coproprietar, chiriaș, beneficiar).

## 3. Harta (GIS)

### Straturile

| Stratul | Sursa | Biroul proprietar |
|---|---|---|
| Parcelele cadastrale | importul din cadastru (ANCPI), periodic | Urbanism / Registrul agricol |
| Construcțiile | cadastru + autorizațiile de construire | Urbanism |
| Zonele din PUG și UTR-urile | documentația PUG, digitizată | Urbanism |
| Zonele de impozitare (A–D) | HCL-ul anual de taxe | Taxe și impozite |
| Străzile și nomenclatorul stradal | HCL-urile de denumire | Urbanism / Secretarul general |
| Domeniul public și privat | inventarul aprobat prin HCL | Patrimoniu |
| Drumurile și rețelele publice | inventar, proiecte, operatori | Domeniul public / Patrimoniu |
| Clădirile publice (școli, grădinițe, dispensare) | registrul bunurilor | Patrimoniu |
| Salubrizarea: imobile cu contract sau declarație, puncte de colectare | serviciul de salubrizare | Serviciul de salubrizare |
| Fotografia aeriană (ortofoto) | serviciul public ANCPI, de verificat condițiile | — |

### Sincronizarea

- **În Petru, sincronizarea vine din model.** O autorizație de construire legată de imobil apare pe hartă, la urbanism și la taxe în același timp, fără copiere. Nu e nevoie de sincronizare între module.
- **Cu programele din afară, prin import și export cu legături stabile:**

  | Sistemul din afară | Cheia de legătură | Cum se sincronizează |
  |---|---|---|
  | Cadastrul (ANCPI) | numărul cadastral, numărul CF | import periodic al parcelelor și construcțiilor |
  | Programul de taxe existent, cât timp rămâne | numărul de rol | import și export |
  | Registrul agricol | — | import și export |

- **Diferențele se semnalează automat.** Exemple: o construcție autorizată fără impunere la taxe, o parcelă locuită fără contract de salubrizare, o clădire din cadastru fără autorizație. Biroul proprietar le verifică; aplicația nu modifică nimic singură.

### Tehnic

- **PostGIS**, extensia geografică standard a PostgreSQL. Există și pe Neon, și pe Azure Database for PostgreSQL. Baza rămâne PostgreSQL standard.
- **Coordonatele** se păstrează în sistemul național Stereo 70 (EPSG:3844), ca în cadastru, și se afișează pe hartă în coordonatele web.
- **Harta din browser:** MapLibre, open source, fără licență plătită. Fundalul hărții e găzduit de primărie în producție, nu luat gratuit de la terți.

## 4. Serviciul de salubrizare în Petru

Serviciul de salubrizare are formă juridică distinctă. Lucrează în Petru, dar **e o entitate separată, cu datele ei**:

- Fiecare rând din bază are **entitatea** căreia îi aparține: primăria sau serviciul de salubrizare.
- Baza însăși oprește accesul unei entități la datele celeilalte: securitate la nivel de rând, din PostgreSQL. Nu e lăsat numai pe seama codului.
- **Schimbul de date între cele două entități** se face numai pe temei scris (contract, HCL, lege). Exemplu: serviciul primește lista imobilelor și numărul de persoane declarat, nu tot registrul fiscal. Schimbul se jurnalizează.
- **Declarația de salubritate** se depune în Petru o singură dată și ajunge la entitatea care o folosește. Dacă e taxă specială, ajunge la taxe; dacă e contract cu serviciul, ajunge la serviciu. Dacă e nevoie, ajunge la amândouă, după temei.
- **Fiecare entitate e operator de date pentru datele ei.** Cine plătește partea serviciului din găzduire și cum se semnează contractul de prelucrare între primărie și serviciu (art. 26 sau 28 GDPR) hotărăște juristul.

## 5. Taxele și impozitele din date

- **Calculul** urmează Codul fiscal (Titlul IX): clădiri, teren, mijloace de transport, taxe speciale. Parametrii fiecărui an vin din HCL-ul de taxe: cote, zone, rangul localității, cota adițională. Un an fiscal înseamnă un set de parametri, păstrat pe versiuni.
- **Simularea înainte de HCL.** Pe datele reale ale anului curent, aplicația arată ce ar încasa primăria dacă se schimbă o cotă sau o zonă: pe categorii, pe zone, câți contribuabili sunt atinși și cu cât. Proiectul de HCL pornește de la aceste cifre.
- **După emitere** se urmăresc impunerile față de încasări, restanțele și vechimea lor. Restanțele trec automat la executări silite, cu documentele lor.
- **Legătura cu harta:** zonele de impozitare se văd pe hartă, iar imobilele neimpuse ies la verificare (§ 3).

## 6. Deciziile din date

Peste registre stă un strat de **indicatori**, adică vederi calculate în bază și împrospătate periodic. Exemple:

- **Termenele:** cereri pe birou, termene depășite, durata medie de soluționare.
- **Banii:** venituri pe surse și ani (inclusiv din rapoartele ANAF), cheltuieli pe capitole, gradul de colectare.
- **Teritoriul:** autorizații pe zone, imobile noi pe ani, străzi fără iluminat sau canalizare din rețelele publice.
- **Patrimoniul:** bunuri fără contract, concesiuni care expiră, clădiri cu consum mare de utilități.

Panoul primarului și rapoartele pentru consiliu se construiesc din acești indicatori. AI-ul poate ajuta la explicarea cifrelor, dar e oprit din prima zi, pornește numai cu cheia primăriei și primește doar date fără caracter personal.

## 7. Modulele, peste date

Fiecare modul se descrie la fel, înainte să fie scris:

| Ce | Exemplu (Urbanism) |
|---|---|
| **Nevoia** | eliberarea certificatelor și autorizațiilor în termen |
| **Datele pe care le scrie** | certificate, autorizații, legate de imobil |
| **Datele pe care le citește** | imobilul, zona PUG, persoanele, taxele achitate |
| **Indicatorii** | cereri pe lună, durata medie, autorizații pe zone |
| **Temeiul** | Legea 169/2026 (de confirmat) |

## 8. Dicționarul de date

Fiecare tabel are o fișă, ținută în depozit, `docs/date/`:

- **descrierea și biroul proprietar;**
- **sursa:** introdus în Petru, import (din ce sistem), calculat;
- **temeiul legal** și **termenul de păstrare**, după nomenclatorul arhivistic;
- **datele personale:** da sau nu, care anume;
- **cine îl vede**, pe roluri și pe entități.

Dicționarul se verifică automat la fiecare PR: un tabel nou fără fișă oprește verificarea.

## 9. Datele reale și cele de probă

- **În previzualizări și pe site-ul de test**, harta arată **o zonă fictivă, cu parcele inventate**. Nicio parcelă reală nu se leagă de persoane inventate, ca nimeni să nu creadă că vede proprietarii reali.
- **Datele reale** (cadastru, roluri fiscale, contracte) se încarcă numai în producție, pe serverul primăriei, de colegi.
- **Datele publice fără caracter personal** pot fi folosite la proiectare, după excepția din `CLAUDE.md`: zonele PUG, străzile, rețelele publice, limitele domeniului public.

## 10. Ce există deja în primărie (de la autor)

| Ce | Starea | Ce înseamnă pentru Petru |
|---|---|---|
| **Programele SOBIS** | folosite azi pentru o mare parte din activitate | Petru nu le înlocuiește dintr-odată. Le citește datele (exporturi sau interfețe, cât permite contractul cu furnizorul) și se leagă de ele prin chei stabile: rolul fiscal, numărul cadastral, codul persoanei. Înlocuirea unui modul SOBIS se hotărăște separat, pe module, numai când Petru face același lucru cel puțin la fel de bine. |
| **GIS-ul dezvoltat intern** | există, cu destule date | Nu pornim de la zero. Datele lui sunt importate în PostGIS, cu straturile și cheile păstrate, sau, dacă e deja pe PostGIS, harta lui Petru le citește direct. Tehnologia hotărăște calea. |
| **Inventarul** | există | E punctul de pornire al registrului bunurilor. Se importă, nu se reintroduce. |
| **SCIM** | există ca documente | Procedurile se încarcă în Petru pe versiuni, cu cine le-a aprobat și când. Registrul riscurilor se construiește din ele. |

**Regula, pentru toate:** datele reale din aceste sisteme se importă numai în producție, pe serverul primăriei, de colegi. La dezvoltare se lucrează pe **structura** lor (câmpuri, formate, straturi), descrisă de colegi sau dintr-un exemplu anonimizat, aprobat după procedura primăriei.

## 11. Întrebări pentru autor

1. În lista ta apare „harta sincronizată cu urbanismul, taxele, cadastrul, salubrizarea, **autor**”. Ce ai vrut să scrii la „autor”: „auto” (vehiculele, impozitul auto), „agricol” sau altceva?
2. **SOBIS:** ce module folosiți (taxe, registru agricol, contabilitate, registratură, salarii)? Contractul cu furnizorul permite exporturi sau acces la date? Cine din primărie are drepturi de export?
3. **GIS-ul intern:** pe ce e construit (QGIS cu fișiere shapefile sau GeoPackage, PostGIS, alt program)? Ce straturi are (parcele, clădiri, străzi, PUG, rețele)? În ce sistem de coordonate (Stereo 70)?
4. **Inventarul:** în ce format e (Excel, anexa la HCL, în SOBIS)? E legat de numerele cadastrale?
5. **Cadastrul:** datele ANCPI ale comunei sunt deja în GIS-ul intern sau vin separat?
6. **PUG-ul:** e digitizat în GIS-ul intern?
7. **Salubrizarea:** e taxă specială încasată de primărie sau contract direct între cetățean și serviciu?
8. **Ordinea:** propun ca registrul bunurilor și harta să intre la versiunea 0.3, cu imobilul ca piesă centrală și cu importul din GIS-ul intern și din inventar. Taxele intră din date la 0.4, legate de SOBIS. Bună așa?
