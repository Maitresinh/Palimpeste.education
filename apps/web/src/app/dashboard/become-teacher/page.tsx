"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function BecomeTeacherPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery(trpc.user.me.queryOptions());
  const { data: existingRequest, isLoading } = useQuery(trpc.user.getTeacherRequestStatus.queryOptions());
  
  const submitMutation = useMutation(trpc.user.requestTeacherRole.mutationOptions());

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({ message, organization: organization || undefined });
      toast.success("Demande envoyée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["user", "getTeacherRequestStatus"] });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    }
  };

  // Si l'utilisateur est déjà enseignant ou admin
  if (user?.role === "TEACHER" || user?.role === "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Vous êtes déjà {user.role === "ADMIN" ? "administrateur" : "enseignant"}
            </CardTitle>
            <CardDescription>
              Vous avez déjà accès aux fonctionnalités enseignant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/groups")}>
              Aller à mes classes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si une demande existe
  if (existingRequest) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Votre demande de compte enseignant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingRequest.status === "pending" && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  Demande en attente
                  <Badge variant="secondary">En cours de traitement</Badge>
                </AlertTitle>
                <AlertDescription>
                  Votre demande a été envoyée le {new Date(existingRequest.createdAt).toLocaleDateString("fr-FR")}. 
                  Un administrateur l'examinera prochainement.
                </AlertDescription>
              </Alert>
            )}

            {existingRequest.status === "approved" && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Demande approuvée !</AlertTitle>
                <AlertDescription>
                  Votre demande a été approuvée. Rechargez la page pour accéder aux fonctionnalités enseignant.
                </AlertDescription>
              </Alert>
            )}

            {existingRequest.status === "rejected" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Demande rejetée</AlertTitle>
                <AlertDescription>
                  {existingRequest.responseMessage || "Votre demande n'a pas été approuvée."}
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Votre message :</h4>
              <p className="text-sm text-muted-foreground">{existingRequest.message}</p>
              {existingRequest.organization && (
                <p className="text-sm text-muted-foreground mt-2">
                  Organisation : {existingRequest.organization}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Devenir enseignant
          </CardTitle>
          <CardDescription>
            Demandez un compte enseignant pour créer des classes et gérer des élèves.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-6"
          >
            <Alert>
              <GraduationCap className="h-4 w-4" />
              <AlertTitle>Pourquoi devenir enseignant ?</AlertTitle>
              <AlertDescription>
                En tant qu'enseignant, vous pourrez :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Créer des classes et des clubs de lecture</li>
                  <li>Ajouter des livres EPUB pour vos élèves</li>
                  <li>Suivre la progression de lecture de vos élèves</li>
                  <li>Gérer les annotations et discussions</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="organization">Établissement / Organisation (optionnel)</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Ex: Lycée Victor Hugo, Paris"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Pourquoi souhaitez-vous devenir enseignant ? *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Expliquez votre situation : êtes-vous professeur, formateur, animateur d'un club de lecture..."
                rows={4}
                required
                minLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 caractères. Cette information aidera les administrateurs à traiter votre demande.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={submitMutation.isPending || message.length < 10}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Envoyer ma demande
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
