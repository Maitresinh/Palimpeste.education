import { db } from "@lectio/db";
import * as schema from "@lectio/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import * as React from "react";

import { sendEmail } from "./lib/email";
import {
  VerificationEmail,
  ResetPasswordEmail,
  TwoFactorEmail,
} from "./emails";

const isSecure = process.env.NEXT_PUBLIC_SERVER_URL?.startsWith("https://");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Vérifiez votre email - Conpagina",
        react: React.createElement(VerificationEmail, { url }),
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de mot de passe - Conpagina",
        react: React.createElement(ResetPasswordEmail, { url }),
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "STUDENT",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: isSecure ? "none" : "lax",
      secure: isSecure,
      httpOnly: true,
    },
  },
  plugins: [
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: "Code de vérification - Conpagina",
            react: React.createElement(TwoFactorEmail, { otp }),
          });
        },
      },
    }),
  ],
});
