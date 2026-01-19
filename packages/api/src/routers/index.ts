import { protectedProcedure, publicProcedure, router } from "../index";
import { groupsRouter } from "./groups";
import { userRouter } from "./user";
import { documentsRouter } from "./documents";
import { readingRouter } from "./reading";
import { sharingRouter } from "./sharing";
import { notificationsRouter } from "./notifications";
import { adminRouter } from "./admin";
import { siteRouter } from "./site";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  groups: groupsRouter,
  user: userRouter,
  documents: documentsRouter,
  reading: readingRouter,
  sharing: sharingRouter,
  notifications: notificationsRouter,
  admin: adminRouter,
  site: siteRouter,
});
export type AppRouter = typeof appRouter;
