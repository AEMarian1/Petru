import { rolulCurent } from "@/componente/sesiune";
import Formular from "./Formular";

export default async function CeLipseste() {
  const rol = await rolulCurent();
  return (
    <>
      <h1>Ce lipsește?</h1>
      <p className="slab">Scrieți ce v-ar trebui în aplicație. Observațiile nu se șterg la refacerea datelor de probă.</p>
      <Formular rol={rol?.nume ?? "neales"} />
    </>
  );
}
