# Ceasul termenelor, petițiile și Legea 544 (0.1.1)

Ce adaugă versiunea 0.1.1 peste Registratura 0.1 ([`registratura.md`](registratura.md)). Numai funcții și reguli, fără nume și fără date ale cetățenilor. Textele de lege nu au fost citite pe forma oficială (`legislatie.just.ro` nu e permis în rețeaua sesiunilor). Tot ce e marcat „de confirmat” se verifică de jurist.

## Ceasul termenelor: un serviciu comun

Ceasul ține termenul legal al unui act. Pașii de pe drumul actului îl pornesc, îl prelungesc sau îl opresc. Azi îl folosesc registratura, petițiile și cererile 544. Mai târziu îl vor folosi comunicarea hotărârilor la prefect, consultarea pe Legea 52, avizele și termenele din contracte.

| Ce | Unde |
|---|---|
| Regulile (termen, prelungire, termene intermediare, temei, „de confirmat”) | `src/domeniu/termene.ts` |
| Calendarul: zile lucrătoare, sărbători legale, Paștele ortodox | `src/domeniu/calendar.ts` |
| Ceasul: pornire, prelungire, oprire, stare, termene intermediare | `src/domeniu/ceas.ts` |
| Ceasurile în bază | tabelul `petru.ceasuri`, `src/baza/ceasuri.ts` |
| Pagina regulilor și a sărbătorilor, pentru verificare | `/termene` |

Cum se socotește:

- Termenul curge de la data înregistrării. Ziua de pornire nu se socotește.
- **Zilele lucrătoare** sar peste sâmbete, duminici și sărbătorile legale din Codul muncii, art. 139: 1–2 și 6–7 ianuarie, 24 ianuarie, Vinerea Mare, Paștele (două zile), 1 mai, 1 iunie, Rusaliile (două zile), 15 august, 30 noiembrie, 1 decembrie, 25–26 decembrie. Paștele se calculează după calendarul ortodox. Zilele libere „punte” nu se scad.
- **Zilele calendaristice:** un termen care cade într-o zi nelucrătoare **nu se mută**. Petru arată termenul strict, care e mai prudent, și o notă. Mutarea pe următoarea zi lucrătoare rămâne o întrebare pentru jurist (J13).
- Ceasul răspunsului dă și termenul documentului din registru (`documente.termen`), deci listele și panoul arată termenul prelungit.
- Ceasul se oprește când pleacă ieșirea sau când cererea e redirecționată, clasată ori conexată. La oprire se vede dacă actul s-a rezolvat în termen.

## Regulile pentru petiții și cereri 544

| Regula | Termenul | Prelungirea | Termene intermediare | Temeiul |
|---|---|---|---|---|
| Petiție | 30 de zile | +15 zile, o singură dată, hotărâtă înainte de termen de conducătorul instituției | redirecționarea petiției greșit îndreptate: 5 zile, cu înștiințarea petiționarului (de confirmat) | OG 27/2002, art. 6, 8, 9 |
| Cerere 544 | 10 zile | până la 30 de zile, o singură dată, cu înștiințarea solicitantului **în primele 10 zile** | refuzul motivat: 5 zile; redirecționarea: 5 zile (de confirmat) | Legea 544/2001, art. 7 |
| Reclamația administrativă 544 | 15 zile de la primire | — | — | Legea 544/2001, art. 21–22 (de confirmat) |

Petru nu lasă prelungirea după limita ei, a doua prelungire sau prelungirea unui termen pe care legea nu-l prelungește. Prelungirea cere motivul și ține minte cum a fost înștiințat solicitantul.

## Registrele petițiilor și ale cererilor 544

O cerere e un document din registrul de intrare-ieșire, nu un registru paralel. Tabelul `petru.cereri` ține ce e specific: felul, solicitantul, soluția, redirecționarea, conexarea, reclamația și plângerea în instanță.

| Pasul | Cine | Ce face Petru |
|---|---|---|
| **Felul** (petiție / 544 / niciuna) | compartimentul care lucrează documentul, registratura, responsabilul, secretarul general | La import, felul se pune singur când tipul e recunoscut sigur. Altfel, se alege din fișă și ceasul pornește după legea aleasă. Felul se schimbă numai până la soluție și până la prelungire. |
| **Prelungirea** | **propune** compartimentul (sau responsabilul), cu motivul; **hotărăște** conducătorul instituției | Termenul se mută numai la hotărâre, după regulile de mai sus; data hotărârii trebuie să fie în limita legii. Conducătorul poate respinge propunerea. Propunerile așteaptă pe panoul conducătorului. |
| **Redirecționarea** | registratura, biroul, responsabilul | instituția competentă și, opțional, numărul adresei de ieșire. Ieșirea se leagă de cerere. După 5 zile se marchează „după cele 5 zile”. |
| **Conexarea** | biroul, responsabilul | Aceeași problemă, același solicitant: cererea se leagă de cererea de bază și primește același răspuns. Se conexează numai cereri de același fel. |
| **Clasarea** | biroul, responsabilul | Cu motiv: de pildă, o petiție anonimă sau fără date de identificare (OG 27/2002, art. 7), ori trimisă din nou după răspuns. |
| **Semnarea** | conducătorul semnează, secretarul general contrasemnează | Răspunsul redactat de compartiment ajunge „la semnat”. Ieșirea unei petiții sau a unei cereri 544 se poate înregistra numai după ambele semnături. Răspunsul întors în lucru își pierde semnăturile. Panoul conducerii arată ce e de semnat. |
| **Răspunsul** | biroul, registratura | Ieșirea cere soluția: favorabilă sau nefavorabilă la petiții; la Legea 544, comunicată, parțial, respinsă ca exceptată sau ca inexistentă. |
| **Reclamația administrativă** (544) | responsabilul | După un refuz, un răspuns parțial sau lipsa răspunsului. Pornește ceasul de 15 zile; apoi se scrie soluția (admisă sau respinsă) și eventuala plângere în instanță. |

