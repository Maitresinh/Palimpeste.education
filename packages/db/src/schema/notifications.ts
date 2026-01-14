import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { group } from "./auth";

// Enum pour le statut des demandes d'accès
export const accessRequestStatusEnum = pgEnum("access_request_status", ["pending", "approved", "rejected"]);

// Enum pour le type de notification
export const notificationTypeEnum = pgEnum("notification_type", [
  "access_request",      // Demande d'accès à un groupe
  "access_approved",     // Demande approuvée
  "access_rejected",     // Demande rejetée
  "group_invite",        // Invitation à un groupe
  "new_annotation",      // Nouvelle annotation dans un groupe
  "system"               // Notification système
]);

// Table pour les demandes d'accès aux groupes
export const groupAccessRequest = pgTable("group_access_request", {
  id: text("id").primaryKey(),

  // Utilisateur qui demande l'accès
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Groupe demandé
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),

  // Message explicatif de l'utilisateur
  message: text("message"),

  // Statut de la demande
  status: accessRequestStatusEnum("status").default("pending").notNull(),

  // Message de réponse du professeur (optionnel)
  responseMessage: text("response_message"),

  // Date de réponse
  respondedAt: timestamp("responded_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("group_access_request_userId_idx").on(table.userId),
  index("group_access_request_groupId_idx").on(table.groupId),
  index("group_access_request_status_idx").on(table.status),
  // Unique constraint: un utilisateur ne peut avoir qu'une seule demande par groupe
  uniqueIndex("group_access_request_user_group_unique").on(table.userId, table.groupId),
]);

// Table pour les notifications
export const notification = pgTable("notification", {
  id: text("id").primaryKey(),

  // Destinataire de la notification
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Type de notification
  type: notificationTypeEnum("type").notNull(),

  // Titre de la notification
  title: text("title").notNull(),

  // Message de la notification
  message: text("message").notNull(),

  // Lien vers l'action (optionnel)
  actionUrl: text("action_url"),

  // ID de la ressource liée (groupId, requestId, etc.)
  resourceId: text("resource_id"),

  // Lu ou non
  isRead: text("is_read").default("false").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notification_userId_idx").on(table.userId),
  index("notification_isRead_idx").on(table.isRead),
  index("notification_type_idx").on(table.type),
]);

// Relations
export const groupAccessRequestRelations = relations(groupAccessRequest, ({ one }) => ({
  user: one(user, {
    fields: [groupAccessRequest.userId],
    references: [user.id],
  }),
  group: one(group, {
    fields: [groupAccessRequest.groupId],
    references: [group.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));
