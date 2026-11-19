import { ROLURI, type Rol } from "@/domeniu/roluri";
import { esteMediuDeProba } from "@/domeniu/mediu";

export default function Intrare() {
  if (!esteMediuDeProba()) {
    return <p>Intrarea se face cu contul Microsoft al instituției.</p>;
  }
  return (
    <>
      <h1>Intrarea în mediul de probă</h1>
      <p className="slab">
        Alegeți un rol de probă. Toate datele de aici sunt inventate; nu introduceți date reale.
      </p>
      <div className="grila">
        {(Object.keys(ROLURI) as Rol[]).map((cheie) => (
          <form key={cheie} action="/intrare" method="get" className="card">
            <h3>{ROLURI[cheie]}</h3>
            <input type="hidden" name="rol" value={cheie} />
            <button className="buton" type="submit">
              Intru ca {ROLURI[cheie].toLowerCase()}
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
