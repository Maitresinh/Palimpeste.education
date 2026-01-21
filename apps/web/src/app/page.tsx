"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/footer";
import MyBooks from "@/components/my-books";
import PublicLibraryPreview from "@/components/public-library-preview";
import { Users, BookOpen, MessageSquare, Highlighter, BarChart3, Palette, ArrowRight, Globe, Library } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { useSiteConfig } from "@/hooks/use-site-config";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import TeacherGroups from "@/components/teacher-groups";
import StudentGroups from "@/components/student-groups";


const ALL_FEATURES = [
  {
    key: "epub",
    icon: BookOpen,
    title: "Livres EPUB",
    description: "Importez et lisez vos livres numériques directement dans le navigateur.",
    color: "text-blue-500",
  },
  {
    key: "annotations",
    icon: Highlighter,
    title: "Annotations",
    description: "Surlignez les passages importants et ajoutez vos commentaires.",
    color: "text-yellow-500",
  },
  {
    key: "discussions",
    icon: MessageSquare,
    title: "Discussions",
    description: "Créez des threads de discussion sur n'importe quelle annotation.",
    color: "text-green-500",
  },
  {
    key: "groups",
    icon: Users,
    title: "Classes & Clubs",
    description: "Organisez vos élèves en groupes pour la lecture collaborative.",
    color: "text-purple-500",
  },
  {
    key: "progress",
    icon: BarChart3,
    title: "Progression",
    description: "Suivez automatiquement votre avancement dans chaque livre.",
    color: "text-orange-500",
  },
  {
    key: "customization",
    icon: Palette,
    title: "Personnalisation",
    description: "Thèmes, polices et taille de texte adaptés à votre confort.",
    color: "text-pink-500",
  },
];

function LandingPage() {
  const { config } = useSiteConfig();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative inline-block">
          <span className="absolute -top-3 -right-6 bg-black text-white dark:bg-white dark:text-black text-xs font-semibold px-2 py-1 rounded">BETA</span>
          <img
            src={config.siteLogo}
            alt={config.siteName}
            className={`w-auto mb-6 ${config.siteLogoInvert ? "dark:invert" : ""}`}
            style={{ height: `${8 * config.siteLogoZoom / 100}rem` }}
          />
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
          {config.siteTagline}
        </p>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-8">
          {config.siteSubtitle}
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Commencer
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features">En savoir plus</a>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 scroll-mt-16">
        <h2 className="text-2xl font-semibold text-center mb-10">Fonctionnalités</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {ALL_FEATURES
            .filter((feature) => config.homepageFeatures.includes(feature.key))
            .map((feature) => (
              <Card key={feature.key} className="group hover:border-foreground/20 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 py-16 text-center border-t">
        <h2 className="text-xl font-semibold mb-4">{config.ctaTitle}</h2>
        <p className="text-muted-foreground mb-6">{config.ctaDescription}</p>
        <Button asChild size="lg">
          <Link href="/login">Créer un compte</Link>
        </Button>
      </section>

      <Footer />
    </div>
  );
}

function Dashboard() {
  const privateData = useQuery(trpc.privateData.queryOptions());
  const userRole = (privateData.data?.user as any)?.role || "STUDENT";
  const { config } = useSiteConfig();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-3 py-2 flex-1">
        <div className="flex justify-center">
          <div className="relative inline-block mb-6">
            <span className="absolute -right-4 bg-black text-white dark:bg-white dark:text-black text-[8px] font-semibold px-1.5 py-0.5 rounded z-10">BETA</span>
            <img
              src={config.siteLogo}
              alt={config.siteName}
              className={`w-auto ${config.siteLogoInvert ? "dark:invert" : ""}`}
              style={{ height: `${5 * config.siteLogoZoom / 100}rem` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href="/dashboard/books" className="flex items-center gap-2 hover:underline decoration-1 underline-offset-4">
                  <Library className="h-4 w-4" />
                  Mes lectures
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MyBooks />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href={"/dashboard/library" as any} className="flex items-center gap-2 hover:underline decoration-1 underline-offset-4">
                  <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Bibliothèque publique
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PublicLibraryPreview />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href="/dashboard/groups" className="flex items-center gap-2 hover:underline decoration-1 underline-offset-4">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Mes classes
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(userRole === "TEACHER" || userRole === "ADMIN") && <TeacherGroups filterType="CLASS" variant="compact" />}
              {userRole === "STUDENT" && <StudentGroups filterType="CLASS" variant="compact" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href={"/dashboard/clubs" as any} className="flex items-center gap-2 hover:underline decoration-1 underline-offset-4">
                  <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Mes clubs
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudentGroups filterType="CLUB" variant="compact" />
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ApiStatus() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <Card className="!py-2 !gap-0">
      <CardContent className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">API</span>
        <div
          className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className={healthCheck.data ? "text-green-600" : "text-red-600"}>
          {healthCheck.isLoading
            ? "..."
            : healthCheck.data
              ? "Connecté"
              : "Erreur"}
        </span>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  return (
    <>
      {session ? <Dashboard /> : <LandingPage />}

      {/* API Status - visible pour tous */}
      <div className="px-3 pb-3">
        <ApiStatus />
      </div>
    </>
  );
}
