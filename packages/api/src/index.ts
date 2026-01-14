import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Middleware pour les enseignants
export const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.role || (ctx.session.user.role !== "TEACHER" && ctx.session.user.role !== "ADMIN")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher role required",
      cause: "Insufficient permissions",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Middleware pour les administrateurs
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.role || ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role required",
      cause: "Insufficient permissions",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

