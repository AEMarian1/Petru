# Registratura 0.1

Descrierea modulului după răspunsurile autorului din 20.11.2026. Numai funcții, fără nume și fără date ale cetățenilor.

## Cum se lucrează azi

| Întrebarea | Răspunsul |
|---|---|
| Ce intră | hârtie la ghișeu, poștă și curier, e-mail, platforme online |
| Numerotarea | un registru unic pe an, pentru intrări și ieșiri |
| Repartizarea | registratura trimite direct la birou, după tipul documentului, fără rezoluție |
| Cu ce se ține registrul | modulul de registratură din SOBIS |
| Ieșirea | răspunsul primește **un număr nou** de ieșire, legat de intrare |
| Cine vede un document repartizat | biroul și conducerea (primarul, secretarul general); registratura vede numai fișa de înregistrare |
| Ce încurcă | termenele depășite; nu se știe unde e actul după repartizare; răspunsul, data trimiterii și confirmarea de primire nu stau lângă cerere |

## Ce face Petru la 0.1

Autorul a ales **importul din SOBIS**: registrul oficial rămâne în SOBIS, cu numerele lui. Petru citește exportul CSV și adaugă ce lipsește azi.

| Ce | Cum |
|---|---|
| **Importul** | Registratura încarcă exportul CSV. Petru îl verifică întâi (coloanele înțelese, rândurile cu erori, primele rânduri), apoi îl aplică numai la confirmare. Un număr deja importat se actualizează; mersul lui în Petru rămâne. Același fișier aplicat de două ori e semnalat (amprenta SHA-256). |
| **Termenele** | Se calculează după lege, pe tipul documentului (`src/domeniu/termene.ts`): petiții 30 de zile, Legea 544 10 zile, certificatul de urbanism, certificatul fiscal ș.a. Tipul se recunoaște din tip sau din conținut; când nu se recunoaște, termenul e 30 de zile și apare „de verificat”. Dacă exportul are termen, se păstrează cel din export. |
| **Unde e actul** | Biroul scrie mersul în Petru: preia în lucru, răspunsul e la semnat, clasează fără răspuns (cu motiv). Registratura sau secretarul pot repartiza ori redirecționa. Fiecare pas intră în jurnal. |
| **Ieșirea și confirmarea** | Registratura (sau biroul) scrie ieșirea: numărul nou din SOBIS, data, cum a plecat, destinatarul. Ieșirea se leagă de intrare, iar intrarea trece la „emis”. Apoi se scrie data confirmării de primire. Ieșirile din export cu „răspuns la nr.” se leagă singure. |
| **Panoul** | Termene depășite, termene care scad în 3 zile, documente fără răspuns, ieșiri fără confirmare: pe vederea fiecăruia. |

## Cine ce vede

| Rolul | Lista | Fișa | Pași |
|---|---|---|---|
| Primarul, viceprimarul, secretarul general | toate documentele entității | întreagă, cu urma pașilor | secretarul: repartizează |
| Funcționarul de compartiment | numai compartimentul lui | întreagă, cu urma pașilor | preia, la semnat, clasează, ieșirea, confirmarea |
| Registratura | toate, ca fișă de înregistrare | fără urma pașilor din birou | importul, repartizarea, ieșirea, confirmarea |

## Izolarea entităților în bază

Primăria și serviciul de salubrizare au registre separate. Documentele și importurile au entitatea pe fiecare rând, iar **baza** oprește accesul la rândurile altei entități (securitate la nivel de rând, migrarea `0004`):

- aplicația lucrează pe aceste tabele în rolul `petru_aplicatie`, într-o tranzacție cu entitatea utilizatorului (`src/baza/entitate.ts`);
- fără entitate, rolul nu vede nimic; nu poate scrie rânduri pentru altă entitate și nu poate ocoli regula;
- testele din `src/baza/registratura.db.test.ts` verifică toate trei.

## Datele modulului (pe scurt)

| Ce | Exemplu |
|---|---|
| **Nevoia** | răspuns în termen și urma fiecărui document |
| **Datele pe care le scrie** | mersul documentului, ieșirea, expedierea, confirmarea; importurile |
| **Datele pe care le citește** | exportul registrului din SOBIS; compartimentele |
| **Indicatorii** | termene depășite, apropiate, documente fără răspuns, ieșiri fără confirmare |
| **Temeiul** | OG 27/2002; Legea 544/2001; termenele speciale, de confirmat de jurist |

## Coloanele exportului

Coloanele exacte ale exportului SOBIS nu sunt încă știute. Autorul revine cu ele (numai **numele coloanelor**, fără rânduri cu date). Până atunci, Petru recunoaște coloanele după sinonime (`src/domeniu/import-registru.ts`): obligatorii sunt numărul, data, emitentul și conținutul; opționale compartimentul, termenul, tipul, sensul (intrare/ieșire), canalul, „răspuns la nr.” și destinatarul. Când vin numele exacte, se adaugă în lista de sinonime.

Exportul poate fi în UTF-8 sau în Windows-1250. Pe site-ul de test se folosește numai fișierul inventat `public/exemple/registru-proba.csv`.

## Ce rămâne pentru pașii următori

- Numele exacte ale coloanelor din exportul SOBIS.
- Înregistrarea direct în Petru (fără SOBIS), dacă se hotărăște înlocuirea modulului de registratură.
- Scanările și fișierele atașate (stratul de stocare).
- Legarea emitentului de registrul comun al persoanelor.
- Sărbătorile legale la termenele în zile lucrătoare și prelungirile (OG 27/2002, Legea 544/2001).
- Petițiile și Legea 544 ca registre proprii, cu raportul anual.
