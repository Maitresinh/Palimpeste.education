import { db } from "@lectio/db";
import * as schema from "@lectio/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";

import { sendEmail } from "./lib/email";

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
        text: `Bienvenue sur Conpagina!\n\nCliquez sur ce lien pour vérifier votre email:\n${url}\n\nCe lien expire dans 24 heures.`,
        html: `
          <h1>Bienvenue sur Conpagina!</h1>
          <p>Cliquez sur le bouton ci-dessous pour vérifier votre email:</p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Vérifier mon email</a>
          <p style="margin-top:16px;color:#666;">Ce lien expire dans 24 heures.</p>
        `,
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
        text: `Vous avez demandé une réinitialisation de mot de passe.\n\nCliquez sur ce lien pour réinitialiser votre mot de passe:\n${url}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.`,
        html: `
          <h1>Réinitialisation de mot de passe</h1>
          <p>Vous avez demandé une réinitialisation de mot de passe.</p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Réinitialiser mon mot de passe</a>
          <p style="margin-top:16px;color:#666;">Ce lien expire dans 1 heure.</p>
          <p style="color:#999;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        `,
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
          // Only send 2FA for admin users
          await sendEmail({
            to: user.email,
            subject: "Code de vérification - Conpagina",
            text: `Votre code de vérification: ${otp}\n\nCe code expire dans 5 minutes.`,
            html: `
              <h1>Code de vérification</h1>
              <p>Votre code de vérification est:</p>
              <div style="font-size:32px;font-weight:bold;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;letter-spacing:4px;">${otp}</div>
              <p style="margin-top:16px;color:#666;">Ce code expire dans 5 minutes.</p>
            `,
          });
        },
      },
    }),
  ],
});

