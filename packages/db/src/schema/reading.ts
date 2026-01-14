import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, json, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { document } from "./documents";

// Table pour la progression de lecture
export const readingProgress = pgTable("reading_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  documentId: text("document_id")
    .notNull()
    .references(() => document.id, { onDelete: "cascade" }),

  // Position actuelle dans le livre (CFI = Canonical Fragment Identifier)
  currentLocation: text("current_location").notNull(),

  // Pourcentage de progression (0-100)
  progressPercentage: integer("progress_percentage").default(0).notNull(),

  // Dernière date de lecture
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("reading_progress_userId_idx").on(table.userId),
  index("reading_progress_documentId_idx").on(table.documentId),
  index("reading_progress_userId_documentId_idx").on(table.userId, table.documentId),
]);

// Table pour les annotations (surlignages et commentaires)
export const annotation = pgTable("annotation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  documentId: text("document_id")
    .notNull()
    .references(() => document.id, { onDelete: "cascade" }),

  // Visible par les autres membres du groupe (stocké en texte 'true'/'false' pour compat avec la migration existante)
  isGroupVisible: text("is_group_visible").notNull().default("false"),

  // CFI Range du texte sélectionné
  cfiRange: text("cfi_range").notNull(),

  // Texte sélectionné
  selectedText: text("selected_text").notNull(),

  // Couleur de surlignage (hex color)
  highlightColor: text("highlight_color").notNull().default("#fef08a"), // yellow-200 par défaut

  // Commentaire optionnel
  comment: text("comment"),

  // Annotation parent pour les threads (réponses)
  parentId: text("parent_id").references((): any => annotation.id, { onDelete: "cascade" }),

  // Contexte supplémentaire (chapitre, page, etc.)
  context: json("context").$type<{
    chapter?: string;
    section?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("annotation_userId_idx").on(table.userId),
  index("annotation_documentId_idx").on(table.documentId),
  index("annotation_userId_documentId_idx").on(table.userId, table.documentId),
  index("annotation_parentId_idx").on(table.parentId),
]);

// Table pour les préférences de lecture par utilisateur
export const readerSettings = pgTable("reader_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),

  // Taille de la police (en px ou %)
  fontSize: integer("font_size").default(16).notNull(),

  // Thème de lecture (light, dark, sepia)
  theme: text("theme").default("light").notNull(),

  // Espacement des lignes
  lineHeight: integer("line_height").default(150).notNull(), // en %

  // Police de caractères
  fontFamily: text("font_family").default("system-ui").notNull(),

  // Mode de lecture (paginated = pages, scrolled = défilement continu)
  readingMode: text("reading_mode").default("paginated").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("reader_settings_userId_idx").on(table.userId),
]);

// Relations
export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(user, {
    fields: [readingProgress.userId],
    references: [user.id],
  }),
  document: one(document, {
    fields: [readingProgress.documentId],
    references: [document.id],
  }),
}));

export const annotationRelations = relations(annotation, ({ one, many }) => ({
  user: one(user, {
    fields: [annotation.userId],
    references: [user.id],
  }),
  document: one(document, {
    fields: [annotation.documentId],
    references: [document.id],
  }),
  parent: one(annotation, {
    fields: [annotation.parentId],
    references: [annotation.id],
    relationName: "replies",
  }),
  replies: many(annotation, {
    relationName: "replies",
  }),
}));

export const readerSettingsRelations = relations(readerSettings, ({ one }) => ({
  user: one(user, {
    fields: [readerSettings.userId],
    references: [user.id],
  }),
}));



