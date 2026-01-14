import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, pgEnum, primaryKey, bigint } from "drizzle-orm/pg-core";

// Enum pour les rôles utilisateur
export const userRoleEnum = pgEnum("user_role", ["STUDENT", "TEACHER", "ADMIN"]);

// Enum pour les types de groupe
export const groupTypeEnum = pgEnum("group_type", ["CLASS", "CLUB"]);

// Enum pour les rôles dans un groupe
export const groupRoleEnum = pgEnum("group_role", ["OWNER", "ADMIN", "MEMBER"]);

// 500 MB default quota
const DEFAULT_STORAGE_QUOTA = 500 * 1024 * 1024;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("STUDENT").notNull(),
  // Two-factor authentication
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  // Storage tracking (in bytes)
  storageUsed: bigint("storage_used", { mode: "number" }).default(0).notNull(),
  storageQuota: bigint("storage_quota", { mode: "number" }).default(DEFAULT_STORAGE_QUOTA).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Table pour la 2FA (Two-Factor Authentication)
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("two_factor_userId_idx").on(table.userId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  groupsOwned: many(group),
  groupMemberships: many(groupMember),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Table pour les groupes/classes
export const group = pgTable("group", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Pour CLASS : c'est le professeur. Pour CLUB : c'est le créateur (peut être un étudiant)
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Type de groupe : CLASS (scolaire) ou CLUB (social)
  type: groupTypeEnum("type").default("CLASS").notNull(),

  inviteCode: text("invite_code").notNull().unique(),
  // Échéance du groupe (deadline)
  deadline: timestamp("deadline"),
  // Archivage automatique activé (true = archive auto à la deadline, false = archivage manuel)
  autoArchive: boolean("auto_archive").default(false).notNull(),
  // Statut d'archivage (true = archivé, false = actif)
  isArchived: boolean("is_archived").default(false).notNull(),
  // Date d'archivage effectif
  archivedAt: timestamp("archived_at"),
  // Autoriser le partage sur les réseaux sociaux (Feature 2)
  allowSocialExport: boolean("allow_social_export").default(true).notNull(),
  // Activer le hub d'annotations centralisé (Feature 4)
  annotationHubEnabled: boolean("annotation_hub_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => [
  index("group_teacherId_idx").on(table.teacherId),
  index("group_inviteCode_idx").on(table.inviteCode),
]);

// Table pour les membres des groupes
export const groupMember = pgTable("group_member", {
  groupId: text("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Rôle dans le groupe
  role: groupRoleEnum("role").default("MEMBER").notNull(),

  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.groupId, table.userId] }),
  index("group_member_groupId_idx").on(table.groupId),
  index("group_member_userId_idx").on(table.userId),
]);

// Relations pour les groupes
export const groupRelations = relations(group, ({ one, many }) => ({
  teacher: one(user, {
    fields: [group.teacherId],
    references: [user.id],
  }),
  members: many(groupMember),
}));

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
  group: one(group, {
    fields: [groupMember.groupId],
    references: [group.id],
  }),
  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id],
  }),
}));
