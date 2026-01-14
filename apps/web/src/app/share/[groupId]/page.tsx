"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Users,
  BookOpen,
  Clock,
  Quote,
  Calendar,
  Send,
  CheckCircle,
  LogIn,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export default function PublicGroupPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [requestMessage, setRequestMessage] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Vérifier si l'utilisateur est connecté
  const { data: privateData, isLoading: isLoadingAuth } = useQuery(
    trpc.privateData.queryOptions()
  );
  const isLoggedIn = !!privateData?.user;

  // Tracker le clic (une seule fois au chargement)
  const trackClick = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${serverUrl}/trpc/sharing.trackClick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      return response.json();
    },
  });

  useEffect(() => {
    trackClick.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Récupérer les infos publiques du groupe
  const { data, isLoading, error } = useQuery(
    trpc.sharing.getPublicGroupInfo.queryOptions({ groupId })
  );

  // Vérifier si l'utilisateur est déjà membre (si connecté)
  const { data: membershipData } = useQuery(
    trpc.notifications.isMemberOfGroup.queryOptions(
      { groupId },
      { enabled: isLoggedIn }
    )
  );

  // Vérifier si une demande est en attente (si connecté)
  const { data: pendingData } = useQuery(
    trpc.notifications.hasRequestPending.queryOptions(
      { groupId },
      { enabled: isLoggedIn }
    )
  );

  const isMember = membershipData?.isMember || false;
  const isTeacher = membershipData?.isTeacher || false;
  const hasPendingRequest = pendingData?.hasPending || false;

  // Mutation pour demander l'accès
  const requestAccess = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${serverUrl}/trpc/notifications.requestGroupAccess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId, message: requestMessage || undefined }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erreur lors de la demande");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Demande envoyée ! L'administrateur du groupe sera notifié.");
      setShowRequestForm(false);
      setRequestMessage("");
      queryClient.invalidateQueries({ queryKey: ["notifications", "hasRequestPending"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Rediriger vers le groupe si déjà membre
  const handleGoToGroup = () => {
    const groupType = data?.group?.type;
    window.location.href = groupType === "CLUB"
      ? `/dashboard/clubs/${groupId}`
      : `/dashboard/groups/${groupId}`;
  };

  // Rediriger vers la connexion avec retour
  const handleLoginRedirect = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("redirectAfterLogin", `/share/${groupId}`);
    }
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Groupe introuvable</CardTitle>
            <CardDescription className="text-center">
              Ce groupe de lecture n'existe pas ou a été supprimé.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button>Retour à l'accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { group, teacher, memberCount, books, timeRemaining, recentCitations, stats } = data;
  const isClub = group.type === "CLUB";

  return (
    <div className="py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header du groupe */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{isClub ? "Club de lecture" : "Classe"}</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{isClub ? "Créé par" : "Animé par"}</span>
                  <span className="font-semibold text-foreground">{teacher.name}</span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{memberCount}</div>
                <div className="text-sm text-muted-foreground">{isClub ? "Membre" : "Lecteur"}{memberCount > 1 ? "s" : ""}</div>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{books.length}</div>
                <div className="text-sm text-muted-foreground">Livre{books.length > 1 ? "s" : ""}</div>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <Quote className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{stats.totalShares}</div>
                <div className="text-sm text-muted-foreground">Citation{stats.totalShares > 1 ? "s" : ""}</div>
              </div>

              {timeRemaining ? (
                <div className={`text-center p-4 rounded-lg ${timeRemaining.expired
                  ? "bg-red-50 dark:bg-red-950"
                  : "bg-green-50 dark:bg-green-950"
                  }`}>
                  <Clock className={`h-6 w-6 mx-auto mb-2 ${timeRemaining.expired ? "text-red-600" : "text-green-600"
                    }`} />
                  {timeRemaining.expired ? (
                    <>
                      <div className="text-lg font-bold text-red-600">Terminé</div>
                      <div className="text-sm text-red-600/70">Échéance passée</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">
                        {timeRemaining.days}j {timeRemaining.hours}h
                      </div>
                      <div className="text-sm text-green-600/70">Restants</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-lg font-bold">∞</div>
                  <div className="text-sm text-muted-foreground">Sans échéance</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Livres du groupe */}
        {books.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Livres {isClub ? "du club" : "de la classe"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {books.map((book: { id: string; title: string; author: string | null }) => (
                  <div
                    key={book.id}
                    className="flex items-center gap-4 p-3 bg-muted rounded-lg"
                  >
                    <div className="shrink-0 w-12 h-16 bg-muted rounded overflow-hidden flex items-center justify-center relative">
                      <img
                        src={`${serverUrl}/api/cover/${book.id}`}
                        alt={`Couverture de ${book.title}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <BookOpen className="h-6 w-6 text-muted-foreground absolute" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{book.title}</h3>
                      {book.author && (
                        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Citations partagées */}
        {recentCitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="h-5 w-5" />
                Citations partagées
              </CardTitle>
              <CardDescription>
                Les dernières citations publiées par les membres du groupe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCitations.map((citation: {
                  id: string;
                  citationText: string;
                  bookTitle: string;
                  userName: string;
                  createdAt: string;
                }) => (
                  <div
                    key={citation.id}
                    className="relative p-4 bg-muted rounded-lg border-l-4 border-border"
                  >
                    <Quote className="absolute top-2 right-2 h-6 w-6 text-muted-foreground/20" />
                    <blockquote className="italic text-foreground/80 mb-3 pr-8">
                      "{citation.citationText.length > 200
                        ? citation.citationText.substring(0, 200) + "..."
                        : citation.citationText}"
                    </blockquote>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-medium">{citation.bookTitle}</span>
                      <span>— {citation.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA pour rejoindre */}
        <Card>
          <CardContent className="p-8">
            {isMember ? (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h2 className="text-2xl font-bold mb-2">Vous êtes membre de ce groupe</h2>
                <p className="text-muted-foreground mb-6">
                  {isTeacher ? "Vous êtes l'administrateur de ce groupe." : "Vous avez accès à tous les livres et annotations."}
                </p>
                <Button size="lg" onClick={handleGoToGroup}>
                  Accéder au groupe
                </Button>
              </div>
            ) : hasPendingRequest ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-amber-600 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Demande en cours</h2>
                <p className="text-muted-foreground">
                  Votre demande d'accès a été envoyée. Le professeur la traitera prochainement.
                </p>
              </div>
            ) : isLoggedIn ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Envie de rejoindre ce groupe ?</h2>

                {!showRequestForm ? (
                  <>
                    <p className="text-muted-foreground mb-6">
                      Envoyez une demande au professeur pour rejoindre ce groupe de lecture.
                    </p>
                    <Button size="lg" onClick={() => setShowRequestForm(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Demander à rejoindre
                    </Button>
                  </>
                ) : (
                  <div className="max-w-md mx-auto space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Expliquez pourquoi vous souhaitez rejoindre ce groupe (optionnel) :
                    </p>
                    <Input
                      placeholder="Ex: Je suis étudiant en littérature et ce livre m'intéresse..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      maxLength={500}
                    />
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRequestForm(false);
                          setRequestMessage("");
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => requestAccess.mutate()}
                        disabled={requestAccess.isPending}
                      >
                        {requestAccess.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Envoyer la demande
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Envie de rejoindre ce groupe ?</h2>
                <p className="text-muted-foreground mb-6">
                  Connectez-vous pour demander l'accès à ce groupe de lecture.
                </p>
                <Button size="lg" onClick={handleLoginRedirect}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Se connecter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Propulsé par <strong>Conpagina</strong> - La plateforme de lecture collaborative</p>
        </div>
      </div>
    </div>
  );
}
