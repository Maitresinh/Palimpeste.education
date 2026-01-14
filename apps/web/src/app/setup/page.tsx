"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SetupPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: adminExists, isLoading: checkingAdmin } = useQuery({
    ...trpc.admin.checkAdminExists.queryOptions(),
    enabled: !!session?.user
  });

  const setupMutation = useMutation(trpc.admin.setupFirstAdmin.mutationOptions());

  const handleSetup = async () => {
    try {
      await setupMutation.mutateAsync();
      toast.success("Vous êtes maintenant administrateur !");
      router.push("/admin" as any);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la configuration");
    }
  };

  // Rediriger si pas connecté
  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionPending, router]);

  // Rediriger si un admin existe déjà
  useEffect(() => {
    if (adminExists?.exists) {
      router.push("/dashboard");
    }
  }, [adminExists, router]);

  // Afficher le loader tant qu'on vérifie session OU admin
  if (sessionPending || checkingAdmin || !adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Si un admin existe, ne rien afficher (la redirection est en cours)
  if (adminExists.exists) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Configuration initiale</CardTitle>
          <CardDescription>
            Bienvenue dans Conpagina ! Aucun administrateur n'a encore été configuré.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Premier administrateur</AlertTitle>
            <AlertDescription>
              En cliquant sur le bouton ci-dessous, votre compte <strong>{session.user.email}</strong> sera
              promu administrateur avec un accès complet à la plateforme.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>En tant qu'administrateur, vous pourrez :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Gérer tous les utilisateurs de la plateforme</li>
              <li>Approuver ou rejeter les demandes de compte enseignant</li>
              <li>Créer des comptes enseignant directement</li>
              <li>Visualiser les logs d'activité</li>
              <li>Gérer tous les groupes et contenus</li>
            </ul>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSetup}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Configuration...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Devenir administrateur
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
