CREATE TYPE "petru"."canal_intrare" AS ENUM('ghiseu', 'posta', 'email', 'platforma');--> statement-breakpoint
CREATE TYPE "petru"."mod_expediere" AS ENUM('posta', 'email', 'ghiseu', 'platforma');--> statement-breakpoint
CREATE TYPE "petru"."stare_import" AS ENUM('verificat', 'aplicat', 'renuntat');--> statement-breakpoint
CREATE TYPE "petru"."sursa_document" AS ENUM('petru', 'import');--> statement-breakpoint
CREATE TABLE "petru"."importuri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"utilizator_id" uuid,
	"nume_fisier" text NOT NULL,
	"amprenta" text NOT NULL,
	"stare" "petru"."stare_import" DEFAULT 'verificat' NOT NULL,
	"potrivire" jsonb NOT NULL,
	"randuri" jsonb NOT NULL,
	"erori" jsonb NOT NULL,
	"noi" integer DEFAULT 0 NOT NULL,
	"actualizate" integer DEFAULT 0 NOT NULL,
	"aplicat_la" timestamp with time zone,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "petru"."documente" DROP CONSTRAINT "documente_an_numar";--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "entitate_id" uuid;--> statement-breakpoint
-- Documentele existente (dacă există) trec la prima primărie din entități.
UPDATE "petru"."documente" SET "entitate_id" = (SELECT "id" FROM "petru"."entitati" WHERE "tip" = 'primarie' ORDER BY "creat_la" LIMIT 1) WHERE "entitate_id" IS NULL;--> statement-breakpoint
ALTER TABLE "petru"."documente" ALTER COLUMN "entitate_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "sursa" "petru"."sursa_document" DEFAULT 'petru' NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "canal" "petru"."canal_intrare";--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "emitent_text" text;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "compartiment_text" text;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "termen_cheie" text;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "termen_recunoscut" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "raspuns_la_id" uuid;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "destinatar_text" text;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "mod_expediere" "petru"."mod_expediere";--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "expediat_la" date;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "confirmat_la" date;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD COLUMN "actualizat_la" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."importuri" ADD CONSTRAINT "importuri_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."importuri" ADD CONSTRAINT "importuri_utilizator_id_utilizatori_id_fk" FOREIGN KEY ("utilizator_id") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_raspuns_la_id_documente_id_fk" FOREIGN KEY ("raspuns_la_id") REFERENCES "petru"."documente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_import_id_importuri_id_fk" FOREIGN KEY ("import_id") REFERENCES "petru"."importuri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_entitate_an_numar" UNIQUE("entitate_id","an","numar");