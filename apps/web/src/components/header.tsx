"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useReaderContext } from "@/contexts/reader-context";

import { ModeToggle } from "./mode-toggle";
import { NotificationBell } from "./notification-bell";
import UserMenu from "./user-menu";

export default function Header() {
  const pathname = usePathname();
  const { isHeaderVisible, isReaderPage } = useReaderContext();
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // On reader pages, animate the header visibility
  if (isReaderPage) {
    return (
      <div
        className={`overflow-hidden transition-[max-height,transform,opacity] duration-300 ease-in-out ${isHeaderVisible
          ? "max-h-24 translate-y-0 opacity-100"
          : "max-h-0 -translate-y-2 opacity-0 pointer-events-none"
          }`}
      >
        <div className="flex flex-row items-center justify-between px-2 py-1">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="relative">
                <span className="absolute -top-1 -right-6 z-10 bg-black text-white dark:bg-white dark:text-black text-[8px] font-semibold px-1 py-0.5 rounded">BETA</span>
                <img src="/logo.png" alt="Conpagina" className="h-8 w-auto dark:invert" />
              </div>
            </Link>
            <nav className="flex gap-1">
              {links.map(({ to, label }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    href={to}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
        <hr />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="relative">
              <span className="absolute -top-1 -right-4 z-10 bg-black text-white dark:bg-white dark:text-black text-[8px] font-semibold px-1 py-0.5 rounded">BETA</span>
              <img src="/logo.png" alt="Conpagina" className="h-8 w-auto dark:invert" />
            </div>
          </Link>
          <nav className="flex gap-1">
            {links.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  href={to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
