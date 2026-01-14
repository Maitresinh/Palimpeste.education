"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Library, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

function NavItem({
  href,
  label,
  icon,
  variant,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "admin";
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href as any}
      className={[
        "flex flex-col md:flex-row items-center gap-1 md:gap-2 rounded-lg px-3 py-2 text-xs md:text-sm transition-colors",
        isActive
          ? variant === "admin"
            ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
            : "bg-accent text-accent-foreground"
          : variant === "admin"
            ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useQuery(trpc.user.me.queryOptions());
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="w-full h-full">
      {/* Mobile: horizontal nav at top */}
      <div className="md:hidden sticky top-0 z-10 bg-background border-b px-2 py-1">
        <nav className="flex items-stretch">
          <div className="flex-1"><NavItem href="/dashboard/books" label="Livres" icon={<Library className="h-5 w-5" />} /></div>
          <div className="flex-1"><NavItem href="/dashboard/groups" label="Classes" icon={<Users className="h-5 w-5" />} /></div>
          <div className="flex-1"><NavItem href="/dashboard/clubs" label="Clubs" icon={<BookOpen className="h-5 w-5" />} /></div>
          {isAdmin && (
            <div className="flex-1"><NavItem href="/admin" label="Admin" icon={<Shield className="h-5 w-5" />} variant="admin" /></div>
          )}
        </nav>
      </div>

      {/* Desktop: sidebar layout */}
      <div className="hidden md:grid w-full h-full grid-cols-[280px_1fr] gap-4 p-4">
        <Card className="relative overflow-hidden border bg-card text-card-foreground shadow-sm sticky top-4 h-[calc(100svh-5rem)]">
          <div className="p-5">
            <div className="mb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Conpagina
                </div>
                <div className="text-lg font-bold leading-tight">Dashboard</div>
                <div className="text-xs text-muted-foreground">Livres • Classes • Clubs</div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavItem href="/dashboard/books" label="Mes livres" icon={<Library className="h-4 w-4" />} />
              <NavItem href="/dashboard/groups" label="Mes classes" icon={<Users className="h-4 w-4" />} />
              <NavItem href="/dashboard/clubs" label="Mes clubs" icon={<BookOpen className="h-4 w-4" />} />
            </nav>

            {isAdmin && (
              <>
                <div className="my-4 border-t" />
                <nav className="space-y-1">
                  <NavItem href="/admin" label="Administration" icon={<Shield className="h-4 w-4" />} variant="admin" />
                </nav>
              </>
            )}
          </div>
        </Card>

        <main className="min-w-0">
          <div className="rounded-2xl border bg-background p-6">{children}</div>
        </main>
      </div>

      {/* Mobile: content only */}
      <div className="md:hidden p-3">
        <div className="rounded-xl border bg-background p-3">{children}</div>
      </div>
    </div>
  );
}
