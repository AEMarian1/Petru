# Consiliul local (0.2)

Descrierea modulului după răspunsurile autorului din 20.11.2026. Numai funcții, fără nume și fără date reale. Textele de lege nu au fost citite pe forma oficială (`legislatie.just.ro` nu e permis în rețeaua sesiunilor): tot ce e marcat „de confirmat” se verifică de jurist.

## Cum se lucrează azi

| Întrebarea | Răspunsul |
|---|---|
| Cine inițiază | primarul; referatul / raportul de specialitate îl redactează compartimentul de specialitate |
| Cum circulă proiectul până la ședință | pe e-mail |
| Comisiile de specialitate | cinci; fiecare dă **aviz scris** |
| Anunțul pe Legea 52 | pe site și în Monitorul Oficial Local; îl face biroul **Administrație publică**, care adună și propunerile |
| Ordinea de zi și convocatorul | le face secretarul general; materialele ajung la consilieri pe e-mail |
| Votul și procesul-verbal | vot deschis; procesul-verbal îl redactează Administrație publică, îl semnează secretarul general |
| Numerotarea hotărârilor | secretarul general, registru separat de dispoziții, numerotare pe an |
| Comunicarea la prefect | secretarul general, pe hârtie, prin curier |
| Publicarea în MOL | secretarul general, pe platforma CityOn |
| Semnătura pe hotărâre | președintele de ședință semnează, secretarul general contrasemnează (ca în lege) |
| Ce încurcă cel mai tare | **termenele** (prefect, Legea 52, procesul-verbal) și **registrele și MOL**, făcute de mână, de două ori |

## Ce face Petru

Proiectul de hotărâre e un document din registrul de intrare-ieșire (cu numărul dat de registrul oficial, SOBIS) și merge pe **drumul actului**: repartizat (la compartiment, pentru raport) → în lucru → la semnat (după vot) → emis (semnat și contrasemnat) → publicat. Respins sau retras → arhivat. Pașii lui se fac din Consiliul local; registratura îl vede și trimite la el.

| Pasul | Cine | Ce verifică Petru |
|---|---|---|
| **Inițierea** | primarul (drept nou `consiliu.initiaza`) sau secretariatul, în numele inițiatorului | numărul de înregistrare e liber; primește numărul din **registrul proiectelor** (pe an) |
| **Referatul, raportul, avizul de legalitate** | inițiatorul; compartimentul de specialitate (își vede proiectele în Consiliul local); secretarul general | datele nu sunt înainte de înregistrare |
| **Avizele comisiilor** | secretariatul trimite la comisii și scrie avizul primit (favorabil, cu amendamente, nefavorabil) | votul cere toate avizele comisiilor sesizate; avizul e consultativ |
| **Legea 52** (normative) | secretariatul: anunțul (data, unde), propunerile primite (numai rezumatul), excepția de urgență cu motiv | două ceasuri de **așteptare**: propunerile (10 zile) și supunerea spre aprobare (30 de zile lucrătoare). Proiectul normativ **nu intră pe ordinea de zi și nu se votează** înainte |
| **Ședința** | secretariatul și secretarul general: data, tipul (ordinară, extraordinară, de îndată), consilierii în funcție, convocarea, materialele trimise | data plauzibilă (și în bază: nu 0001, nu 9999); avertizare la convocarea târzie (5 / 3 zile, de confirmat) |
| **Ordinea de zi** | secretariatul | referatul și raportul există; Legea 52 îndeplinită la data ședinței |
| **Prezența și votul** | secretariatul | cvorumul (majoritatea celor în funcție); rezultatul se potrivește cu pragul majorității alese (simplă, absolută, două treimi); voturile nu depășesc prezenții |
| **Hotărârea** | — | proiectul aprobat primește numărul din **registrul hotărârilor** (pe an) și pornește **ceasul la prefect** (10 zile lucrătoare) |
| **Semnăturile** | secretariatul consemnează semnătura președintelui de ședință; secretarul general contrasemnează | cu amândouă, hotărârea e emisă |
| **Comunicarea la prefect** | secretarul general (secretariatul) | numai hotărârea emisă; adresa de înaintare e o ieșire din registru, legată de proiect; ceasul se oprește; apoi dovada primirii |
| **Publicarea** | primarul sau secretarul general aprobă; secretariatul sau secretarul verifică copia anonimizată; secretarul publică pe platforma MOL și scrie data | poarta de publicare (`poatePublica`): emisă, aprobată, cu copie anonimizată. **Petru nu publică singur** |
| **Procesul-verbal** | redactat (Administrație publică), semnat (secretarul general), aprobat în ședința următoare, afișat și publicat | în ordine; aprobarea pornește **ceasul publicării** (3 zile lucrătoare, de confirmat) |

