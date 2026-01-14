import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  db,
  group,
  groupMember,
  user,
  document,
  annotation,
  sharedCitation,
  groupShareStats,
  eq,
  and,
  desc,
  count
} from "@lectio/db";
import { protectedProcedure, publicProcedure, router } from "../index";

export const sharingRouter = router({
  // Partager une citation sur les réseaux sociaux
  shareCitation: protectedProcedure
    .input(
      z.object({
        annotationId: z.string(),
        platform: z.enum(["twitter", "facebook", "linkedin", "copy_link"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annotation avec les infos du document
      const [ann] = await db
        .select({
          annotation: annotation,
          document: document,
        })
        .from(annotation)
        .innerJoin(document, eq(annotation.documentId, document.id))
        .where(eq(annotation.id, input.annotationId))
        .limit(1);

      if (!ann) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annotation not found",
        });
      }

      // Vérifier que l'utilisateur a accès à cette annotation
      const hasAccess = ann.annotation.userId === ctx.session.user.id;
      if (!hasAccess && ann.document.groupId) {
        // Vérifier si l'utilisateur est membre du groupe
        const [membership] = await db
          .select()
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, ann.document.groupId),
              eq(groupMember.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          // Vérifier si c'est le professeur du groupe
          const [grp] = await db
            .select()
            .from(group)
            .where(eq(group.id, ann.document.groupId))
            .limit(1);

          if (!grp || grp.teacherId !== ctx.session.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have access to this annotation",
            });
          }
        }
      }

      // Si pas de groupe associé, on ne peut pas partager avec lien vers le groupe
      if (!ann.document.groupId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only annotations from group books can be shared",
        });
      }

      // Créer l'entrée de partage
      const shareId = crypto.randomUUID();
      const insertResult = await db
        .insert(sharedCitation)
        .values({
          id: shareId,
          annotationId: ann.annotation.id,
          userId: ctx.session.user.id,
          groupId: ann.document.groupId,
          documentId: ann.document.id,
          platform: input.platform,
          citationText: ann.annotation.selectedText,
          bookTitle: ann.document.title,
          bookAuthor: null, // TODO: extraire du metadata EPUB si disponible
        })
        .returning();

      const shared = insertResult[0];
      if (!shared) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create share entry",
        });
      }

      // Mettre à jour les stats du groupe
      const [existingStats] = await db
        .select()
        .from(groupShareStats)
        .where(eq(groupShareStats.groupId, ann.document.groupId))
        .limit(1);

      if (existingStats) {
        await db
          .update(groupShareStats)
          .set({
            totalShares: existingStats.totalShares + 1,
          })
          .where(eq(groupShareStats.groupId, ann.document.groupId));
      } else {
        await db.insert(groupShareStats).values({
          id: crypto.randomUUID(),
          groupId: ann.document.groupId,
          totalShares: 1,
          totalClicks: 0,
        });
      }

      return {
        shareId: shared.id,
        groupId: ann.document.groupId,
      };
    }),

  // Récupérer les informations publiques d'un groupe (pour la page de partage)
  getPublicGroupInfo: publicProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      // Récupérer le groupe
      const [grp] = await db
        .select({
          id: group.id,
          name: group.name,
          type: group.type,
          deadline: group.deadline,
          createdAt: group.createdAt,
          teacherId: group.teacherId,
        })
        .from(group)
        .where(eq(group.id, input.groupId))
        .limit(1);

      if (!grp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      // Récupérer le nombre de membres
      const membersResult = await db
        .select({ count: count() })
        .from(groupMember)
        .where(eq(groupMember.groupId, input.groupId));

      const memberCount = membersResult[0]?.count || 0;

      // Récupérer le professeur
      const [teacher] = await db
        .select({
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, grp.teacherId))
        .limit(1);

      // Récupérer les livres du groupe
      const books = await db
        .select({
          id: document.id,
          title: document.title,
          author: document.author,
        })
        .from(document)
        .where(eq(document.groupId, input.groupId));

      // Récupérer les citations partagées récentes (max 10)
      const recentCitations = await db
        .select({
          id: sharedCitation.id,
          citationText: sharedCitation.citationText,
          bookTitle: sharedCitation.bookTitle,
          createdAt: sharedCitation.createdAt,
          userName: user.name,
        })
        .from(sharedCitation)
        .innerJoin(user, eq(sharedCitation.userId, user.id))
        .where(eq(sharedCitation.groupId, input.groupId))
        .orderBy(desc(sharedCitation.createdAt))
        .limit(10);

      // Récupérer les stats de partage
      const [stats] = await db
        .select()
        .from(groupShareStats)
        .where(eq(groupShareStats.groupId, input.groupId))
        .limit(1);

      // Calculer le temps restant
      let timeRemaining = null;
      if (grp.deadline) {
        const now = new Date();
        const deadline = new Date(grp.deadline);
        const diffMs = deadline.getTime() - now.getTime();

        if (diffMs > 0) {
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          timeRemaining = {
            days: diffDays,
            hours: diffHours,
            expired: false,
          };
        } else {
          timeRemaining = {
            days: 0,
            hours: 0,
            expired: true,
          };
        }
      }

      return {
        group: {
          id: grp.id,
          name: grp.name,
          type: grp.type,
          createdAt: grp.createdAt,
        },
        teacher: teacher || { name: "Anonyme", image: null },
        memberCount: memberCount + 1, // +1 pour inclure le professeur
        books,
        timeRemaining,
        recentCitations,
        stats: stats || { totalShares: 0, totalClicks: 0 },
      };
    }),

  // Tracker un clic sur un lien partagé
  trackClick: publicProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      // Mettre à jour les stats du groupe
      const [existingStats] = await db
        .select()
        .from(groupShareStats)
        .where(eq(groupShareStats.groupId, input.groupId))
        .limit(1);

      if (existingStats) {
        await db
          .update(groupShareStats)
          .set({
            totalClicks: existingStats.totalClicks + 1,
          })
          .where(eq(groupShareStats.groupId, input.groupId));
      } else {
        await db.insert(groupShareStats).values({
          id: crypto.randomUUID(),
          groupId: input.groupId,
          totalShares: 0,
          totalClicks: 1,
        });
      }

      return { success: true };
    }),

  // Récupérer les stats de partage pour un groupe (enseignant)
  getShareStats: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est le professeur du groupe
      const [grp] = await db
        .select()
        .from(group)
        .where(eq(group.id, input.groupId))
        .limit(1);

      if (!grp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      if (grp.teacherId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the group teacher can view share stats",
        });
      }

      // Récupérer les stats
      const [stats] = await db
        .select()
        .from(groupShareStats)
        .where(eq(groupShareStats.groupId, input.groupId))
        .limit(1);

      // Récupérer toutes les citations partagées avec détails
      const citations = await db
        .select({
          id: sharedCitation.id,
          citationText: sharedCitation.citationText,
          bookTitle: sharedCitation.bookTitle,
          platform: sharedCitation.platform,
          clickCount: sharedCitation.clickCount,
          createdAt: sharedCitation.createdAt,
          userName: user.name,
        })
        .from(sharedCitation)
        .innerJoin(user, eq(sharedCitation.userId, user.id))
        .where(eq(sharedCitation.groupId, input.groupId))
        .orderBy(desc(sharedCitation.createdAt));

      // Stats par plateforme
      const platformStats = await db
        .select({
          platform: sharedCitation.platform,
          count: count(),
        })
        .from(sharedCitation)
        .where(eq(sharedCitation.groupId, input.groupId))
        .groupBy(sharedCitation.platform);

      return {
        stats: stats || { totalShares: 0, totalClicks: 0 },
        citations,
        platformStats,
      };
    }),

  // Récupérer les annotations partageables pour un document
  getShareableAnnotations: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier que le document appartient à un groupe
      const [doc] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.documentId))
        .limit(1);

      if (!doc || !doc.groupId) {
        return [];
      }

      // Vérifier l'accès au groupe
      const [grp] = await db
        .select()
        .from(group)
        .where(eq(group.id, doc.groupId))
        .limit(1);

      if (!grp) {
        return [];
      }

      const isTeacher = grp.teacherId === ctx.session.user.id;

      if (!isTeacher) {
        const [membership] = await db
          .select()
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, doc.groupId),
              eq(groupMember.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          return [];
        }
      }

      // Récupérer les annotations de l'utilisateur pour ce document
      const annotations = await db
        .select({
          id: annotation.id,
          selectedText: annotation.selectedText,
          highlightColor: annotation.highlightColor,
          comment: annotation.comment,
          createdAt: annotation.createdAt,
        })
        .from(annotation)
        .where(
          and(
            eq(annotation.documentId, input.documentId),
            eq(annotation.userId, ctx.session.user.id)
          )
        )
        .orderBy(desc(annotation.createdAt));

      return annotations;
    }),
});
