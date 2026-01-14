import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Reader from "./reader";

export default async function ReadPage({ 
  params 
}: { 
  params: Promise<{ bookId: string }> 
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

  const { bookId } = await params;

  return <Reader bookId={bookId} />;
}

