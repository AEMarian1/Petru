# Arhitectura Petrei și planul scheletului

> Stare: **propunere**. Scheletul nu se construiește până nu hotărăște autorul pe acest document. Întrebările deschise sunt la § 9.

## 1. Pe scurt

Petra este o aplicație web: **Next.js** (TypeScript), cu **PostgreSQL standard**, ambalată în **containere**. Rulează în trei medii, fiecare cu baza lui:

| Mediul | Unde | Baza | Datele | Pentru cine |
|---|---|---|---|---|
| Local | calculatorul autorului | PostgreSQL în container | inventate | autorul |
| Previzualizarea | Netlify, câte una pentru fiecare PR | Neon, Frankfurt, comună tuturor PR-urilor | inventate, refăcute la fiecare publicare | autorul, pentru verificarea PR-ului |
| Site-ul de test | Netlify, alimentat din `main` | Neon, Frankfurt, separată de previzualizări | inventate, refăcute la fiecare publicare | colegii din primărie, cu conturi de probă |
| Producția | Microsoft Azure (UE), pe contul primăriei | Azure Database for PostgreSQL | **reale** | primăria |

Autorul plătește primele trei medii; primăria plătește producția (vezi [`impartirea.md`](impartirea.md)). Datele reale există numai în producție.

## 2. Tehnologia

| Partea | Alegerea | De ce |
|---|---|---|
| Aplicația | Next.js (App Router), TypeScript, Node.js LTS | Un singur limbaj pentru server și ecrane; rulează și pe Netlify, și într-un container |
| Baza | PostgreSQL standard (versiunea 16 sau 17) | Fără extensii specifice unui furnizor: aceeași bază pe Neon și pe Azure; mutarea se face cu `pg_dump` / `pg_restore` |
| Migrările | fișiere SQL numerotate, în depozit, rulate la pornire | Structura bazei are istorie și se poate reface oriunde |
| Accesul la bază | un strat subțire de interogări tipizate (propunere: Drizzle) | SQL vizibil, fără magie, ușor de citit |
| Ecranele | componente React simple, CSS propriu sau Tailwind | Accesibile, lizibile pe telefon |
| Testele | Vitest pentru logică; Playwright pentru câteva drumuri întregi | Ieftine la rulare |
| Ambalajul | imagine Docker (`output: "standalone"`) | Aceeași imagine local, în Azure sau la orice alt furnizor |

Reguli pentru bază, ca mutarea să fie directă: identificatori UUID, date și ore cu fus orar (`timestamptz`), fișierele cu cale, mărime și amprentă SHA-256.

## 3. Conturile și intrarea

- **Funcționarii** intră cu contul **Microsoft Entra ID** al primăriei (OpenID Connect), deci cu același cont ca în Microsoft 365 și cu al doilea pas pus de primărie.
- **Rolurile** (primarul în funcție, secretarul general, registratura, birourile, administratorul aplicației ș.a.) se țin în baza Petrei și le dă administratorul aplicației. Pot fi legate, opțional, de grupuri Entra ID.
- **Conturile locale** (nume și parolă) există **numai** în mediul local, în previzualizări și pe site-ul de test. În producție sunt oprite din cod: aplicația refuză să pornească dacă le găsește activate acolo.
- **Cetățenii** intră mai târziu cu ROeID; nu fac parte din schelet.

## 4. Stocarea fișierelor

Fișierele (scanări, acte generate, acte semnate) trec printr-un **strat de stocare** cu o interfață mică: `pune`, `ia`, `șterge`, `există`. Aplicația nu știe unde stau fișierele.

| Mediul | Unde stau |
|---|---|
| Local | pe disc, într-un dosar ignorat de git |
| Previzualizare și test | în bază (fișiere mici, inventate) sau în Netlify Blobs |
| Producție | Azure Blob Storage, pe contul primăriei |

Mutarea la alt furnizor înseamnă un nou adaptor și o copiere cu verificarea amprentelor; codul aplicației nu se schimbă.

## 5. Inima aplicației

Patru piese pe care se sprijină toate modulele:

1. **Un singur drum al actului.** Orice document trece prin aceleași stări: înregistrat → repartizat → în lucru → la semnat → emis → (publicat) → arhivat. Modulele (registratura, dispozițiile, consiliul local, urbanismul) adaugă pași, dar nu fac drumuri paralele.
2. **Registrul comun.** Persoanele, firmele și instituțiile se țin o singură dată și se leagă de acte. Același registru ajută și la anonimizare.
3. **Jurnalul.** Cine, ce, când, de unde: orice modificare și orice deschidere a unei fișe cu date personale. Se poate doar adăuga; ștergerea și modificarea sunt blocate în bază.
4. **Poarta de publicare.** Nimic nu ajunge la public fără aprobarea unui om cu rolul potrivit. La public ajunge numai copia anonimizată; originalul rămâne în arhivă.

Setarea instituției (numele, localitatea, județul, codul fiscal, sigla) stă în bază și o completează administratorul. În cod nu apare nicio localitate.

## 6. Mediile, pe larg

### 6.1. Previzualizarea, pe fiecare PR

