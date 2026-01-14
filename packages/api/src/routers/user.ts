import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db, user, teacherRequest, notification, eq, and, desc, gte } from "@lectio/db";
import { protectedProcedure, router } from "../index";

export const userRouter = router({
  // Récupérer le profil de l'utilisateur courant avec son rôle
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.session.user.id,
      name: ctx.session.user.name,
      email: ctx.session.user.email,
      role: ctx.session.user.role || "STUDENT",
      image: ctx.session.user.image,
    };
  }),

  // Demander à devenir enseignant
  requestTeacherRole: protectedProcedure
    .input(z.object({
      message: z.string().min(10, "Veuillez expliquer pourquoi vous souhaitez devenir enseignant"),
      organization: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est déjà enseignant ou admin
      if (ctx.session.user.role === "TEACHER" || ctx.session.user.role === "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous êtes déjà enseignant ou administrateur",
        });
      }

      // Vérifier s'il y a déjà une demande en attente
      const [existingRequest] = await db
        .select()
        .from(teacherRequest)
        .where(and(
          eq(teacherRequest.userId, userId),
          eq(teacherRequest.status, "pending")
        ))
        .limit(1);

      if (existingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Vous avez déjà une demande en attente",
        });
      }

      // Vérifier si une demande a été rejetée récemment (7 jours de délai)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [recentRejection] = await db
        .select()
        .from(teacherRequest)
        .where(and(
          eq(teacherRequest.userId, userId),
          eq(teacherRequest.status, "rejected"),
          gte(teacherRequest.updatedAt, sevenDaysAgo)
        ))
        .limit(1);

      if (recentRejection) {
        const rejectDate = new Date(recentRejection.updatedAt);
        const canRetryDate = new Date(rejectDate);
        canRetryDate.setDate(canRetryDate.getDate() + 7);
        
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Votre dernière demande a été rejetée. Vous pourrez soumettre une nouvelle demande le ${canRetryDate.toLocaleDateString("fr-FR")}.`,
        });
      }

      // Créer la demande
      await db.insert(teacherRequest).values({
        id: crypto.randomUUID(),
        userId,
        message: input.message,
        organization: input.organization,
      });

      // Notifier les admins
      const admins = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, "ADMIN"));

      for (const admin of admins) {
        await db.insert(notification).values({
          id: crypto.randomUUID(),
          userId: admin.id,
          type: "system",
          title: "Nouvelle demande enseignant",
          message: `${ctx.session.user.name} souhaite devenir enseignant.`,
          actionUrl: "/admin/teacher-requests",
        });
      }

      return { success: true };
    }),

  // Vérifier le statut de la demande enseignant
  getTeacherRequestStatus: protectedProcedure.query(async ({ ctx }) => {
    const [request] = await db
      .select()
      .from(teacherRequest)
      .where(eq(teacherRequest.userId, ctx.session.user.id))
      .orderBy(desc(teacherRequest.createdAt))
      .limit(1);

    return request ?? null;
  }),
});