Redirecționarea, clasarea și conexarea închid cererea fără răspuns în fond. Drumul actului permite acum trecerea **înregistrat / repartizat → arhivat** pentru aceste cazuri. Emiterea și publicarea nu se marchează ca făcute.

## Rapoartele

Rapoartele conțin numai numere, fără date personale. Se văd la `/cereri/raport` și se tipăresc din browser.

- **Petițiile, pe semestru:**
  - câte au venit, pe canal: pe hârtie sau electronic;
  - soluțiile: favorabile, nefavorabile, redirecționate, clasate, conexate;
  - câte s-au rezolvat în termen și câte după termen;
  - câte au fost prelungite, câte sunt în lucru și câte au termenul depășit;
  - împărțirea pe compartimente.
- **Legea 544, pe an:**
  - câte cereri au venit, pe solicitant (persoană fizică sau juridică) și pe canal;
  - soluțiile;
  - răspunsurile în 10 zile, în 11–30 de zile și după termen;
  - refuzurile comunicate după 5 zile;
  - reclamațiile (admise, respinse, în lucru) și plângerile în instanță;
  - împărțirea pe compartimente.

Structura exactă a raportului semestrial (OG 27/2002) și a raportului anual (anexa normelor Legii 544) e de confirmat de jurist (J3).

## Cine vede

| Rolul | Registrele cererilor | Fișa |
|---|---|---|
| Conducerea (vede tot) | da, cu rapoartele | întreagă |
| Responsabilul cu petițiile și informațiile publice (rol nou) | da, toate, cu rapoartele; ține reclamațiile pe Legea 544 | numai documentele care sunt cereri, cu urma pașilor |
| Secretarul general | da (are acum și dreptul `cereri.gestioneaza`) | întreagă |
| Registratura | nu vede registrele | fișa de înregistrare; poate stabili felul și redirecționa |
| Funcționarul de compartiment | **cererile compartimentului său, cu raportul lor** | cererile compartimentului; stabilește felul, ține termenul (prelungește), răspunde, clasează, conexează, redirecționează |

**Cum se lucrează azi (răspunsul autorului, 20.11.2026):** petiția o ține fiecare compartiment: el ține termenul și dă răspunsul. Nu există un registru central al petițiilor ținut de o singură persoană. Prelungirea o stabilește conducătorul; răspunsul (sau înștiințarea) îl redactează compartimentul și îl semnează conducătorul și secretarul general. De aceea, în Petru, registrul petițiilor e o vedere peste registrul de intrare-ieșire: fiecare compartiment își vede petițiile; conducerea și responsabilul le văd pe toate, pentru raportul semestrial.

## Izolarea în bază

`ceasuri` și `cereri` au securitate la nivel de rând, ca documentele (migrarea `0005`). O cheie străină compusă (document, entitate) oprește legarea de documentul altei entități. Testele sunt în `src/baza/cereri.db.test.ts`.

## Întrebări pentru jurist (noi)

| Nr. | Întrebarea |
|---|---|
| J13 | Un termen în zile calendaristice care cade într-o zi nelucrătoare se mută pe următoarea zi lucrătoare (ca la art. 181 din Codul de procedură civilă) sau rămâne? Petru îl lasă acum neschimbat. |
| J14 | Termenul de 5 zile pentru redirecționare: OG 27/2002, art. 6 alin. (3) și normele Legii 544. Curge de la înregistrare? |
| J15 | Prelungirea petiției (OG 27/2002, art. 9): cere o înștiințare a petiționarului și până când se hotărăște? |
| J16 | Reclamația administrativă pe Legea 544 (art. 21–22): 30 de zile pentru depunere și 15 zile pentru răspuns, în forma la zi? |
| J17 | Lista sărbătorilor legale din Codul muncii, art. 139, în forma la zi. |

## Ce rămâne

- Regulile de termen stau azi în cod, cu temei și „de confirmat”. Când juristul le confirmă, se mută în setările entității, ca să se poată schimba fără o versiune nouă.
- Ceasul pentru comunicarea hotărârilor și a dispozițiilor la prefect, pentru Legea 52 și pentru avize (0.2).
- Secțiunea de informații publice din oficiu (art. 5 din Legea 544), generată din registre (0.2, împreună cu poarta de publicare).
- Notificările (e-mail) la termenele care se apropie.
