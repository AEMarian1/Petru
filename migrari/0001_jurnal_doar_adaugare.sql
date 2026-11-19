-- Jurnalul se poate doar completa: modificarea, ștergerea și golirea sunt refuzate de bază.
CREATE FUNCTION "petru"."jurnal_doar_adaugare"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Jurnalul nu se poate modifica sau șterge (%).', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "jurnal_fara_modificare"
  BEFORE UPDATE OR DELETE ON "petru"."jurnal"
  FOR EACH ROW EXECUTE FUNCTION "petru"."jurnal_doar_adaugare"();
--> statement-breakpoint
CREATE TRIGGER "jurnal_fara_golire"
  BEFORE TRUNCATE ON "petru"."jurnal"
  FOR EACH STATEMENT EXECUTE FUNCTION "petru"."jurnal_doar_adaugare"();
