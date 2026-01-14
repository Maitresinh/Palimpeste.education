import dotenv from "dotenv";

dotenv.config({
  path: "../../apps/server/.env",
});

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, or, isNull, desc, asc, sql, count, gte, lte, like, ilike } from "drizzle-orm";

import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

// Export schema
export * from "./schema";

// Export commonly used Drizzle operators
export { eq, and, or, isNull, desc, asc, sql, count, gte, lte, like, ilike };

// Export types
export type User = typeof schema.user.$inferSelect;
export type InsertUser = typeof schema.user.$inferInsert;
export type Group = typeof schema.group.$inferSelect;
export type InsertGroup = typeof schema.group.$inferInsert;
export type GroupMember = typeof schema.groupMember.$inferSelect;
export type InsertGroupMember = typeof schema.groupMember.$inferInsert;
export type Document = typeof schema.document.$inferSelect;
export type InsertDocument = typeof schema.document.$inferInsert;
export type Annotation = typeof schema.annotation.$inferSelect;
export type InsertAnnotation = typeof schema.annotation.$inferInsert;
export type ReaderSettings = typeof schema.readerSettings.$inferSelect;
export type InsertReaderSettings = typeof schema.readerSettings.$inferInsert;
export type ReadingProgress = typeof schema.readingProgress.$inferSelect;
export type InsertReadingProgress = typeof schema.readingProgress.$inferInsert;
export type SharedCitation = typeof schema.sharedCitation.$inferSelect;
export type InsertSharedCitation = typeof schema.sharedCitation.$inferInsert;
export type GroupShareStats = typeof schema.groupShareStats.$inferSelect;
export type InsertGroupShareStats = typeof schema.groupShareStats.$inferInsert;
export type GroupAccessRequest = typeof schema.groupAccessRequest.$inferSelect;
export type InsertGroupAccessRequest = typeof schema.groupAccessRequest.$inferInsert;
export type Notification = typeof schema.notification.$inferSelect;
export type InsertNotification = typeof schema.notification.$inferInsert;
export type ActivityLog = typeof schema.activityLog.$inferSelect;
export type InsertActivityLog = typeof schema.activityLog.$inferInsert;
export type TeacherRequest = typeof schema.teacherRequest.$inferSelect;
export type InsertTeacherRequest = typeof schema.teacherRequest.$inferInsert;
export type SystemConfig = typeof schema.systemConfig.$inferSelect;
export type InsertSystemConfig = typeof schema.systemConfig.$inferInsert;
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
