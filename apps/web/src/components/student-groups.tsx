"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, LogIn, Library, ChevronRight, Plus, Clock, Archive, Calendar, AlertCircle, BookOpen } from "lucide-react";

export default function StudentGroups({ filterType, variant = "full" }: { filterType?: "CLASS" | "CLUB"; variant?: "compact" | "full" }) {
  const [inviteCode, setInviteCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const queryClient = useQueryClient();
  const router = useRouter();

  // Récupérer les classes et clubs de l'étudiant
  const { data: groups, isLoading, refetch: refetchGroups } = useQuery(
    trpc.groups.list.queryOptions()
  );

  const { data: privateData } = useQuery(
    trpc.privateData.queryOptions()
  );
  const currentUserId = privateData?.user?.id;

  // Mutation pour créer un groupe (CLUB)
  const createGroup = useMutation({
    mutationFn: async (data: {
      name: string;
      type: "CLUB";
    }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erreur lors de la création");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Club de lecture créé !");
      setNewGroupName("");
      setIsCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de la création du club");
    },
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      createGroup.mutate({
        name: newGroupName,
        type: "CLUB",
      });
    }
  };

  // Mutation pour rejoindre une classe ou un club
  const joinGroup = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erreur lors de l'adhésion");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      toast.success(`Vous avez rejoint la classe !`);
      setInviteCode("");
      setIsJoinDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Code d'invitation invalide");
    },
  });

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().length === 8) {
      joinGroup.mutate(inviteCode.toUpperCase());
    } else {
      toast.error("Le code doit contenir 8 caractères");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Filter groups
  const displayedGroups = filterType
    ? groups?.filter((g: any) => g.type === filterType)
    : groups;

  // Version compacte pour la homepage
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {displayedGroups?.length || 0} {filterType === "CLASS" ? "classe" : "club"}{(displayedGroups?.length || 0) > 1 ? "s" : ""}
          </p>
        </div>
        {displayedGroups && displayedGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucun {filterType === "CLUB" ? "club" : "classe"}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayedGroups?.slice(0, 4).map((g: any) => (
              <CompactGroupCard key={g.id} g={g} currentUserId={currentUserId} />
            ))}
          </div>
        )}
        {(displayedGroups?.length || 0) > 4 && (
          <Link
            href={(filterType === "CLUB" ? "/dashboard/clubs" : "/dashboard/groups") as any}
            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
          >
            Voir tout ({displayedGroups?.length})
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }

  // Version complète (full) - Sinon, afficher la liste des groupes
  return (
    <div className="space-y-4">
      {/* Show header only if NOT filtered (legacy/single view) */}
      {!filterType ? (
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/groups" className="inline-flex items-center gap-2 hover:underline">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mes Groupes
              </h2>
            </Link>
            <p className="text-sm text-muted-foreground">
              {groups?.length || 0} groupe{(groups?.length || 0) > 1 ? "s" : ""}
            </p>
          </div>

          {/* Bouton pour ouvrir le dialog - Default View (Both) */}
          <div className="flex items-center gap-2">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) setNewGroupName("");
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un club
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Nouveau Club de Lecture
                  </DialogTitle>
                  <DialogDescription>
                    Créez un espace pour partager des livres avec vos amis.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  {/* ... create form ... */}
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Nom du club</Label>
                    <Input
                      id="clubName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ex: Club Sci-Fi"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createGroup.isPending || !newGroupName.trim()}
                      className="flex-1 gap-2"
                    >
                      {createGroup.isPending ? "Création..." : "Créer le club"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isJoinDialogOpen}
              onOpenChange={(open) => {
                setIsJoinDialogOpen(open);
                if (!open) {
                  setInviteCode("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Rejoindre
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-green-600" />
                    Rejoindre un groupe
                  </DialogTitle>
                  <DialogDescription>
                    Entrez le code d'invitation fourni par votre enseignant ou ami
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Code d'invitation</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC12345"
                      maxLength={8}
                      className="font-mono text-lg tracking-widest text-center"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      8 caractères (lettres et chiffres)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsJoinDialogOpen(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={joinGroup.isPending || inviteCode.length !== 8}
                      className="flex-1 gap-2"
                    >
                      {joinGroup.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Adhésion...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Rejoindre
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {displayedGroups?.length || 0} {filterType === "CLASS" ? "classe" : "club"}{(displayedGroups?.length || 0) > 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-2">
            {/* Only show "Create Club" if filterType is CLUB */}
            {filterType === "CLUB" && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Créer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Nouveau Club de Lecture
                    </DialogTitle>
                    <DialogDescription>
                      Créez un espace pour partager des livres avec vos amis.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubName">Nom du club</Label>
                      <Input
                        id="clubName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Ex: Club Sci-Fi"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={createGroup.isPending || !newGroupName.trim()}
                        className="flex-1 gap-2"
                      >
                        {createGroup.isPending ? "Création..." : "Créer le club"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Always show Join button as you can join both */}
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" variant={filterType === "CLUB" ? "default" : "outline"}>
                  <LogIn className="h-4 w-4" />
                  Rejoindre
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-green-600" />
                    Rejoindre un groupe
                  </DialogTitle>
                  <DialogDescription>
                    Entrez le code d'invitation fourni par votre enseignant ou ami
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Code d'invitation</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC12345"
                      maxLength={8}
                      className="font-mono text-lg tracking-widest text-center"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      8 caractères (lettres et chiffres)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsJoinDialogOpen(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={joinGroup.isPending || inviteCode.length !== 8}
                      className="flex-1 gap-2"
                    >
                      {joinGroup.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Adhésion...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Rejoindre
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}


      {/* Liste des groupes rejoints - MODIFIED LOGIC */}
      {displayedGroups && displayedGroups.length === 0 ? (
        <Card className="border-dashed shadow-none bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-2">
              {filterType === "CLUB" ? <BookOpen className="h-5 w-5 text-muted-foreground" /> : <Users className="h-5 w-5 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Aucun {filterType === "CLUB" ? "club" : "classe"} rejoint
            </p>
            {/* Contextual actions for empty state */}
            {!filterType && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer un club
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsJoinDialogOpen(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Rejoindre
                </Button>
              </div>
            )}
            {filterType === "CLUB" && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer
                </Button>
              </div>
            )}
            {filterType === "CLASS" && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsJoinDialogOpen(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Rejoindre une classe
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filterType ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedGroups?.map((g: any) => (
                <GroupCard key={g.id} g={g} currentUserId={currentUserId} />
              ))}
            </div>
          ) : (
            <>
              {/* Legacy View */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b">
                  <Users className="h-4 w-4" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Mes Classes</h3>
                </div>

                {groups?.filter((g: any) => g.type === "CLASS").length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-4">Aucune classe rejointe.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groups?.filter((g: any) => g.type === "CLASS").map((g: any) => (
                      <GroupCard key={g.id} g={g} currentUserId={currentUserId} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b">
                  <BookOpen className="h-4 w-4" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Mes clubs de lecture</h3>
                </div>

                {groups?.filter((g: any) => g.type === "CLUB").length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-4">Aucun club rejoint.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groups?.filter((g: any) => g.type === "CLUB").map((g: any) => (
                      <GroupCard key={g.id} g={g} currentUserId={currentUserId} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Extracted Card Component for cleaner code
function GroupCard({ g, currentUserId }: { g: any, currentUserId?: string }) {
  const router = useRouter();

  const isArchived = g.isArchived;
  const hasDeadline = !!g.deadline;
  const isExpired = hasDeadline && new Date(g.deadline) < new Date();
  const deadlineDate = hasDeadline ? new Date(g.deadline) : null;
  const memberCount = g._count?.members || 0;

  const isCreator = currentUserId && g.teacherId === currentUserId;
  const creatorDisplay = isCreator ? "Moi" : (g.creatorName || "Inconnu");

  // Calculer le temps restant
  const getTimeRemaining = () => {
    if (!deadlineDate) return null;
    const now = new Date();
    const diff = deadlineDate.getTime() - now.getTime();
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 7) return null;
    if (days > 0) return `${days}j restants`;
    if (hours > 0) return `${hours}h`;
    return "<1h";
  };

  const timeRemaining = getTimeRemaining();
  const isUrgent = timeRemaining && !isArchived && !isExpired;

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors ${isArchived ? 'opacity-60 border-dashed' : ''} ${isUrgent ? 'border-amber-300 dark:border-amber-700' : ''}`}
      onClick={() => router.push((g.type === "CLUB" ? `/dashboard/clubs/${g.id}` : `/dashboard/groups/${g.id}`) as any)}
    >
      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm truncate">{g.name}</h3>
          <span className="text-[10px] text-muted-foreground">
            Par {creatorDisplay}
          </span>
          {isArchived && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
              <Archive className="h-2.5 w-2.5" />
              Archivé
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded">
              <AlertCircle className="h-2.5 w-2.5" />
              {timeRemaining}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{memberCount} {g.type === "CLASS" ? ("élève" + (memberCount > 1 ? "s" : "")) : ("membre" + (memberCount > 1 ? "s" : ""))}</span>
          <span>•</span>
          <span>Rejoint {new Date(g.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          {hasDeadline && (
            <>
              <span>•</span>
              <span className={isExpired ? 'text-red-500' : ''}>
                {isExpired ? 'Expiré' : `Échéance ${deadlineDate?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bloc Livres (Stack + Compte) */}
      <div className="flex flex-col items-center gap-1 mx-2">
        {g.latestBooks && g.latestBooks.length > 0 && (
          <div className="flex items-center pl-2">
            {g.latestBooks.map((book: any, i: number) => (
              <div
                key={book.id}
                className={`relative w-8 h-10 rounded-sm overflow-hidden border border-background shadow-sm ${i > 0 ? '-ml-5' : ''}`}
                style={{ zIndex: g.latestBooks.length - i }}
              >
                <img
                  src={`${process.env.NEXT_PUBLIC_SERVER_URL}/api/cover/${book.id}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/5" />
              </div>
            ))}
          </div>
        )}
        {(g._count?.books || 0) > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium">
            {g._count?.books} livr{(g._count?.books > 1 ? "es" : "e")}
          </span>
        )}
      </div>

      {/* Code du groupe */}
      <span className="hidden sm:inline text-xs font-mono text-muted-foreground shrink-0">{g.inviteCode}</span>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
}

// Composant compact pour la Homepage
function CompactGroupCard({ g, currentUserId }: { g: any, currentUserId?: string }) {
  const router = useRouter();
  const isArchived = g.isArchived;
  const memberCount = g._count?.members || 0;
  const booksCount = g._count?.books || 0;

  const isCreator = currentUserId && g.teacherId === currentUserId;
  const creatorDisplay = isCreator ? "Moi" : (g.creatorName || "Inconnu");

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors ${isArchived ? 'opacity-50' : ''}`}
      onClick={() => router.push((g.type === "CLUB" ? `/dashboard/clubs/${g.id}` : `/dashboard/groups/${g.id}`) as any)}
    >
      {/* Partie Gauche : Infos Textuelles */}
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="text-sm font-semibold truncate">{g.name}</span>
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          <span className="text-muted-foreground">
            Par {creatorDisplay}
          </span>
          <span>
            {memberCount} {g.type === "CLASS" ? ("élève" + (memberCount > 1 ? "s" : "")) : ("membre" + (memberCount > 1 ? "s" : ""))}
          </span>
        </div>
      </div>

      {/* Partie Droite : Livres et Flèche */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Bloc Livres (Stack + Compte) */}
        {booksCount > 0 && (
          <div className="flex flex-col items-center gap-1">
            {g.latestBooks && g.latestBooks.length > 0 && (
              <div className="flex items-center pl-2">
                {g.latestBooks.map((book: any, i: number) => (
                  <div
                    key={book.id}
                    className={`relative w-8 h-10 rounded-sm overflow-hidden border border-background shadow-sm ${i > 0 ? '-ml-5' : ''}`}
                    style={{ zIndex: g.latestBooks.length - i }}
                  >
                    <img
                      src={`${process.env.NEXT_PUBLIC_SERVER_URL}/api/cover/${book.id}`}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/5" />
                  </div>
                ))}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">
              {booksCount} livr{(booksCount > 1 ? "es" : "e")}
            </span>
          </div>
        )}

        {/* Flèche de navigation */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
