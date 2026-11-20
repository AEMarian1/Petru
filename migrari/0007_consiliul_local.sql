CREATE TYPE "petru"."initiator_proiect" AS ENUM('primar', 'viceprimar', 'consilier', 'cetateni');--> statement-breakpoint
CREATE TYPE "petru"."majoritate_vot" AS ENUM('simpla', 'absoluta', 'doua_treimi');--> statement-breakpoint
CREATE TYPE "petru"."rezultat_proiect" AS ENUM('aprobat', 'respins', 'retras');--> statement-breakpoint
CREATE TYPE "petru"."sens_aviz" AS ENUM('favorabil', 'favorabil_cu_amendamente', 'nefavorabil');--> statement-breakpoint
CREATE TYPE "petru"."tip_sedinta" AS ENUM('ordinara', 'extraordinara', 'de_indata');--> statement-breakpoint
ALTER TYPE "petru"."mod_expediere" ADD VALUE 'curier';--> statement-breakpoint
CREATE TABLE "petru"."avize_comisii" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"proiect_id" uuid NOT NULL,
	"comisie_id" uuid NOT NULL,
	"sesizata_la" date NOT NULL,
	"sens" "petru"."sens_aviz",
	"data" date,
	"amendamente" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avize_proiect_comisie" UNIQUE("proiect_id","comisie_id")
);
--> statement-breakpoint
CREATE TABLE "petru"."comisii" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"numar" integer NOT NULL,
	"nume" text NOT NULL,
	"domeniu" text,
	"activa" boolean DEFAULT true NOT NULL,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comisii_entitate_numar" UNIQUE("entitate_id","numar")
);
--> statement-breakpoint
CREATE TABLE "petru"."proiecte_hotarare" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"an" integer NOT NULL,
	"numar" integer NOT NULL,
	"titlu" text NOT NULL,
	"initiator" "petru"."initiator_proiect" NOT NULL,
	"compartiment_id" uuid NOT NULL,
	"normativ" boolean NOT NULL,
	"majoritate" "petru"."majoritate_vot" DEFAULT 'simpla' NOT NULL,
	"referat_la" date,
	"raport_la" date,
	"aviz_legalitate_la" date,
	"aviz_legalitate_de" uuid,
	"anuntat_la" date,
	"anunt_unde" text,
	"exceptie_urgenta" text,
	"sedinta_id" uuid,
	"ordine" integer,
	"rezultat" "petru"."rezultat_proiect",
	"rezultat_la" date,
	"vot_pentru" integer,
	"vot_contra" integer,
	"vot_abtineri" integer,
	"an_hcl" integer,
	"numar_hcl" integer,
	"prefect_iesire_id" uuid,
	"publicare_aprobata_la" date,
	"publicare_aprobata_de" uuid,
	"copie_anonimizata_la" date,
	"copie_anonimizata_de" uuid,
	"publicat_la" date,
	"publicat_unde" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proiecte_hotarare_document_id_unique" UNIQUE("document_id"),
	CONSTRAINT "proiecte_entitate_an_numar" UNIQUE("entitate_id","an","numar"),
	CONSTRAINT "hotarari_entitate_an_numar" UNIQUE("entitate_id","an_hcl","numar_hcl")
);
--> statement-breakpoint
CREATE TABLE "petru"."propuneri_l52" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"proiect_id" uuid NOT NULL,
	"primita_la" date NOT NULL,
	"numar_inregistrare" text,
	"rezumat" text NOT NULL,
	"preluata" boolean,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petru"."sedinte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"data" date NOT NULL,
	"tip" "petru"."tip_sedinta" NOT NULL,
	"consilieri_in_functie" integer NOT NULL,
	"convocat_la" date,
	"convocare" text,
	"materiale_trimise_la" date,
	"prezenti" integer,
	"presedinte" text,
	"pv_redactat_la" date,
	"pv_semnat_la" date,
	"pv_aprobat_la" date,
	"pv_aprobat_in_sedinta_id" uuid,
	"pv_publicat_la" date,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizat_la" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD COLUMN "sedinta_id" uuid;--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ADD CONSTRAINT "avize_comisii_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ADD CONSTRAINT "avize_comisii_proiect_id_proiecte_hotarare_id_fk" FOREIGN KEY ("proiect_id") REFERENCES "petru"."proiecte_hotarare"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ADD CONSTRAINT "avize_comisii_comisie_id_comisii_id_fk" FOREIGN KEY ("comisie_id") REFERENCES "petru"."comisii"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."comisii" ADD CONSTRAINT "comisii_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_document_id_documente_id_fk" FOREIGN KEY ("document_id") REFERENCES "petru"."documente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_compartiment_id_compartimente_id_fk" FOREIGN KEY ("compartiment_id") REFERENCES "petru"."compartimente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_aviz_legalitate_de_utilizatori_id_fk" FOREIGN KEY ("aviz_legalitate_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_sedinta_id_sedinte_id_fk" FOREIGN KEY ("sedinta_id") REFERENCES "petru"."sedinte"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_prefect_iesire_id_documente_id_fk" FOREIGN KEY ("prefect_iesire_id") REFERENCES "petru"."documente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_publicare_aprobata_de_utilizatori_id_fk" FOREIGN KEY ("publicare_aprobata_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_hotarare_copie_anonimizata_de_utilizatori_id_fk" FOREIGN KEY ("copie_anonimizata_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."propuneri_l52" ADD CONSTRAINT "propuneri_l52_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."propuneri_l52" ADD CONSTRAINT "propuneri_l52_proiect_id_proiecte_hotarare_id_fk" FOREIGN KEY ("proiect_id") REFERENCES "petru"."proiecte_hotarare"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_pv_aprobat_in_sedinta_id_sedinte_id_fk" FOREIGN KEY ("pv_aprobat_in_sedinta_id") REFERENCES "petru"."sedinte"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_sedinta_id_sedinte_id_fk" FOREIGN KEY ("sedinta_id") REFERENCES "petru"."sedinte"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_sedinta_regula" UNIQUE("sedinta_id","regula");--> statement-breakpoint
-- Partea scrisă de mână: aceeași entitate pe toate legăturile, verificările de date și izolarea în bază.
-- Cheile străine compuse (id, entitate) opresc legarea de rândurile altei entități (verificarea cheilor
-- străine nu trece prin securitatea la nivel de rând).
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_un_singur_subiect" CHECK (num_nonnulls("document_id", "sedinta_id") = 1);--> statement-breakpoint
ALTER TABLE "petru"."comisii" ADD CONSTRAINT "comisii_id_entitate" UNIQUE("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_id_entitate" UNIQUE("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_id_entitate" UNIQUE("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."ceasuri" ADD CONSTRAINT "ceasuri_sedinta_aceeasi_entitate" FOREIGN KEY ("sedinta_id","entitate_id") REFERENCES "petru"."sedinte"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_pv_aceeasi_entitate" FOREIGN KEY ("pv_aprobat_in_sedinta_id","entitate_id") REFERENCES "petru"."sedinte"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_document_aceeasi_entitate" FOREIGN KEY ("document_id","entitate_id") REFERENCES "petru"."documente"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_prefect_aceeasi_entitate" FOREIGN KEY ("prefect_iesire_id","entitate_id") REFERENCES "petru"."documente"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "proiecte_sedinta_aceeasi_entitate" FOREIGN KEY ("sedinta_id","entitate_id") REFERENCES "petru"."sedinte"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ADD CONSTRAINT "avize_proiect_aceeasi_entitate" FOREIGN KEY ("proiect_id","entitate_id") REFERENCES "petru"."proiecte_hotarare"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ADD CONSTRAINT "avize_comisie_aceeasi_entitate" FOREIGN KEY ("comisie_id","entitate_id") REFERENCES "petru"."comisii"("id","entitate_id");--> statement-breakpoint
ALTER TABLE "petru"."propuneri_l52" ADD CONSTRAINT "propuneri_proiect_aceeasi_entitate" FOREIGN KEY ("proiect_id","entitate_id") REFERENCES "petru"."proiecte_hotarare"("id","entitate_id");--> statement-breakpoint
-- Pe platforma publică au apărut ședințe în anii 0001 și 9999: data se verifică și în bază.
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_data_plauzibila" CHECK ("data" BETWEEN DATE '2000-01-01' AND DATE '2100-12-31');--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ADD CONSTRAINT "sedinte_prezenta" CHECK ("consilieri_in_functie" > 0 AND ("prezenti" IS NULL OR "prezenti" BETWEEN 0 AND "consilieri_in_functie"));--> statement-breakpoint
-- Numărul hotărârii există numai la un proiect aprobat; voturile, numai la aprobat sau respins.
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "hotararea_numai_aprobata" CHECK (("numar_hcl" IS NULL) = ("an_hcl" IS NULL) AND ("numar_hcl" IS NULL OR "rezultat" = 'aprobat'));--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ADD CONSTRAINT "voturile_numai_la_vot" CHECK ("vot_pentru" IS NULL OR "rezultat" IN ('aprobat', 'respins'));--> statement-breakpoint
-- Izolarea entităților, ca la documente (migrarea 0004).
ALTER TABLE "petru"."comisii" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."comisii" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "comisii_entitatea" ON "petru"."comisii" USING ("petru"."entitatea_permisa"("entitate_id")) WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."sedinte" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."sedinte" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sedinte_entitatea" ON "petru"."sedinte" USING ("petru"."entitatea_permisa"("entitate_id")) WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."proiecte_hotarare" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "proiecte_entitatea" ON "petru"."proiecte_hotarare" USING ("petru"."entitatea_permisa"("entitate_id")) WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."avize_comisii" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "avize_entitatea" ON "petru"."avize_comisii" USING ("petru"."entitatea_permisa"("entitate_id")) WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
ALTER TABLE "petru"."propuneri_l52" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "petru"."propuneri_l52" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "propuneri_entitatea" ON "petru"."propuneri_l52" USING ("petru"."entitatea_permisa"("entitate_id")) WITH CHECK ("petru"."entitatea_permisa"("entitate_id"));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "petru"."comisii", "petru"."sedinte", "petru"."proiecte_hotarare", "petru"."avize_comisii", "petru"."propuneri_l52" TO petru_aplicatie;--> statement-breakpoint
-- O comisie sesizată din greșeală se scoate cât timp nu a dat avizul (urma rămâne în jurnal).
GRANT DELETE ON "petru"."avize_comisii" TO petru_aplicatie;--> statement-breakpoint
-- Drepturile și rolurile noi, în bazele care există deja: primarul inițiază proiectele de hotărâre;
-- biroul Administrație publică ține secretariatul consiliului local.
INSERT INTO "petru"."rol_permisiuni" ("rol_id", "permisiune")
  SELECT "id", 'consiliu.initiaza' FROM "petru"."roluri" WHERE "cheie" = 'primar' AND "predefinit"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "petru"."roluri" ("entitate_id", "cheie", "nume", "descriere", "predefinit")
  SELECT "id", 'secretariat_consiliu', 'Secretariatul consiliului local',
    'Biroul Administrație publică: proiectele, comisiile, anunțurile pe Legea 52, ședințele, procesele-verbale și registrele consiliului local.', true
  FROM "petru"."entitati" WHERE "tip" = 'primarie'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "petru"."rol_permisiuni" ("rol_id", "permisiune")
  SELECT "id", p FROM "petru"."roluri", unnest(ARRAY['consiliu.gestioneaza', 'consiliu.vede']) AS p
  WHERE "cheie" = 'secretariat_consiliu' AND "predefinit"
ON CONFLICT DO NOTHING;
