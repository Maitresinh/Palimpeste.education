import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { group } from "./auth";

export const document = pgTable("document", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  filename: text("filename").notNull(), // Nom du fichier original
  filepath: text("filepath").notNull(), // Chemin vers le fichier stocké
  filesize: text("filesize"), // Taille du fichier
  mimeType: text("mime_type").default("application/epub+zip").notNull(),

  // Propriétaire du document
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Groupe associé (null si c'est un livre personnel)
  groupId: text("group_id")
    .references(() => group.id, { onDelete: "cascade" }),

  // Document public (bibliothèque publique)
  isPublic: text("is_public").default("false").notNull(),

  // Indique si ce livre a été réclamé depuis la bibliothèque publique
  claimedFromPublic: text("claimed_from_public").default("false").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("document_ownerId_idx").on(table.ownerId),
  index("document_groupId_idx").on(table.groupId),
  index("document_isPublic_idx").on(table.isPublic),
]);

// Relations
export const documentRelations = relations(document, ({ one }) => ({
  owner: one(user, {
    fields: [document.ownerId],
    references: [user.id],
  }),
  group: one(group, {
    fields: [document.groupId],
    references: [group.id],
  }),
}));