- Netlify construiește automat fiecare PR și dă o adresă proprie.
- Toate previzualizările folosesc **aceeași bază Neon** (regiunea Frankfurt, UE), ramura `previzualizare`.
- La fiecare publicare, baza se **reface**: se șterge, se rulează migrările și se încarcă datele inventate. Refacerea ia un lacăt în bază, ca două publicări simultane să nu se încurce. Ultima publicare câștigă; e de așteptat, fiindcă datele sunt inventate.
- Pe fiecare pagină apare mesajul „Mediu de probă: nu introduceți date reale”.

### 6.2. Site-ul de test stabil, din `main`

- Fiecare intrare în `main` publică site-ul de test, la o adresă fixă, pentru colegii din primărie.
- Baza lui este **separată** de a previzualizărilor (ramura Neon `test`), ca un PR să nu strice ce încearcă colegii. Se reface la fiecare publicare din `main`.
- **Conturi de probă pe roluri**: „Primarul în funcție (probă)”, „Secretarul general (probă)”, „Registratura (probă)”, „Biroul de urbanism (probă)”, „Administratorul aplicației (probă)”. Pe pagina de intrare se alege rolul dintr-o listă.
- Bandă permanentă, sus: **„Mediu de probă: nu introduceți date reale”**.
- Butonul **„Ce lipsește?”**, pe fiecare pagină: colegul scrie ce i-ar trebui; se trimit și pagina și rolul. Observațiile nu se șterg la refacerea bazei (vezi întrebarea 3 de la § 9). Formularul repetă că nu se scriu date reale.

### 6.3. Producția, în Azure

- Pe abonamentul Azure al primăriei, prin firma ei de IT, într-o regiune din UE.
- Propunere: Azure Container Apps (aplicația), Azure Database for PostgreSQL – Flexible Server (baza), Azure Blob Storage (fișierele), Azure Key Vault (secretele), copii automate ale bazei și ale fișierelor.
- Versiunile se instalează de administratorul aplicației, din contul primăriei. Autorul nu are chei de producție.
- Producția se mută la alt furnizor **numai cu aprobarea administratorului aplicației**, cu export complet și verificarea amprentelor.

## 7. Verificările automate

Depozitul e privat; minutele contează.

- GitHub Actions rulează numai pe PR și pe `main`: verificarea tipurilor, lint, testele unitare. Execuțiile vechi ale aceluiași PR se anulează.
- Modificările numai în `docs/` nu pornesc testele.
- Testele cu browserul (Playwright) rulează numai pe `main` sau la cerere.
- Construcția previzualizărilor o face Netlify, nu GitHub Actions.

## 8. Planul scheletului

Fiecare pas e o sesiune separată, cu PR propriu.

| Pas | Ce intră | Rezultatul verificabil |
|---|---|---|
| S1 | Proiectul Next.js, TypeScript strict, lint, Vitest, verificările GitHub Actions, `.env.example` | PR verde; pagina de start locală |
| S2 | PostgreSQL în Docker Compose, migrările, generatorul de date inventate, scriptul de refacere a bazei | `refacere` pornește de la zero și încarcă datele de probă |
| S3 | Conturile: Entra ID (OpenID Connect) și conturile locale, rolurile, oprirea conturilor locale în producție | intrarea cu un cont de probă; testul care arată că producția refuză conturile locale |
| S4 | Netlify: previzualizarea pe PR, site-ul de test din `main`, banda „Mediu de probă”, conturile de probă, butonul „Ce lipsește?” | adresa de previzualizare pe PR; site-ul de test pentru colegi |
| S5 | Jurnalul, registrul comun, stratul de stocare, setarea instituției | jurnalul nu se poate modifica din bază; fișierele trec prin strat |
| S6 | Drumul actului și registratura 0.1, poarta de publicare (fără anonimizarea automată) | un act înregistrat, repartizat, emis, cu urma în jurnal |
| S7 | Imaginea Docker și ghidul de instalare în Azure pentru firma de IT a primăriei | imaginea pornește local cu `docker run` |

La pasul S4 autorul își face singur conturile Netlify și Neon. Pașii exacți îi primește atunci; adresa bazei se pune direct în setările Netlify, niciodată în conversație sau în depozit.

## 9. Întrebări pentru autor

1. **Accesul la bază**: Drizzle (propunerea mea: SQL vizibil, ușor) sau Prisma (mai cunoscut, dar mai greu și cu motor separat)?
2. **Bazele Neon**: două ramuri, `previzualizare` și `test` (propunerea mea), sau una singură pentru tot, cum era în cerința inițială? Cu una singură, fiecare PR șterge ce au încercat colegii pe site-ul de test.
3. **Observațiile din „Ce lipsește?”**: într-un tabel pe care refacerea nu îl atinge, citit de autor din aplicație (propunerea mea), sau ca tichete GitHub, cu un token pus în setările Netlify?
4. **Ecranele**: CSS propriu, simplu, sau Tailwind cu o bibliotecă de componente?
5. **Producția**: Azure Container Apps (propunerea mea) sau Azure App Service pentru containere? Hotărăște, în final, firma de IT a primăriei.
6. **Imaginea pentru producție**: o construiește firma de IT a primăriei din codul sursă predat, sau o publică autorul la fiecare versiune, iar administratorul o preia?
7. **Numele afișat**: „Petra” singur sau „Petra — [numele instituției]”, din setare?
