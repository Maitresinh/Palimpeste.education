-- Migration: Système de threads et paramètres de lecture
-- Date: 2025-12-22

-- Ajouter la colonne parentId pour les threads d'annotations
ALTER TABLE "annotation" ADD COLUMN "parent_id" text;

-- Ajouter la contrainte de clé étrangère pour parentId
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_parent_id_annotation_id_fk" FOREIGN KEY ("parent_id") REFERENCES "annotation"("id") ON DELETE cascade;

-- Ajouter l'index pour parentId
CREATE INDEX IF NOT EXISTS "annotation_parentId_idx" ON "annotation" ("parent_id");

-- Créer la table pour les paramètres de lecture
CREATE TABLE IF NOT EXISTS "reader_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "font_size" integer DEFAULT 16 NOT NULL,
  "theme" text DEFAULT 'light' NOT NULL,
  "line_height" integer DEFAULT 150 NOT NULL,
  "font_family" text DEFAULT 'system-ui' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reader_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);

-- Ajouter l'index pour userId dans reader_settings
CREATE INDEX IF NOT EXISTS "reader_settings_userId_idx" ON "reader_settings" ("user_id");