**Registrele** (proiecte, hotărâri, procese-verbale) se fac din aceleași date, la `/consiliu/registre`, cu export CSV (UTF-8, „;”) pentru încărcarea pe platforma MOL.

**Panoul** secretariatului și al secretarului general arată: hotărâri de comunicat la prefect (cu termenul depășit), procese-verbale de publicat, proiecte în consultare, hotărâri de semnat și de contrasemnat, hotărâri nepublicate, proiecte fără raport.

## Drepturile și rolurile

- Drept nou **`consiliu.initiaza`**, dat primarului.
- Rol nou **„Secretariatul consiliului local”** (`consiliu.gestioneaza`, `consiliu.vede`), pentru biroul Administrație publică.
- Secretarul general păstrează `consiliu.gestioneaza`; contrasemnătura, avizul de legalitate și semnarea procesului-verbal cer `documente.contrasemneaza`.
- Consilierii văd tot, fără butoane; compartimentul de specialitate își vede numai proiectele lui și scrie raportul; registratura nu vede modulul.

## În bază

Migrarea `0007`: tabelele `comisii`, `sedinte`, `proiecte_hotarare`, `avize_comisii`, `propuneri_l52`, cu **securitate la nivel de rând** și chei străine compuse (id, entitate), ca la documente. Ceasul termenelor ține acum de un document **sau** de o ședință (termenul procesului-verbal). Testele: `src/domeniu/consiliu.test.ts`, `src/baza/consiliu.db.test.ts`.

Datele de probă (cinci comisii, patru ședințe, douăsprezece proiecte în toate stadiile) se încarcă prin aceleași funcții ca în aplicație, deci trec prin aceleași verificări (`src/baza/consiliu-proba.ts`).

## Propuneri (unde autorul nu a știut sau legea nu a fost citită)

- Comisiile sunt o **setare** a entității (număr, nume, domeniu); cele cinci de probă au nume generice.
- Convocarea o face, după lege, primarul prin dispoziție; Petru ține numărul convocatorului sau al dispoziției, pregătit de secretarul general.
- Majoritatea cerută se alege pe proiect; Petru nu o deduce din titlu.
- Hotărârile individuale trec și ele prin poartă; ce se publică integral, anonimizat sau deloc rămâne lista de poziție J11.

## Întrebări pentru jurist (în continuarea listei J din `termene.md`)

| Nr. | Întrebarea |
|---|---|
| J19 | Art. 197 alin. (1) din Codul administrativ: comunicarea la prefect în **10 zile lucrătoare de la adoptare** (sau de la semnare)? Legat de J1. |
| J20 | Art. 138: procesul-verbal se afișează și se publică în **3 zile lucrătoare de la aprobare** (sau de la ședință)? |
| J21 | Legea 52/2003, art. 7: cele 30 de zile lucrătoare sunt înainte de „supunerea spre analiză, avizare și adoptare”. Avizele comisiilor trebuie și ele după cele 30 de zile? Cum se motivează excepția de urgență (alin. (13)) și se leagă de ședința de îndată? |
| J22 | Art. 134 alin. (3): convocarea cu 5 / 3 zile (calendaristice?) înainte; cine convoacă (primarul prin dispoziție) și cine pregătește? |
| J23 | Art. 5 și 139: majoritățile pe tipuri de hotărâri (bugetul, patrimoniul, două treimi); votul secret la persoane. |
| J24 | Art. 140: ce se face când președintele de ședință refuză semnătura sau secretarul general refuză contrasemnătura (obiecțiile de legalitate)? |
| J25 | Anexa 1 a Codului administrativ: coloanele exacte ale registrelor proiectelor, hotărârilor și proceselor-verbale din MOL. |
| J26 | Art. 136: termenul de redactare a raportului de specialitate; avizul de legalitate al secretarului general pe proiect e obligatoriu înainte de ședință? |
| J27 | Art. 199: comunicarea hotărârilor individuale către persoanele vizate (termen, de la comunicarea către prefect?). Se publică sau doar se comunică? |

## Ce rămâne

- Atașarea fișierelor (referatul, raportul, avizele, copia anonimizată) prin stratul de stocare; azi se scriu datele, nu fișierele.
- Trimiterea materialelor către consilieri din Petru (e-mail), cu dovada trimiterii.
- Șabloanele (referat, raport, hotărâre, convocator, proces-verbal).
- Comunicarea hotărârilor individuale către persoanele vizate (J27); dispozițiile primarului, pe același drum.
- Exportul direct spre platforma MOL, dacă furnizorul dă un import sau o interfață (A3).
