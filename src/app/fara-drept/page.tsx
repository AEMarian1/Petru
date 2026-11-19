import Link from "next/link";

export default function FaraDrept() {
  return (
    <>
      <h1>Nu aveți dreptul pentru această pagină</h1>
      <p>Rolurile dumneavoastră nu includ această funcționalitate. Dacă aveți nevoie de ea, cereți-o administratorului aplicației.</p>
      <p><Link href="/panou">Înapoi la panou</Link></p>
    </>
  );
}
