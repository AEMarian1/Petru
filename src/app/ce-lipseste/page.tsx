import { utilizatorulCurent } from "@/autentificare/utilizator";
import Formular from "./Formular";

export default async function CeLipseste() {
  const u = await utilizatorulCurent();
  return (
    <>
      <h1>Ce lipsește?</h1>
      <p className="slab">Scrieți ce v-ar trebui în aplicație. Observațiile nu se șterg la refacerea datelor de probă.</p>
      <Formular rol={u ? u.roluri.map((r) => r.nume).join(", ") : "neautentificat"} />
    </>
  );
}
