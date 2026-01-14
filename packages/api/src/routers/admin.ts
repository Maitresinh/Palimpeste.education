import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  db,
  user,
  group,
  groupMember,
  document,
  session,
  activityLog,
  teacherRequest,
  systemConfig,
  notification,

  eq,
  and,
  desc,
  asc,
  count,
  sql,
  gte,
  lte,
  ilike
} from "@lectio/db";
import { adminProcedure, protectedProcedure, router } from "../index";

// Helper pour logger les activités
async function logActivity(
  type: typeof activityLog.$inferInsert.type,
  description: string,
  options?: {
    userId?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  await db.insert(activityLog).values({
    id: crypto.randomUUID(),
    type,
    description,
    userId: options?.userId,
    actorId: options?.actorId,
    metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
}

export const adminRouter = router({
  // ==================== STATISTIQUES ====================

  // Dashboard stats
  getStats: adminProcedure.query(async () => {
    const [userCount] = await db.select({ count: count() }).from(user);
    const [groupCount] = await db.select({ count: count() }).from(group);
    const [documentCount] = await db.select({ count: count() }).from(document);
    const [pendingTeacherRequests] = await db
      .select({ count: count() })
      .from(teacherRequest)
      .where(eq(teacherRequest.status, "pending"));

    // Utilisateurs par rôle
    const usersByRole = await db
      .select({
        role: user.role,
        count: count(),
      })
      .from(user)
      .groupBy(user.role);

    // Inscriptions des 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentSignups] = await db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, sevenDaysAgo));

    // Sessions actives
    const [activeSessions] = await db
      .select({ count: count() })
      .from(session)
      .where(gte(session.expiresAt, new Date()));

    return {
      totalUsers: userCount?.count ?? 0,
      totalGroups: groupCount?.count ?? 0,
      totalDocuments: documentCount?.count ?? 0,
      pendingTeacherRequests: pendingTeacherRequests?.count ?? 0,
      usersByRole: usersByRole.reduce((acc, { role, count }) => {
        acc[role] = count;
        return acc;
      }, {} as Record<string, number>),
      recentSignups: recentSignups?.count ?? 0,
      activeSessions: activeSessions?.count ?? 0,
    };
  }),

  // ==================== GESTION DES UTILISATEURS ====================

  // Liste des utilisateurs avec pagination et filtres
  listUsers: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
      sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ input }) => {
      const { page, limit, search, role, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Construire les conditions de filtrage
      const conditions = [];
      if (search) {
        conditions.push(
          sql`(${user.name} ILIKE ${`%${search}%`} OR ${user.email} ILIKE ${`%${search}%`})`
        );
      }
      if (role) {
        conditions.push(eq(user.role, role));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const orderFn = sortOrder === "asc" ? asc : desc;
      const orderColumn = sortBy === "name" ? user.name : sortBy === "email" ? user.email : user.createdAt;

      const [users, totalCount] = await Promise.all([
        db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(whereClause)
          .orderBy(orderFn(orderColumn))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(user).where(whereClause),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count ?? 0,
          totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
        },
      };
    }),

  // Récupérer les détails d'un utilisateur
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [userData] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!userData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur non trouvé" });
      }

      // Récupérer les groupes de l'utilisateur
      const userGroups = await db
        .select({
          groupId: groupMember.groupId,
          role: groupMember.role,
          joinedAt: groupMember.joinedAt,
          groupName: group.name,
          groupType: group.type,
        })
        .from(groupMember)
        .leftJoin(group, eq(groupMember.groupId, group.id))
        .where(eq(groupMember.userId, input.userId));

      // Récupérer les documents de l'utilisateur
      const userDocuments = await db
        .select({
          id: document.id,
          title: document.title,
          createdAt: document.createdAt,
        })
        .from(document)
        .where(eq(document.ownerId, input.userId))
        .limit(10);

      // Sessions actives
      const userSessions = await db
        .select()
        .from(session)
        .where(and(
          eq(session.userId, input.userId),
          gte(session.expiresAt, new Date())
        ));

      return {
        ...userData,
        groups: userGroups,
        documents: userDocuments,
        activeSessions: userSessions.length,
      };
    }),

  // Modifier le rôle d'un utilisateur
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur non trouvé" });
      }

      // Empêcher un admin de se rétrograder lui-même
      if (input.userId === ctx.session.user.id && input.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas modifier votre propre rôle"
        });
      }

      const oldRole = targetUser.role;

      await db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.userId));

      // Logger l'action
      await logActivity("user_role_changed", `Rôle modifié de ${oldRole} à ${input.role}`, {
        userId: input.userId,
        actorId: ctx.session.user.id,
        metadata: { oldRole, newRole: input.role, userName: targetUser.name },
      });

      // Notifier l'utilisateur
      await db.insert(notification).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        type: "system",
        title: "Rôle modifié",
        message: `Votre rôle a été modifié de ${oldRole} à ${input.role}.`,
      });

      return { success: true };
    }),

  // Supprimer un utilisateur
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas supprimer votre propre compte"
        });
      }

      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur non trouvé" });
      }

      // Supprimer explicitement les sessions (au cas où les contraintes DB ne seraient pas appliquées)
      await db.delete(session).where(eq(session.userId, input.userId));

      // Supprimer explicitement les documents de l'utilisateur
      await db.delete(document).where(eq(document.ownerId, input.userId));

      // Supprimer l'utilisateur (les autres tables ont des ON DELETE CASCADE)
      await db.delete(user).where(eq(user.id, input.userId));

      // Logger l'action
      await logActivity("user_deleted", `Utilisateur ${targetUser.email} supprimé`, {
        actorId: ctx.session.user.id,
        metadata: { deletedUserEmail: targetUser.email, deletedUserName: targetUser.name },
      });

      return { success: true };
    }),

  // Créer un compte enseignant/admin directement
  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier si l'email existe déjà
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un utilisateur avec cet email existe déjà"
        });
      }

      // Import auth to use Better Auth's API
      const { auth } = await import("@lectio/auth");

      // Generate a random temporary password
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();

      // Use Better Auth's signUpEmail to create user with credential account
      const signUpResult = await auth.api.signUpEmail({
        body: {
          name: input.name,
          email: input.email,
          password: tempPassword,
        },
      });

      if (!signUpResult?.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Échec de la création du compte"
        });
      }

      // Update user role to the requested role (Better Auth creates with default role)
      await db
        .update(user)
        .set({
          role: input.role,
          emailVerified: true, // Admin-created accounts are pre-verified
        })
        .where(eq(user.id, signUpResult.user.id));

      // Trigger password reset flow so user can set their own password
      await auth.api.requestPasswordReset({
        body: {
          email: input.email,
          redirectTo: "/reset-password",
        },
      });

      // Logger l'action
      await logActivity("admin_action", `Compte ${input.role} créé pour ${input.email}`, {
        userId: signUpResult.user.id,
        actorId: ctx.session.user.id,
        metadata: { role: input.role, email: input.email },
      });

      return { success: true, user: signUpResult.user };
    }),

  // ==================== DEMANDES ENSEIGNANT ====================

  // Liste des demandes de rôle enseignant
  listTeacherRequests: adminProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { status, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = status ? eq(teacherRequest.status, status) : undefined;

      const [requests, totalCount] = await Promise.all([
        db
          .select({
            id: teacherRequest.id,
            status: teacherRequest.status,
            message: teacherRequest.message,
            organization: teacherRequest.organization,
            responseMessage: teacherRequest.responseMessage,
            reviewedAt: teacherRequest.reviewedAt,
            createdAt: teacherRequest.createdAt,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          })
          .from(teacherRequest)
          .leftJoin(user, eq(teacherRequest.userId, user.id))
          .where(conditions)
          .orderBy(desc(teacherRequest.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(teacherRequest).where(conditions),
      ]);

      return {
        requests,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count ?? 0,
          totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
        },
      };
    }),

  // Approuver une demande enseignant
  approveTeacherRequest: adminProcedure
    .input(z.object({
      requestId: z.string(),
      responseMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [request] = await db
        .select()
        .from(teacherRequest)
        .where(eq(teacherRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Demande non trouvée" });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette demande a déjà été traitée"
        });
      }

      // Mettre à jour la demande
      await db
        .update(teacherRequest)
        .set({
          status: "approved",
          responseMessage: input.responseMessage,
          reviewedBy: ctx.session.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(teacherRequest.id, input.requestId));

      // Mettre à jour le rôle de l'utilisateur
      await db
        .update(user)
        .set({ role: "TEACHER" })
        .where(eq(user.id, request.userId));

      // Logger l'action
      await logActivity("teacher_approved", "Demande enseignant approuvée", {
        userId: request.userId,
        actorId: ctx.session.user.id,
      });

      // Notifier l'utilisateur
      await db.insert(notification).values({
        id: crypto.randomUUID(),
        userId: request.userId,
        type: "system",
        title: "Demande approuvée",
        message: "Votre demande de compte enseignant a été approuvée. Vous pouvez maintenant créer des classes.",
      });

      return { success: true };
    }),

  // Rejeter une demande enseignant
  rejectTeacherRequest: adminProcedure
    .input(z.object({
      requestId: z.string(),
      responseMessage: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [request] = await db
        .select()
        .from(teacherRequest)
        .where(eq(teacherRequest.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Demande non trouvée" });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette demande a déjà été traitée"
        });
      }

      // Mettre à jour la demande
      await db
        .update(teacherRequest)
        .set({
          status: "rejected",
          responseMessage: input.responseMessage,
          reviewedBy: ctx.session.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(teacherRequest.id, input.requestId));

      // Logger l'action
      await logActivity("teacher_rejected", "Demande enseignant rejetée", {
        userId: request.userId,
        actorId: ctx.session.user.id,
        metadata: { reason: input.responseMessage },
      });

      // Notifier l'utilisateur
      await db.insert(notification).values({
        id: crypto.randomUUID(),
        userId: request.userId,
        type: "system",
        title: "Demande rejetée",
        message: `Votre demande de compte enseignant a été rejetée. Raison: ${input.responseMessage}`,
      });

      return { success: true };
    }),

  // ==================== LOGS D'ACTIVITÉ ====================

  // Liste des logs d'activité
  getActivityLogs: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      type: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { page, limit, type, userId, startDate, endDate } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) {
        conditions.push(eq(activityLog.type, type as any));
      }
      if (userId) {
        conditions.push(eq(activityLog.userId, userId));
      }
      if (startDate) {
        conditions.push(gte(activityLog.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(activityLog.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, totalCount] = await Promise.all([
        db
          .select({
            id: activityLog.id,
            type: activityLog.type,
            description: activityLog.description,
            metadata: activityLog.metadata,
            ipAddress: activityLog.ipAddress,
            createdAt: activityLog.createdAt,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          })
          .from(activityLog)
          .leftJoin(user, eq(activityLog.userId, user.id))
          .where(whereClause)
          .orderBy(desc(activityLog.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(activityLog).where(whereClause),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count ?? 0,
          totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
        },
      };
    }),

  // ==================== GESTION DES GROUPES ====================

  // Liste de tous les groupes
  listAllGroups: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      type: z.enum(["CLASS", "CLUB"]).optional(),
    }))
    .query(async ({ input }) => {
      const { page, limit, search, type } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) {
        conditions.push(ilike(group.name, `%${search}%`));
      }
      if (type) {
        conditions.push(eq(group.type, type));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [groups, totalCount] = await Promise.all([
        db
          .select({
            id: group.id,
            name: group.name,
            type: group.type,
            isArchived: group.isArchived,
            createdAt: group.createdAt,
            teacher: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          })
          .from(group)
          .leftJoin(user, eq(group.teacherId, user.id))
          .where(whereClause)
          .orderBy(desc(group.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(group).where(whereClause),
      ]);

      // Récupérer le nombre de membres pour chaque groupe
      const groupIds = groups.map(g => g.id);

      let memberCountMap: Record<string, number> = {};

      if (groupIds.length > 0) {
        const memberCounts = await db
          .select({
            groupId: groupMember.groupId,
            count: count(),
          })
          .from(groupMember)
          .where(sql`${groupMember.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(groupMember.groupId);

        memberCountMap = memberCounts.reduce((acc, { groupId, count }) => {
          acc[groupId] = count;
          return acc;
        }, {} as Record<string, number>);
      }

      return {
        groups: groups.map(g => ({
          ...g,
          memberCount: memberCountMap[g.id] ?? 0,
        })),
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count ?? 0,
          totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
        },
      };
    }),

  // Supprimer un groupe
  deleteGroup: adminProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [targetGroup] = await db
        .select()
        .from(group)
        .where(eq(group.id, input.groupId))
        .limit(1);

      if (!targetGroup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Groupe non trouvé" });
      }

      await db.delete(group).where(eq(group.id, input.groupId));

      // Logger l'action
      await logActivity("group_deleted", `Groupe "${targetGroup.name}" supprimé par admin`, {
        actorId: ctx.session.user.id,
        metadata: { groupName: targetGroup.name, groupType: targetGroup.type },
      });

      return { success: true };
    }),

  // ==================== CONFIGURATION SYSTÈME ====================

  // Obtenir une configuration
  getConfig: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const [config] = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, input.key))
        .limit(1);

      return config ?? null;
    }),

  // Définir une configuration
  setConfig: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db
        .insert(systemConfig)
        .values({
          key: input.key,
          value: input.value,
          description: input.description,
        })
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: {
            value: input.value,
            description: input.description,
          },
        });

      return { success: true };
    }),

  // Vérifier si un admin existe (setup initial)
  checkAdminExists: protectedProcedure.query(async () => {
    const [admin] = await db
      .select()
      .from(user)
      .where(eq(user.role, "ADMIN"))
      .limit(1);

    return { exists: !!admin };
  }),

  // Promouvoir le premier utilisateur en admin (uniquement si aucun admin n'existe)
  setupFirstAdmin: protectedProcedure.mutation(async ({ ctx }) => {
    // Vérifier qu'aucun admin n'existe
    const [existingAdmin] = await db
      .select()
      .from(user)
      .where(eq(user.role, "ADMIN"))
      .limit(1);

    if (existingAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Un administrateur existe déjà"
      });
    }

    // Promouvoir l'utilisateur courant en admin
    await db
      .update(user)
      .set({ role: "ADMIN" })
      .where(eq(user.id, ctx.session.user.id));

    // Logger l'action
    await logActivity("admin_action", "Premier administrateur configuré", {
      userId: ctx.session.user.id,
      actorId: ctx.session.user.id,
    });

    return { success: true };
  }),
});
