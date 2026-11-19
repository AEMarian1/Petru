CREATE SCHEMA "petru";
--> statement-breakpoint
CREATE TYPE "petru"."directie_document" AS ENUM('intrare', 'iesire', 'intern');--> statement-breakpoint
CREATE TYPE "petru"."stare_document" AS ENUM('inregistrat', 'repartizat', 'in_lucru', 'la_semnat', 'emis', 'publicat', 'arhivat');--> statement-breakpoint
CREATE TYPE "petru"."tip_persoana" AS ENUM('fizica', 'juridica', 'institutie');--> statement-breakpoint
CREATE TABLE "petru"."compartimente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cheie" text NOT NULL,
	"nume" text NOT NULL,
	"atributii" text,
	"program" text,
	"interior" text,
	"email" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compartimente_cheie_unique" UNIQUE("cheie")
);
--> statement-breakpoint
CREATE TABLE "petru"."documente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"an" integer NOT NULL,
	"numar" integer NOT NULL,
	"data_inregistrare" timestamp with time zone DEFAULT now() NOT NULL,
	"directie" "petru"."directie_document" DEFAULT 'intrare' NOT NULL,
	"tip" text NOT NULL,
	"continut" text NOT NULL,
	"emitent_id" uuid,
	"compartiment_id" uuid,
	"stare" "petru"."stare_document" DEFAULT 'inregistrat' NOT NULL,
	"termen" date,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documente_an_numar" UNIQUE("an","numar")
);
--> statement-breakpoint
CREATE TABLE "petru"."institutie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nume" text NOT NULL,
	"localitate" text NOT NULL,
	"judet" text NOT NULL,
	"cif" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petru"."jurnal" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cand" timestamp with time zone DEFAULT now() NOT NULL,
	"utilizator_id" uuid,
	"actiune" text NOT NULL,
	"entitate" text NOT NULL,
	"entitate_id" uuid,
	"detalii" jsonb
);
--> statement-breakpoint
CREATE TABLE "petru"."persoane" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tip" "petru"."tip_persoana" NOT NULL,
	"nume" text NOT NULL,
	"prenume" text,
	"cnp" text,
	"cui" text,
	"adresa" text,
	"telefon" text,
	"email" text,
	"este_proba" boolean DEFAULT false NOT NULL,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petru"."utilizatori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nume_afisat" text NOT NULL,
	"rol" text NOT NULL,
	"compartiment_id" uuid,
	"entra_oid" text,
	"cont_local" boolean DEFAULT false NOT NULL,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilizatori_entra_oid_unique" UNIQUE("entra_oid")
);
--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_emitent_id_persoane_id_fk" FOREIGN KEY ("emitent_id") REFERENCES "petru"."persoane"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."documente" ADD CONSTRAINT "documente_compartiment_id_compartimente_id_fk" FOREIGN KEY ("compartiment_id") REFERENCES "petru"."compartimente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."jurnal" ADD CONSTRAINT "jurnal_utilizator_id_utilizatori_id_fk" FOREIGN KEY ("utilizator_id") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD CONSTRAINT "utilizatori_compartiment_id_compartimente_id_fk" FOREIGN KEY ("compartiment_id") REFERENCES "petru"."compartimente"("id") ON DELETE no action ON UPDATE no action;