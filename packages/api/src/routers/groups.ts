import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, group, groupMember, user, document, readingProgress, annotation, eq, and, count, desc } from "@lectio/db";
import { protectedProcedure, router } from "../index";

// Fonction pour générer un code d'invitation unique
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const groupsRouter = router({
  // Créer un groupe (Etudiants -> CLUB seulement, Profs -> TOUT)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: z.enum(["CLASS", "CLUB"]).default("CLASS"),
        deadline: z.string().optional(), // Date ISO string
        autoArchive: z.boolean().optional().default(false),
        allowSocialExport: z.boolean().optional().default(true),
        annotationHubEnabled: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérification des droits de création
      const userRole = ctx.session.user.role;

      if (input.type === "CLASS" && userRole !== "TEACHER" && userRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only teachers can create classes",
        });
      }

      const inviteCode = generateInviteCode();

      return await db.transaction(async (tx) => {
        const [newGroup] = await tx
          .insert(group)
          .values({
            id: crypto.randomUUID(),
            name: input.name,
            teacherId: ctx.session.user.id, // Gardé pour compatibilité, mais le vrai OWNER est dans groupMember
            type: input.type,
            inviteCode,
            deadline: input.deadline ? new Date(input.deadline) : null,
            autoArchive: input.autoArchive,
            isArchived: false,
            allowSocialExport: input.allowSocialExport,
            annotationHubEnabled: input.annotationHubEnabled,
          })
          .returning();

        if (!newGroup) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create group" });

        // Ajouter le créateur comme OWNER
        await tx.insert(groupMember).values({
          groupId: newGroup.id,
          userId: ctx.session.user.id,
          role: "OWNER",
        });

        return newGroup;
      });
    }),

  // Rejoindre un groupe avec un code d'invitation
  join: protectedProcedure
    .input(
      z.object({
        inviteCode: z.string().length(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [foundGroup] = await db
        .select()
        .from(group)
        .where(eq(group.inviteCode, input.inviteCode))
        .limit(1);

      if (!foundGroup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      const [existingMember] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, foundGroup.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already a member of this group",
        });
      }

      await db.insert(groupMember).values({
        groupId: foundGroup.id,
        userId: ctx.session.user.id,
        role: "MEMBER", // Rôle par défaut
      });

      return foundGroup;
    }),

  // Récupérer tous les groupes (OWNER, ADMIN ou MEMBER)
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // On récupère tous les groupes via la table de membre
    const memberships = await db
      .select({
        group: group,
        role: groupMember.role,
        creatorName: user.name,
      })
      .from(groupMember)
      .innerJoin(group, eq(groupMember.groupId, group.id))
      .leftJoin(user, eq(group.teacherId, user.id))
      .where(eq(groupMember.userId, userId));

    // Enrichir avec les stats (nombre de membres, nombre de livres, covers)
    const enrichedGroups = await Promise.all(
      memberships.map(async (m) => {
        // Nombre de membres
        const [membersCount] = await db
          .select({ count: count() })
          .from(groupMember)
          .where(eq(groupMember.groupId, m.group.id));

        // Nombre de livres
        const [booksCount] = await db
          .select({ count: count() })
          .from(document)
          .where(eq(document.groupId, m.group.id));

        // Derniers livres pour les covers (max 3)
        const latestBooks = await db
          .select({
            id: document.id,
            title: document.title,
          })
          .from(document)
          .where(eq(document.groupId, m.group.id))
          .orderBy(desc(document.createdAt))
          .limit(3);

        return {
          ...m.group,
          userRole: m.role,
          creatorName: m.creatorName,
          _count: {
            members: membersCount?.count || 0,
            books: booksCount?.count || 0,
          },
          latestBooks,
        };
      })
    );

    return enrichedGroups;
  }),

  // Récupérer les détails d'un groupe
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [foundGroup] = await db
        .select()
        .from(group)
        .where(eq(group.id, input.id))
        .limit(1);

      if (!foundGroup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      // Vérifier l'appartenance via la table groupMember
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this group",
        });
      }

      return {
        ...foundGroup,
        userRole: membership.role,
      };
    }),

  // Récupérer les membres d'un groupe
  getMembers: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier accès
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this group",
        });
      }

      // Récupérer les membres avec leurs rôles
      return await db
        .select({
          groupId: groupMember.groupId,
          userId: groupMember.userId,
          role: groupMember.role,
          joinedAt: groupMember.joinedAt,
          userName: user.name,
          userImage: user.image,
          userEmail: user.email
        })
        .from(groupMember)
        .innerJoin(user, eq(groupMember.userId, user.id))
        .where(eq(groupMember.groupId, input.groupId));
    }),

  // Récupérer détails avancés des membres (OWNER/ADMIN seulement)
  getMembersWithDetails: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier rôle admin/owner
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only group admins can view detailed stats",
        });
      }

      // ... (Reste de la logique de statistiques inchangée, adaptée si besoin)
      // Récupérer les membres avec leurs infos utilisateur
      const members = await db
        .select({
          membership: groupMember,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(groupMember)
        .innerJoin(user, eq(groupMember.userId, user.id))
        .where(eq(groupMember.groupId, input.groupId));

      // Récupérer les livres du groupe
      const groupBooks = await db
        .select()
        .from(document)
        .where(eq(document.groupId, input.groupId));

      // Pour chaque membre, récupérer la progression et les annotations
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          // Progression de lecture pour chaque livre du groupe
          const progressList = await Promise.all(
            groupBooks.map(async (book) => {
              const [prog] = await db
                .select()
                .from(readingProgress)
                .where(
                  and(
                    eq(readingProgress.userId, member.user.id),
                    eq(readingProgress.documentId, book.id)
                  )
                )
                .limit(1);

              return {
                bookId: book.id,
                bookTitle: book.title,
                progressPercentage: prog?.progressPercentage || 0,
                lastReadAt: prog?.lastReadAt || null,
              };
            })
          );

          // Nombre d'annotations par livre
          const annotationCounts = await Promise.all(
            groupBooks.map(async (book) => {
              const annotations = await db
                .select({ id: annotation.id })
                .from(annotation)
                .where(
                  and(
                    eq(annotation.userId, member.user.id),
                    eq(annotation.documentId, book.id)
                  )
                );

              return {
                bookId: book.id,
                count: annotations.length,
              };
            })
          );

          // Calcul de la progression moyenne
          const avgProgress = progressList.length > 0
            ? Math.round(progressList.reduce((acc, p) => acc + p.progressPercentage, 0) / progressList.length)
            : 0;

          // Total des annotations
          const totalAnnotations = annotationCounts.reduce((acc, a) => acc + a.count, 0);

          return {
            ...member.user,
            role: member.membership.role, // Ajout du rôle
            joinedAt: member.membership.joinedAt,
            avgProgress,
            totalAnnotations,
            progressByBook: progressList,
            annotationsByBook: annotationCounts,
          };
        })
      );

      return membersWithDetails;
    }),

  // Récupérer les annotations d'un membre pour un livre
  getMemberAnnotations: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      userId: z.string(),
      documentId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Vérifier que le demandeur est OWNER ou ADMIN du groupe
      const [executor] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!executor || (executor.role !== "OWNER" && executor.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      // Récupérer les annotations
      return await db
        .select({
          id: annotation.id,
          selectedText: annotation.selectedText,
          comment: annotation.comment,
          highlightColor: annotation.highlightColor,
          createdAt: annotation.createdAt,
        })
        .from(annotation)
        .where(
          and(
            eq(annotation.userId, input.userId),
            eq(annotation.documentId, input.documentId)
          )
        )
        .orderBy(annotation.createdAt);
    }),

  // Retirer un membre (OWNER ou ADMIN)
  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier les droits de l'exécutant
      const [executor] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!executor || (executor.role !== "OWNER" && executor.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to remove members",
        });
      }

      // Vérifier le rôle de la cible
      const [target] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, input.userId)
          )
        )
        .limit(1);

      if (!target) return { success: true };

      // Protection: Admin ne peut pas virer Owner
      if (executor.role === "ADMIN" && target.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove the Owner",
        });
      }

      // Ne pas permettre de retirer soi-même (utiliser "leave" pour ça)
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself, use leave group instead",
        });
      }

      await db
        .delete(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.groupId),
            eq(groupMember.userId, input.userId)
          )
        );

      return { success: true };
    }),

  // Supprimer un groupe (OWNER uniquement)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership || membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the group owner can delete it",
        });
      }

      await db.delete(group).where(eq(group.id, input.id));

      return { success: true };
    }),

  // ... (Garder les autres méthodes comme regenerateInviteCode, updateDeadline, archive en vérifiant OWNER/ADMIN)
  regenerateInviteCode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const newInviteCode = generateInviteCode();

      const [updatedGroup] = await db
        .update(group)
        .set({ inviteCode: newInviteCode })
        .where(eq(group.id, input.id))
        .returning();

      return updatedGroup;
    }),

  // Archiver (OWNER)
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership || membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owner can archive",
        });
      }

      const [archivedGroup] = await db
        .update(group)
        .set({
          isArchived: true,
          archivedAt: new Date(),
        })
        .where(eq(group.id, input.id))
        .returning();

      return archivedGroup;
    }),

  // Désarchiver (OWNER)
  unarchive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, input.id),
            eq(groupMember.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!membership || membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owner can unarchive",
        });
      }

      const [unarchivedGroup] = await db
        .update(group)
        .set({
          isArchived: false,
          archivedAt: null,
        })
        .where(eq(group.id, input.id))
        .returning();

      return unarchivedGroup;
    }),
  // Vérifier et archiver automatiquement les groupes dont la deadline est passée
  checkAutoArchive: protectedProcedure
    .query(async () => {
      const now = new Date();

      // Trouver tous les groupes avec autoArchive activé, non archivés, et dont la deadline est passée
      const groupsToArchive = await db
        .select()
        .from(group)
        .where(
          and(
            eq(group.autoArchive, true),
            eq(group.isArchived, false)
          )
        );

      const archivedGroups = [];

      for (const g of groupsToArchive) {
        if (g.deadline && new Date(g.deadline) < now) {
          const [archived] = await db
            .update(group)
            .set({
              isArchived: true,
              archivedAt: now,
            })
            .where(eq(group.id, g.id))
            .returning();

          archivedGroups.push(archived);
        }
      }

      return { archivedCount: archivedGroups.length, archivedGroups };
    }),
});

