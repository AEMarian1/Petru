# Execuția bugetară 2020–2026, din datele publice

**Sursa:** rapoartele lunare ANAF (Forexebug, raportul de execuție EXB-901), adunate pe `executii-bugetare.g4d.ro`. Sumele sunt **realizări** (încasări și plăți) cumulate pe an, în lei, nu prevederi bugetare. Anul 2026 e parțial, până la luna 10.

Foaia de calcul completă (pe capitole, pe rânduri și pe luni, cu legăturile la rapoartele ANAF) nu stă în depozit. Autorul o are separat.

## Totalurile

| Anul | Execuția la | Venituri realizate | Cheltuieli realizate |
|---|---|---|---|
| 2020 | 12.2020 | 15.109.020,66 | 13.586.099,96 |
| 2021 | 12.2021 | 16.346.425,07 | 15.622.715,36 |
| 2022 | 12.2022 | 21.985.325,10 | 21.498.295,53 |
| 2023 | 12.2023 | 29.349.185,62 | 23.018.501,85 |
| 2024 | 12.2024 | 33.595.260,70 | 38.894.616,67 |
| 2025 | 12.2025 | 46.042.165,19 | 49.314.991,45 |
| 2026 | 10.2026 | 93.245.067,06 | 71.705.848,42 |

**De verificat:** în 2026, veniturile cresc mult din „Subvenții de la bugetul de stat (42)”, cu aproximativ 43,7 milioane, iar cheltuielile cresc la „Învățământ secundar inferior”, cu aproximativ 32,7 milioane. Arată a investiții finanțate din fonduri externe. Se confirmă cu compartimentul de contabilitate.

## Cum arată datele

- **Veniturile** sunt grupate pe capitole cu cod: 03, 04, 07, 11, 16, 18, 30, 33, 34, 35, 36, 37, 39, 40, 42, 43, 48. Fiecare capitol are rânduri de detaliu.
- **Cheltuielile** sunt grupate pe subcapitole funcționale (autorități executive, străzi, salubritate, învățământ, asistență socială etc.). Fiecare are rânduri pe natura cheltuielii: salarii, bunuri și servicii, construcții, reparații.
- Fiecare lună are **raportul ANAF** în format xlsx și pdf, cu o adresă stabilă.

## Ce ne spune pentru Petru (modulul „Bugetul și investițiile”, versiunea 0.3)

1. **Datele vin din raportul EXB-901**, nu se introduc de mână. Petru importă fișierul xlsx lunar, același pentru orice primărie, și păstrează legătura la raportul original.
2. **Modelul de date:** anul, luna, partea (venituri sau cheltuieli), capitolul (cod și denumire), rândul, suma. Codurile de capitol sunt cheia de grupare.
3. **Panoul cabinetului** arată: realizările pe an față de anul trecut, capitolele mari și investițiile pe obiective (legate de achiziții și de contracte).
4. **Prevederile** (bugetul aprobat și rectificările) vin din hotărârile de consiliu despre buget, nu din raportul de execuție. Pentru gradul de realizare trebuie ambele.
