# Utilizatorii, rolurile și drepturile

## Entitățile

Petru poate servi mai multe entități, fiecare cu datele ei: **primăria** și **serviciul de salubrizare** (formă juridică distinctă). Utilizatorii, rolurile și compartimentele aparțin unei entități. Un administrator vede și schimbă numai entitatea lui.

> Documentele și importurile sunt izolate și în bază (securitate la nivel de rând, migrarea `0004`); vezi [`registratura.md`](registratura.md). Celelalte tabele sunt izolate în aplicație.

## Drepturile (funcționalitățile)

Lista drepturilor e în cod, în `src/domeniu/permisiuni.ts`, ca fiecare să aibă un sens clar și să fie testat. Exemple: „Înregistrează documente”, „Vede documentele compartimentului său”, „Aprobă publicarea”, „Administrează utilizatorii”.

Unele drepturi sunt **pe compartiment**: un funcționar cu rolul dat pentru Urbanism vede și lucrează numai documentele Urbanismului.

## Rolurile predefinite

| Rolul | Pe scurt |
|---|---|
| Administratorul aplicației | conturile, rolurile, setările, jurnalul |
| Primarul în funcție | vede tot, semnează răspunsurile, hotărăște prelungirea termenelor, aprobă publicarea |
| Viceprimarul | atribuțiile delegate |
| Secretarul general | repartizează, contrasemnează răspunsurile și dispozițiile, consiliul local, aprobă publicarea, ține registrele cererilor |
| Registratura | înregistrează și repartizează; nu deschide răspunsurile compartimentelor |
| Responsabilul cu petițiile și informațiile publice | ține registrele petițiilor și ale cererilor 544 și rapoartele; vede numai documentele care sunt cereri |
| Funcționarul de compartiment | lucrează documentele compartimentului său |
| Consilierul local | vede materialele ședințelor |

Administratorul poate schimba drepturile oricărui rol și poate crea roluri noi. Orice schimbare intră în jurnal.

## Intrarea

- **Producție:** numai cu contul Microsoft al instituției (Entra ID, OpenID Connect cu PKCE). Intră numai cine a fost creat de administrator în Petru: la prima intrare, contul se leagă după adresa de e-mail, apoi după identificatorul Entra.
- **Mediile de probă:** conturi de probă, câte unul pe funcție, fără parole. Sunt refuzate din cod în producție.
- **Sesiunea:** un cookie semnat, valabil 8 ore. Drepturile se citesc din bază la fiecare cerere, deci o retragere de rol are efect imediat.

## Reguli de siguranță

- Un administrator nu își poate opri propriul cont și nu își poate schimba singur rolurile.
- Rolurile și compartimentele se verifică să aparțină entității administratorului.
