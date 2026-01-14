import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { group } from "./auth";
import { annotation } from "./reading";
import { document } from "./documents";

// Table pour les citations partagées sur les réseaux sociaux
export const sharedCitation = pgTable("shared_citation", {
  id: text("id").primaryKey(),
  
  // L'annotation source
  annotationId: text("annotation_id")
    .notNull()
    .references(() => annotation.id, { onDelete: "cascade" }),
  
  // Utilisateur qui a partagé
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Groupe associé
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  
  // Document/Livre source
  documentId: text("document_id")
    .notNull()
    .references(() => document.id, { onDelete: "cascade" }),
  
  // Plateforme de partage (twitter, facebook, linkedin, copy_link)
  platform: text("platform").notNull(),
  
  // Texte de la citation (copie pour persistance même si annotation supprimée)
  citationText: text("citation_text").notNull(),
  
  // Titre du livre
  bookTitle: text("book_title").notNull(),
  
  // Auteur du livre
  bookAuthor: text("book_author"),
  
  // Nombre de clics sur le lien partagé
  clickCount: integer("click_count").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("shared_citation_annotationId_idx").on(table.annotationId),
  index("shared_citation_userId_idx").on(table.userId),
  index("shared_citation_groupId_idx").on(table.groupId),
  index("shared_citation_documentId_idx").on(table.documentId),
  index("shared_citation_platform_idx").on(table.platform),
]);

// Table pour les statistiques de partage du groupe (agrégées)
export const groupShareStats = pgTable("group_share_stats", {
  id: text("id").primaryKey(),
  
  groupId: text("group_id")
    .notNull()
    .unique()
    .references(() => group.id, { onDelete: "cascade" }),
  
  // Nombre total de partages
  totalShares: integer("total_shares").default(0).notNull(),
  
  // Nombre total de clics sur les liens partagés
  totalClicks: integer("total_clicks").default(0).notNull(),
  
  // Dernière mise à jour
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const sharedCitationRelations = relations(sharedCitation, ({ one }) => ({
  annotation: one(annotation, {
    fields: [sharedCitation.annotationId],
    references: [annotation.id],
  }),
  user: one(user, {
    fields: [sharedCitation.userId],
    references: [user.id],
  }),
  group: one(group, {
    fields: [sharedCitation.groupId],
    references: [group.id],
  }),
  document: one(document, {
    fields: [sharedCitation.documentId],
    references: [document.id],
  }),
}));

export const groupShareStatsRelations = relations(groupShareStats, ({ one }) => ({
  group: one(group, {
    fields: [groupShareStats.groupId],
    references: [group.id],
  }),
}));
