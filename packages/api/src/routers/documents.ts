import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db, document, readingProgress, groupMember, group, user, eq, and, isNull, desc, sql } from "@lectio/db";
import { protectedProcedure, router } from "../index";

export const documentsRouter = router({
  // Récupérer les livres personnels de l'utilisateur
  getMyBooks: protectedProcedure.query(async ({ ctx }) => {
    const books = await db
      .select()
      .from(document)
      .where(
        and(
          eq(document.ownerId, ctx.session.user.id),
          isNull(document.groupId) // Livres personnels uniquement
        )
      )
      .orderBy(desc(document.createdAt));

    return books;
  }),

  // Récupérer les livres personnels + progression de lecture de l'utilisateur
  getMyBooksWithProgress: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        book: document,
        progress: readingProgress,
      })
      .from(document)
      .leftJoin(
        readingProgress,
        and(
          eq(readingProgress.documentId, document.id),
          eq(readingProgress.userId, ctx.session.user.id)
        )
      )
      .where(and(eq(document.ownerId, ctx.session.user.id), isNull(document.groupId)))
      .orderBy(desc(document.createdAt));

    return rows.map((r) => ({
      ...r.book,
      progress: r.progress
        ? {
          id: r.progress.id,
          currentLocation: r.progress.currentLocation,
          progressPercentage: r.progress.progressPercentage,
          lastReadAt: r.progress.lastReadAt,
          updatedAt: r.progress.updatedAt,
        }
        : null,
    }));
  }),

  // Récupérer les livres d'un groupe
  getGroupBooks: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est membre ou propriétaire du groupe
      const userRole = ctx.session.user.role || "STUDENT";

      if (userRole === "STUDENT") {
        // Vérifier l'appartenance au groupe
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
      }

      // Récupérer les livres du groupe avec progression
      const rows = await db
        .select({
          book: document,
          progress: readingProgress,
        })
        .from(document)
        .leftJoin(
          readingProgress,
          and(
            eq(readingProgress.documentId, document.id),
            eq(readingProgress.userId, ctx.session.user.id)
          )
        )
        .where(eq(document.groupId, input.groupId))
        .orderBy(desc(document.createdAt));

      return rows.map((r) => ({
        ...r.book,
        progress: r.progress
          ? {
            id: r.progress.id,
            currentLocation: r.progress.currentLocation,
            progressPercentage: r.progress.progressPercentage,
            lastReadAt: r.progress.lastReadAt,
            updatedAt: r.progress.updatedAt,
          }
          : null,
      }));
    }),

  // Récupérer un livre par ID
  getBook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [book] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Book not found",
        });
      }

      // Vérifier les permissions
      const isOwner = book.ownerId === ctx.session.user.id;
      let isTeacher = false;

      if (!isOwner && book.groupId) {
        // Vérifier l'appartenance au groupe
        const [membership] = await db
          .select()
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, book.groupId),
              eq(groupMember.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this book",
          });
        }
      } else if (!isOwner && !book.groupId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this book",
        });
      }

      // Vérifier si l'utilisateur est le professeur du groupe
      if (book.groupId) {
        const [groupInfo] = await db
          .select({ teacherId: group.teacherId })
          .from(group)
          .where(eq(group.id, book.groupId))
          .limit(1);

        if (groupInfo) {
          isTeacher = groupInfo.teacherId === ctx.session.user.id;
        }
      }

      return { ...book, isTeacher };
    }),

  // Supprimer un livre (propriétaire uniquement)
  deleteBook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [book] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Book not found",
        });
      }

      if (book.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can delete this book",
        });
      }

      // Supprimer le fichier physique du disque
      const fileSize = parseInt(book.filesize || "0", 10);
      try {
        await unlink(path.join(process.cwd(), book.filepath));
      } catch (err) {
        console.warn(`Failed to delete file ${book.filepath}:`, err);
      }

      await db.delete(document).where(eq(document.id, input.id));

      // Décrémenter le stockage utilisé
      if (fileSize > 0) {
        await db.update(user)
          .set({ storageUsed: sql`GREATEST(0, ${user.storageUsed} - ${fileSize})` })
          .where(eq(user.id, ctx.session.user.id));
      }

      return { success: true };
    }),

  // Supprimer un livre d'un groupe (enseignant du groupe uniquement)
  removeBookFromGroup: protectedProcedure
    .input(z.object({ bookId: z.string(), groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Note: We now rely on group membership role (OWNER/ADMIN) instead of global role.
      // This allows Students who own Clubs to manage them.

      // Vérifier que le groupe existe et appartient à l'enseignant
      const [foundGroup] = await db
        .select()
        .from(group)
        .where(eq(group.id, input.groupId))
        .limit(1);

      if (!foundGroup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      // Vérifier les permissions via groupMemeber (nouveau système RBAC)
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
          message: "Only group admins can remove books",
        });
      }

      // Vérifier que le livre existe et appartient au groupe
      const [book] = await db
        .select()
        .from(document)
        .where(
          and(
            eq(document.id, input.bookId),
            eq(document.groupId, input.groupId)
          )
        )
        .limit(1);

      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Book not found in this group",
        });
      }

      // Supprimer le fichier physique du disque
      try {
        await unlink(path.join(process.cwd(), book.filepath));
      } catch (err) {
        console.warn(`Failed to delete file ${book.filepath}:`, err);
      }

      // Supprimer le livre de la base de données
      await db.delete(document).where(eq(document.id, input.bookId));

      return { success: true };
    }),

  // Copier un livre personnel vers un groupe (sans re-upload)
  copyToGroup: protectedProcedure
    .input(z.object({
      bookId: z.string(),
      groupId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Logic update: In CLUBs everyone can add books, in CLASS only admins.
      // This check is now performed later after fetching the group type.

      // Vérifier que le livre existe et appartient à l'utilisateur
      const [book] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.bookId))
        .limit(1);

      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Book not found",
        });
      }

      if (book.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only copy your own books",
        });
      }

      // Récupérer le groupe et vérifier les droits
      const [foundGroup] = await db
        .select()
        .from(group)
        .where(eq(group.id, input.groupId))
        .limit(1);

      if (!foundGroup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      // Vérifier les permissions via groupMember
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
          message: "You are not a member of this group",
        });
      }

      // Logique de permission : seul le propriétaire ou l'admin peut ajouter des livres
      // (Valable pour CLASS et CLUB maintenant)
      if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only group admins can add books",
        });
      }

      // Créer une copie du livre dans le groupe (même fichier, nouvelle entrée)
      const id = crypto.randomUUID();
      const [newBook] = await db
        .insert(document)
        .values({
          id,
          title: book.title,
          author: book.author,
          filename: book.filename,
          filepath: book.filepath, // Même fichier physique
          filesize: book.filesize,
          mimeType: book.mimeType,
          ownerId: ctx.session.user.id,
          groupId: input.groupId,
        })
        .returning();

      return { success: true, book: newBook };
    }),
});

