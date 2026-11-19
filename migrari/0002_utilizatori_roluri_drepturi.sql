CREATE TYPE "petru"."tip_entitate" AS ENUM('primarie', 'serviciu_public', 'alta');--> statement-breakpoint
CREATE TABLE "petru"."entitati" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cheie" text NOT NULL,
	"nume" text NOT NULL,
	"tip" "petru"."tip_entitate" NOT NULL,
	"cif" text,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitati_cheie_unique" UNIQUE("cheie")
);
--> statement-breakpoint
CREATE TABLE "petru"."rol_permisiuni" (
	"rol_id" uuid NOT NULL,
	"permisiune" text NOT NULL,
	CONSTRAINT "rol_permisiuni_rol_id_permisiune_pk" PRIMARY KEY("rol_id","permisiune")
);
--> statement-breakpoint
CREATE TABLE "petru"."roluri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitate_id" uuid NOT NULL,
	"cheie" text NOT NULL,
	"nume" text NOT NULL,
	"descriere" text,
	"predefinit" boolean DEFAULT false NOT NULL,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roluri_entitate_cheie" UNIQUE("entitate_id","cheie")
);
--> statement-breakpoint
CREATE TABLE "petru"."utilizator_roluri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilizator_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"compartiment_id" uuid,
	"acordat_de" uuid,
	"creat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilizator_rol_compartiment" UNIQUE("utilizator_id","rol_id","compartiment_id")
);
--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ALTER COLUMN "rol" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."compartimente" ADD COLUMN "entitate_id" uuid;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD COLUMN "entitate_id" uuid;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD COLUMN "functie" text;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD COLUMN "activ" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD COLUMN "ultima_intrare" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "petru"."rol_permisiuni" ADD CONSTRAINT "rol_permisiuni_rol_id_roluri_id_fk" FOREIGN KEY ("rol_id") REFERENCES "petru"."roluri"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."roluri" ADD CONSTRAINT "roluri_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizator_roluri" ADD CONSTRAINT "utilizator_roluri_utilizator_id_utilizatori_id_fk" FOREIGN KEY ("utilizator_id") REFERENCES "petru"."utilizatori"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizator_roluri" ADD CONSTRAINT "utilizator_roluri_rol_id_roluri_id_fk" FOREIGN KEY ("rol_id") REFERENCES "petru"."roluri"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizator_roluri" ADD CONSTRAINT "utilizator_roluri_compartiment_id_compartimente_id_fk" FOREIGN KEY ("compartiment_id") REFERENCES "petru"."compartimente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizator_roluri" ADD CONSTRAINT "utilizator_roluri_acordat_de_utilizatori_id_fk" FOREIGN KEY ("acordat_de") REFERENCES "petru"."utilizatori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."compartimente" ADD CONSTRAINT "compartimente_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD CONSTRAINT "utilizatori_entitate_id_entitati_id_fk" FOREIGN KEY ("entitate_id") REFERENCES "petru"."entitati"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petru"."utilizatori" ADD CONSTRAINT "utilizatori_email_unique" UNIQUE("email");