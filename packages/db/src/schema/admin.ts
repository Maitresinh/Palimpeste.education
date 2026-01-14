import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Enum pour le type d'action dans les logs
export const activityTypeEnum = pgEnum("activity_type", [
  "user_signup",           // Inscription d'un utilisateur
  "user_login",            // Connexion d'un utilisateur
  "user_logout",           // Déconnexion d'un utilisateur
  "user_role_changed",     // Changement de rôle d'un utilisateur
  "user_deleted",          // Suppression d'un utilisateur
  "teacher_request",       // Demande de rôle enseignant
  "teacher_approved",      // Approbation de demande enseignant
  "teacher_rejected",      // Rejet de demande enseignant
  "group_created",         // Création d'un groupe
  "group_deleted",         // Suppression d'un groupe
  "document_uploaded",     // Upload d'un document
  "document_deleted",      // Suppression d'un document
  "admin_action",          // Action administrative générique
]);

// Enum pour le statut des demandes de rôle enseignant
export const teacherRequestStatusEnum = pgEnum("teacher_request_status", [
  "pending",
  "approved", 
  "rejected"
]);

// Table pour les logs d'activité système
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  
  // Type d'activité
  type: activityTypeEnum("type").notNull(),
  
  // Utilisateur concerné (optionnel, peut être null pour des actions système)
  userId: text("user_id")
    .references(() => user.id, { onDelete: "set null" }),
  
  // Utilisateur qui a effectué l'action (admin, système, etc.)
  actorId: text("actor_id")
    .references(() => user.id, { onDelete: "set null" }),
  
  // Description de l'action
  description: text("description").notNull(),
  
  // Métadonnées additionnelles (JSON stringifié)
  metadata: text("metadata"),
  
  // Adresse IP (optionnel)
  ipAddress: text("ip_address"),
  
  // User Agent (optionnel)
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_log_type_idx").on(table.type),
  index("activity_log_userId_idx").on(table.userId),
  index("activity_log_actorId_idx").on(table.actorId),
  index("activity_log_createdAt_idx").on(table.createdAt),
]);

// Table pour les demandes de rôle enseignant
export const teacherRequest = pgTable("teacher_request", {
  id: text("id").primaryKey(),
  
  // Utilisateur qui demande le rôle enseignant
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Statut de la demande
  status: teacherRequestStatusEnum("status").default("pending").notNull(),
  
  // Message de l'utilisateur (pourquoi il veut être enseignant)
  message: text("message"),
  
  // Établissement/Organisation (optionnel)
  organization: text("organization"),
  
  // Réponse de l'admin
  responseMessage: text("response_message"),
  
  // Admin qui a traité la demande
  reviewedBy: text("reviewed_by")
    .references(() => user.id, { onDelete: "set null" }),
  
  // Date de traitement
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("teacher_request_userId_idx").on(table.userId),
  index("teacher_request_status_idx").on(table.status),
]);

// Table pour la configuration système
export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, {
    fields: [activityLog.userId],
    references: [user.id],
    relationName: "activityLogUser",
  }),
  actor: one(user, {
    fields: [activityLog.actorId],
    references: [user.id],
    relationName: "activityLogActor",
  }),
}));

export const teacherRequestRelations = relations(teacherRequest, ({ one }) => ({
  user: one(user, {
    fields: [teacherRequest.userId],
    references: [user.id],
    relationName: "teacherRequestUser",
  }),
  reviewer: one(user, {
    fields: [teacherRequest.reviewedBy],
    references: [user.id],
    relationName: "teacherRequestReviewer",
  }),
}));
