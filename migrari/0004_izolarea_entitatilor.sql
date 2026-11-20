-- Izolarea entităților în bază (securitate la nivel de rând).
-- Primăria și serviciul de salubrizare au fiecare datele lor. Baza însăși oprește accesul unei
-- entități la documentele celeilalte, nu doar codul aplicației.
--
-- Cum lucrează:
--   * aplicația citește și scrie documentele în rolul „petru_aplicatie” (SET LOCAL ROLE), într-o
--     tranzacție în care a pus entitatea utilizatorului în setarea „petru.entitate”;
--   * rolul „petru_aplicatie” vede și scrie numai rândurile entității din setare; fără setare, nimic;
--   * scripturile de întreținere (refacerea datelor de probă) lucrează ca proprietar al tabelelor,
--     cu „petru.sistem = da”; rolul aplicației nu poate folosi această cale.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'petru_aplicatie') THEN
    CREATE ROLE petru_aplicatie NOLOGIN;
  END IF;
  IF current_setting('server_version_num')::int >= 160000 THEN
    EXECUTE format('GRANT petru_aplicatie TO %I WITH SET TRUE', current_user);
  ELSE
    EXECUTE format('GRANT petru_aplicatie TO %I', current_user);
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "petru" TO petru_aplicatie;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA "petru" TO petru_aplicatie;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "petru" TO petru_aplicatie;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "petru" GRANT SELECT, INSERT, UPDATE ON TABLES TO petru_aplicatie;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "petru" GRANT USAGE, SELECT ON SEQUENCES TO petru_aplicatie;--> statement-breakpoint
CREATE FUNCTION "petru"."entitatea_permisa"(e uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT (e::text = current_setting('petru.entitate', true))
      OR (current_setting('petru.sistem', true) = 'da' AND current_user <> 'petru_aplicatie');
$$;
--> statement-breakpoint
ALTER TABLE "petru"."documente" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."documente" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "documente_entitatea" ON "petru"."documente"
  USING ("petru"."entitatea_permisa"("entitate_id"))
  WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."importuri" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."importuri" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "importuri_entitatea" ON "petru"."importuri"
  USING ("petru"."entitatea_permisa"("entitate_id"))
  WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));
