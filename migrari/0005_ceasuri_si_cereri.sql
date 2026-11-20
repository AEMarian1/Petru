CREATE TYPE "petru"."fel_cerere" AS ENUM('petitie', 'informatii_publice');--> statement-breakpoint
CREATE TYPE "petru"."solutie_cerere" AS ENUM('favorabila', 'nefavorabila', 'comunicata', 'comunicata_partial', 'respinsa_exceptata', 'respinsa_inexistenta', 'redirectionata', 'clasata', 'conexata');--> statement-breakpoint
CREATE TYPE "petru"."solutie_reclamatie" AS ENUM('admisa', 'respinsa');--> statement-breakpoint
CREATE TYPE "petru"."tip_solicitant" AS ENUM('fizica', 'juridica', 'nespecificat');--> statement-breakpoint
CREATE TABLE "petru"."ceasuri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"regula" text NOT NULL,
	"pornit_la" date NOT NULL,
	"termen_initial" date NOT NULL,
	"termen" date NOT NULL,
	"prelungit_la" date,
	"prelungire_motiv" text,
	"instiintare" text,
	"oprit_la" date,
	"motiv_oprire" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ceasuri_document_regula" UNIQUE("document_id","regula")
);
--> statement-breakpoint
CREATE TABLE "petru"."cereri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"fel" "petru"."fel_cerere" NOT NULL,
	"solicitant" "petru"."tip_solicitant" DEFAULT 'nespecificat' NOT NULL,
	"solutie" "petru"."solutie_cerere",
	"solutie_la" date,
	"solutie_motiv" text,
	"redirectionat_catre" text,
	"conexat_la_id" uuid,
	"reclamatie_la" date,
	"reclamatie_numar" text,
	"reclamatie_solutie" "petru"."solutie_reclamatie",
	"reclamatie_solutie_la" date,
	"plangere_instanta" boolean DEFAULT false NOT NULL,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cereri_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_document_id_documente_id_fk" FOREIGN KEY ("document_id") REFERENCES "petru"."documente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."cereri" ADD CONSTRAINT "cereri_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."cereri" ADD CONSTRAINT "cereri_document_id_documente_id_fk" FOREIGN KEY ("document_id") REFERENCES "petru"."documente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."cereri" ADD CONSTRAINT "cereri_conexat_la_id_cereri_id_fk" FOREIGN KEY ("conexat_la_id") REFERENCES "petru"."cereri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Ceasurile și cererile țin de documentul aceleiași entități: cheia străină compusă oprește legarea
-- de documentul altei entități (verificarea cheilor străine nu trece prin securitatea la nivel de rând).
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_id_entitate" UNIQUE("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_document_aceeasi_entitate" FOREIGN KEY ("document_id","entitate_id") REFERENCES "petru"."documente"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."cereri" ADD CONSTRAINT "cereri_document_aceeasi_entitate" FOREIGN KEY ("document_id","entitate_id") REFERENCES "petru"."documente"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_termen_dupa_pornire" CHECK ("termen" >= "pornit_la" AND "termen_initial" >= "pornit_la");--> statement-breakpoint
-- Izolarea entităților, ca la documente (migrarea 0004).
ALTER TABLE "petru"."ceasuri" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "ceasuri_entitatea" ON "petru"."ceasuri"
  USING ("petru"."entitatea_permisa"("entitate_id"))
  WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."cereri" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."cereri" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "cereri_entitatea" ON "petru"."cereri"
  USING ("petru"."entitatea_permisa"("entitate_id"))
  WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "petru"."ceasuri", "petru"."cereri" TO petru_aplicatie;--> statement-breakpoint
-- O cerere fără soluție se poate scoate din registre (felul a fost greșit); restul rămâne, cu urma în jurnal.
GRANT DELETE ON "petru"."cereri" TO petru_aplicatie;
