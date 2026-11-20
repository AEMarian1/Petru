/** Eroarea sau avertizarea întoarsă de un pas (din adresa paginii), arătată deasupra conținutului. */
export function Mesaje({ eroare, atentie }: { eroare?: string; atentie?: string }) {
  return (
    <>
      {eroare && <p className="eroare" role="alert">{eroare.slice(0, 500)}</p>}
      {atentie && <p className="nota" role="status">{atentie.slice(0, 500)}</p>}
    </>
  );
}
