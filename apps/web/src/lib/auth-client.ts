import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

const baseURL =
  typeof window === "undefined"
    ? process.env.INTERNAL_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL
    : process.env.NEXT_PUBLIC_SERVER_URL;

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.href = "/two-factor";
      },
    }),
  ],
});


