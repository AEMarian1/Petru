# Petra — regulile depozitului

Petra este aplicația pentru primării și instituții publice. Prima instalare este la o primărie de comună. Numele localității, al județului și al instituției sunt **setări**, nu se scriu în cod, în teste sau în texte fixe ale ecranelor.

Răspunsurile către autor se scriu în limba română.

## 1. Cine scrie codul și cu ce

- Codul îl scrie autorul, în nume propriu, din resurse proprii: echipamentul lui și abonamentele plătite din salariul lui (Claude, GitHub, Netlify, Neon).
- Primăria nu plătește nimic din ce folosește autorului la scris. Autorul nu plătește nimic din ce rulează cu date reale. Împărțirea completă: [`docs/impartirea.md`](docs/impartirea.md).

## 2. De la zero

- Petra pornește de la zero, la 19.11.2026. Nu intră în depozit nimic din **Sfera** și nimic din depozitul anterior **`primaria-sanpetru`**: nici cod, nici fișiere, nici șabloane, nici date, nici fragmente copiate „doar ca model”.
- Din documentele anterioare ale autorului s-au luat numai ideile și regulile, scrise din nou. Evidența: [`docs/provenienta.md`](docs/provenienta.md).
- Dacă o sarcină pare să ceară cod din Sfera sau din `primaria-sanpetru`, Claude se oprește și întreabă autorul.

## 3. Licența

- Autorul păstrează dreptul de autor asupra codului.
- Primăria primește o licență **gratuită, pe viață, irevocabilă, neexclusivă, cu codul sursă**, acceptată prin hotărâre a consiliului local.
- Nota de autor: [`docs/nota-de-autor.md`](docs/nota-de-autor.md).

## 4. Rolurile se scriu pe funcții

- În cod, în documente, în teste și în texte se scriu funcțiile, nu persoanele: „primarul în funcție”, „secretarul general”, „administratorul aplicației”, „responsabilul cu protecția datelor”.
- Niciun nume de persoană reală în cod, în date de probă sau în exemple.

## 5. Nicio dată reală

- **Nicio dată reală** în depozit, în teste, în previzualizări, pe site-ul de test sau în conversațiile cu Claude. Numai date inventate și exemple anonimizate, aprobate de primărie după procedura ei.
- Datele inventate nu trebuie să aparțină unor persoane reale. Numele, adresele, telefoanele și CNP-urile de probă se generează, nu se copiază de nicăieri, și sunt marcate în aplicație ca date de probă.
- Dacă într-o conversație apare o dată reală (un nume, un CNP, un act scanat), Claude nu o folosește, nu o scrie în depozit și îi spune autorului.

## 6. Nicio parolă, nicio cheie

- Nicio parolă, cheie, token sau adresă de bază de date cu parolă în depozit **și nici în conversația cu Claude**.
- Secretele se pun numai în locul lor: setările Netlify, setările Neon, secretele GitHub, Azure Key Vault pe contul primăriei.
- În depozit stau numai exemple fără valori: `.env.example`, cu nume de variabile și valori inventate.
- Dacă autorul lipește din greșeală un secret în conversație, Claude îi spune să-l schimbe imediat și nu îl scrie nicăieri.

## 7. Rețelele sociale

- Aplicația nu citește, nu colectează și nu analizează comentariile cetățenilor de pe rețelele sociale. Claude nu construiește astfel de funcții și nu le propune.

## 8. O sesiune = o lucrare

- Fiecare sesiune cu Claude face o singură lucrare, pe o ramură proprie, cu un PR propriu.
- Pe `main` se ajunge numai prin PR. Fără împingeri directe pe `main` după primul commit.
- Mesajele de commit și descrierile PR se scriu în română și spun ce s-a schimbat și de ce.

## 9. Verificări automate economice

Depozitul e privat, deci minutele GitHub Actions sunt limitate.

- Verificările rulează numai pe PR și pe `main`, nu pe fiecare ramură.
- O execuție nouă o anulează pe cea veche a aceluiași PR (`concurrency` cu `cancel-in-progress`).
- Se folosesc cache-urile de dependențe, limite de timp scurte și filtre pe căi (modificările numai în `docs/` nu pornesc testele).
- Fără matrice de versiuni sau de sisteme de operare, dacă nu e nevoie.

## 10. Arhitectura

Arhitectura și mediile (previzualizare, site de test, producție): [`docs/arhitectura.md`](docs/arhitectura.md), după ce e aprobată de autor.
