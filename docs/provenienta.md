# Proveniența

## De unde pornește Petra

- Petra este scrisă **de la zero**, începând cu **19.11.2026**, în depozitul `petru`, gol la pornire.
- Primul commit conține numai regulile și documentele. Codul vine după aprobarea arhitecturii.

## Ce NU s-a luat

- **Nimic din Sfera**: nici cod, nici module (inclusiv modulul Primărie), nici structura bazei, nici șabloane, nici date.
- **Nimic din depozitul `primaria-sanpetru`**: nici cod, nici fișiere, nici istorie git. Depozitul `petru` nu este o copie, o ramură sau o continuare a lui.
- **Nicio dată reală** a cetățenilor, a firmelor sau a primăriei.

## Ce s-a luat: numai ideile și regulile, scrise din nou

Sursele sunt două documente ale autorului, scrise de el cu Claude înainte de 19.11.2026: o schiță a programului și o prezentare despre legea, siguranța datelor și furnizorii unei primării digitale. Din ele s-au păstrat numai ideile, reformulate în documentele acestui depozit:

| Ideea | Unde e scrisă acum |
|---|---|
| Codul e al autorului; primăria primește o licență gratuită, pe viață, irevocabilă, cu codul sursă, acceptată prin hotărâre de consiliu | `CLAUDE.md`, `docs/nota-de-autor.md`, `docs/impartirea.md` |
| Primăria plătește ce rulează cu datele ei; nimic nu trece prin contul autorului | `docs/impartirea.md` |
| Rolurile scrise pe funcții: primarul în funcție, administratorul aplicației, al doilea administrator numit prin dispoziție | `CLAUDE.md` |
| La dezvoltare ajung numai date inventate și exemple anonimizate, aprobate de primărie | `CLAUDE.md` |
| Un singur drum al actului, registrul comun, jurnalul, poarta de publicare | `docs/arhitectura.md` |
| PostgreSQL standard, containere, exportul complet al datelor | `docs/arhitectura.md` |
| AI-ul oprit din prima zi, cu cheia și plafonul primăriei | `docs/arhitectura.md` |

## Ce s-a schimbat față de documentele anterioare

- Schița propunea un server în clădirea primăriei; prezentarea, un centru de date în România. Petra are producția în **Microsoft Azure (UE)**, pe contul primăriei.
- Funcționarii intră cu **Entra ID**, contul Microsoft 365 al primăriei.
- Numele localității este o setare, nu se scrie în cod.

## Cum se verifică

- Istoria git a depozitului `petru` arată fiecare modificare, cu data și ora.
- Orice sursă nouă de idei se adaugă în acest fișier, în același PR în care e folosită.
