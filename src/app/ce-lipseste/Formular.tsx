"use client";

import { useState } from "react";

export default function Formular({ rol }: { rol: string }) {
  const [stare, setStare] = useState<"gol" | "trimis" | "eroare">("gol");

  async function trimite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = new FormData(e.currentTarget);
    date.set("form-name", "ce-lipseste");
    date.set("rol", rol);
    try {
      const r = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(date as unknown as Record<string, string>).toString(),
      });
      setStare(r.ok ? "trimis" : "eroare");
    } catch {
      setStare("eroare");
    }
  }

  if (stare === "trimis") return <p className="nota">Mulțumim! Observația a ajuns la autor.</p>;

  return (
    <form onSubmit={trimite}>
      <p className="nota">Nu scrieți date reale: nume, CNP-uri, adrese sau acte ale cetățenilor.</p>
      <label htmlFor="pagina">Pe ce pagină ați observat?</label>
      <input id="pagina" name="pagina" type="text" placeholder="de exemplu: Registratura" />
      <label htmlFor="mesaj">Ce lipsește sau ce ar trebui schimbat?</label>
      <textarea id="mesaj" name="mesaj" rows={6} required />
      <p hidden><input name="capcana" /></p>
      <p><button className="buton" type="submit">Trimite</button></p>
      {stare === "eroare" && <p className="nota">Nu s-a putut trimite. Încercați din nou mai târziu.</p>}
    </form>
  );
}
