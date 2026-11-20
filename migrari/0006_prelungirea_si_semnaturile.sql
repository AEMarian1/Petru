ALTER TABLE "petru"."ceasuri" ADD COLUMN "prelungire_propusa_la" date;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD COLUMN "prelungire_propusa_de" uuid;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD COLUMN "prelungit_de" uuid;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "semnat_la" date;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "semnat_de" uuid;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "contrasemnat_la" date;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "contrasemnat_de" uuid;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_prelungire_propusa_de_utilizatori_id_fk" FOREIGN KEY ("prelungire_propusa_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_prelungit_de_utilizatori_id_fk" FOREIGN KEY ("prelungit_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_semnat_de_utilizatori_id_fk" FOREIGN KEY ("semnat_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_contrasemnat_de_utilizatori_id_fk" FOREIGN KEY ("contrasemnat_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Drepturile noi pentru rolul predefinit al secretarului general, în bazele care există deja.
INSERT INTO "petru"."rol_permisiuni" ("rol_id", "permisiune")
  SELECT "id", p FROM "petru"."roluri", unnest(ARRAY['documente.contrasemneaza', 'cereri.gestioneaza']) AS p
  WHERE "cheie" = 'secretar' AND "predefinit"
ON CONFLICT DO NOTHING;
