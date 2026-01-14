import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import AdminShell from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Vérifier que l'utilisateur est admin
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
