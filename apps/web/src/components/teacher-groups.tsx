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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Users, Plus, Copy, RefreshCw, Trash2, Library, ChevronRight, Clock, Archive, ArchiveRestore, Calendar, Share2, MessageSquare, BookOpen, LogIn } from "lucide-react";

export default function TeacherGroups({ filterType, variant = "full" }: { filterType?: "CLASS" | "CLUB"; variant?: "compact" | "full" }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupType, setGroupType] = useState<"CLASS" | "CLUB">(filterType || "CLASS");
  const [deadline, setDeadline] = useState<string>("");
  const [autoArchive, setAutoArchive] = useState(false);
  const [allowSocialExport, setAllowSocialExport] = useState(true);
  const [annotationHubEnabled, setAnnotationHubEnabled] = useState(true);
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const router = useRouter();

  // Update logic to set default type when opening modal based on filterType
  const handleOpenCreate = () => {
    setGroupType(filterType || "CLASS");
    setIsCreating(!isCreating);
  };

  // Récupérer les classes et clubs
  const { data: groups, isLoading, refetch: refetchGroups } = useQuery(
    trpc.groups.list.queryOptions()
  );

  // Mutation pour créer une classe ou un club
  const createGroup = useMutation({
    mutationFn: async (data: {
      name: string;
      type: "CLASS" | "CLUB";
      deadline?: string;
      autoArchive: boolean;
      allowSocialExport: boolean;
      annotationHubEnabled: boolean;
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
      toast.success("Classe créée avec succès !");
      setNewGroupName("");
      setDeadline("");
      setAutoArchive(false);
      setAllowSocialExport(true);
      setAnnotationHubEnabled(true);
      setIsCreating(false);
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });

  // Mutation pour supprimer
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Supprimé");
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Mutation pour régénérer le code
  const regenerateCode = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.regenerateInviteCode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur lors de la régénération");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Code d'invitation régénéré");
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de la régénération");
    },
  });

  // Mutation pour archiver
  const archiveGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur lors de l'archivage");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Archivé");
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage");
    },
  });

  // Mutation pour désarchiver
  const unarchiveGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.unarchive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur lors de la désarchivage");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Désarchivé");
      await queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      await refetchGroups();
    },
    onError: () => {
      toast.error("Erreur lors de la désarchivage");
    },
  });

  // Mutation pour rejoindre un club
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
    onSuccess: async () => {
      toast.success(`Vous avez rejoint le club !`);
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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      createGroup.mutate({
        name: newGroupName,
        type: groupType,
        deadline: deadline || undefined,
        autoArchive,
        allowSocialExport,
        annotationHubEnabled,
      });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié dans le presse-papier !");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Filter groups if a filterType is provided
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
              <CompactGroupCard key={g.id} g={g} />
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
      {/* Header logic */}
      <div className="flex items-center justify-between">
        {!filterType ? (
          <div>
            <Link href="/dashboard/groups" className="inline-flex items-center gap-2 hover:underline">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mes Classes & Clubs
              </h2>
            </Link>
            <p className="text-sm text-muted-foreground">
              {groups?.length || 0} élément{(groups?.length || 0) > 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {displayedGroups?.length || 0} {filterType === "CLASS" ? "classe" : "club"}{(displayedGroups?.length || 0) > 1 ? "s" : ""}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Dialog
            open={isJoinDialogOpen}
            onOpenChange={(open) => {
              setIsJoinDialogOpen(open);
              if (!open) setInviteCode("");
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                Rejoindre
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-green-600" />
                  Rejoindre
                </DialogTitle>
                <DialogDescription>
                  Entrez le code d'invitation pour rejoindre une classe ou un club
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

          <Button
            onClick={handleOpenCreate}
            size="sm"
            variant={isCreating ? "outline" : "default"}
            className="gap-2"
          >
            {isCreating ? "Annuler" : (
              <>
                <Plus className="h-4 w-4" />
                Créer {filterType ? (filterType === "CLASS" ? "une classe" : "un club") : ""}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Formulaire de création */}
      {isCreating && (
        filterType === "CLUB" ? (
          /* Formulaire simplifié pour les clubs (identique aux étudiants) */
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Nouveau Club de Lecture
              </CardTitle>
              <CardDescription className="text-xs">Créez un espace pour partager des livres avec vos amis.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newGroupName.trim()) {
                  createGroup.mutate({
                    name: newGroupName,
                    type: "CLUB",
                    autoArchive: false,
                    allowSocialExport: true,
                    annotationHubEnabled: true,
                  });
                }
              }} className="space-y-4">
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
                    onClick={() => setIsCreating(false)}
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
            </CardContent>
          </Card>
        ) : (
          /* Formulaire complet pour les classes */
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nouvelle {filterType === "CLASS" ? "classe" : ""}</CardTitle>
              <CardDescription className="text-xs">Partagez des livres avec vos élèves</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-sm">Nom</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Français 3ème A"
                    required
                  />
                </div>

                {/* Sélection du Type de Groupe - Only show if NO filterType is provided, otherwise it's fixed */}
                {!filterType && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`cursor-pointer rounded-md border-2 p-3 flex flex-col items-center gap-2 hover:bg-accent transition-all ${groupType === "CLASS" ? "border-primary bg-accent" : "border-transparent bg-background"
                          }`}
                        onClick={() => setGroupType("CLASS")}
                      >
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200">
                          <Users className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold">Classe</span>
                      </div>
                      <div
                        className={`cursor-pointer rounded-md border-2 p-3 flex flex-col items-center gap-2 hover:bg-accent transition-all ${groupType === "CLUB" ? "border-primary bg-accent" : "border-transparent bg-background"
                          }`}
                        onClick={() => setGroupType("CLUB")}
                      >
                        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold">Club de Lecture</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {groupType === "CLASS"
                        ? "Structure hiérarchique : seul l'enseignant ajoute des livres."
                        : "Structure collaborative : tous les membres ajoutent des livres."}
                    </p>
                  </div>
                )}

                {/* Section échéance */}
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Échéance (optionnel)</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-xs text-muted-foreground">
                      Date limite
                    </Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {deadline && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <Label htmlFor="autoArchive" className="text-xs font-medium">
                          Archivage automatique
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Archivage automatique à l'échéance
                        </p>
                      </div>
                      <Switch
                        id="autoArchive"
                        checked={autoArchive}
                        onCheckedChange={setAutoArchive}
                      />
                    </div>
                  )}


                  {deadline && !autoArchive && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ L'échéance sera affichée aux élèves mais vous devrez archiver manuellement
                    </p>
                  )}
                </div>

                {/* Section options avancées */}
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Options</span>

                  {/* Toggle partage social */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="allowSocialExport" className="text-xs font-medium">
                          Autoriser le partage sur les réseaux
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Les élèves peuvent partager leurs citations sur Twitter, etc.
                      </p>
                    </div>
                    <Switch
                      id="allowSocialExport"
                      checked={allowSocialExport}
                      onCheckedChange={setAllowSocialExport}
                    />
                  </div>

                  {/* Toggle hub d'annotations */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="annotationHubEnabled" className="text-xs font-medium">
                          Hub d'annotations centralisé
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Vue centralisée de toutes les annotations
                      </p>
                    </div>
                    <Switch
                      id="annotationHubEnabled"
                      checked={annotationHubEnabled}
                      onCheckedChange={setAnnotationHubEnabled}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createGroup.isPending}
                  className="w-full gap-2"
                  size="sm"
                >
                  {createGroup.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Créer
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      )}

      {/* Liste des groupes */}
      {displayedGroups && displayedGroups.length === 0 ? (
        <Card className="border-dashed bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-2">
              {filterType === "CLUB" ? <BookOpen className="h-5 w-5 text-muted-foreground" /> : <Users className="h-5 w-5 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Aucun {filterType === "CLUB" ? "club" : "classe"} créé
            </p>
            {!isCreating && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsJoinDialogOpen(true)}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Rejoindre {filterType === "CLUB" ? "un club" : "une classe"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer {filterType === "CLUB" ? "un club" : "une classe"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* If filtered, just show the list without Internal Headers */}
          {filterType ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedGroups?.map((g: any) => (
                <GroupCard key={g.id} g={g} />
              ))}
            </div>
          ) : (
            <>
              {/* Legacy view if no filter provided (kept for safety) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b">
                  <Users className="h-4 w-4" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Mes Classes</h3>
                </div>

                {groups?.filter((g: any) => g.type === "CLASS").length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-4">Aucune classe créée.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groups?.filter((g: any) => g.type === "CLASS").map((g: any) => (
                      <GroupCard key={g.id} g={g} />
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
                  <div className="text-sm text-muted-foreground italic py-4">Aucun club créé.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groups?.filter((g: any) => g.type === "CLUB").map((g: any) => (
                      <GroupCard key={g.id} g={g} />
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
function GroupCard({ g }: { g: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refetchGroups = () => queryClient.invalidateQueries({ queryKey: ["groups", "list"] });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      toast.success("Supprimé");
      refetchGroups();
    },
  });

  const archiveGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      toast.success("Archivé");
      refetchGroups();
    }
  });

  const unarchiveGroup = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.unarchive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      toast.success("Désarchivé");
      refetchGroups();
    }
  });

  const regenerateCode = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.regenerateInviteCode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Erreur");
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Code régénéré");

      // Update cache immediately
      queryClient.setQueryData(["groups", "list"], (oldGroups: any[]) => {
        if (!oldGroups) return oldGroups;
        return oldGroups.map(group =>
          group.id === data.id ? { ...group, inviteCode: data.inviteCode } : group
        );
      });

      refetchGroups();
    }
  });


  const isExpired = g.deadline && new Date(g.deadline) < new Date();
  const isArchived = g.isArchived;

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copié !");
  };

  const memberCount = g._count?.members || 0;

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors ${isArchived ? 'opacity-60 border-dashed' : ''}`}
      onClick={() => router.push((g.type === "CLUB" ? `/dashboard/clubs/${g.id}` : `/dashboard/groups/${g.id}`) as any)}
    >
      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm truncate">{g.name}</h3>
          {isArchived && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
              <Archive className="h-2.5 w-2.5" />
              Archivé
            </span>
          )}
          {!isArchived && isExpired && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded">
              Expiré
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{memberCount} {g.type === "CLASS" ? ("élève" + (memberCount > 1 ? "s" : "")) : ("membre" + (memberCount > 1 ? "s" : ""))}</span>
          <span>•</span>
          <span>{new Date(g.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          {g.deadline && (
            <>
              <span>•</span>
              <span className={isExpired ? 'text-red-500' : ''}>
                Échéance {new Date(g.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bloc Livres (Stack + Compte) */}
      <div className="flex flex-col items-center gap-1 mx-4">
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

      {/* Code d'invitation pour admins */}
      {(g.userRole === "OWNER" || g.userRole === "ADMIN") && (
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded text-xs font-mono cursor-pointer hover:bg-muted-foreground/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            copyInviteCode(g.inviteCode);
          }}
          title="Cliquer pour copier"
        >
          <span className="font-bold">{g.inviteCode}</span>
          <Copy className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Actions Owner */}
      {g.userRole === "OWNER" && (
        <div className="flex items-center gap-1">
          {isArchived ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                unarchiveGroup.mutate(g.id);
              }}
              disabled={unarchiveGroup.isPending}
              className="h-7 w-7 p-0 rounded-md bg-transparent hover:!bg-muted-foreground/20"
              title="Désarchiver"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Archiver ? Les élèves ne pourront plus interagir.")) {
                  archiveGroup.mutate(g.id);
                }
              }}
              disabled={archiveGroup.isPending}
              className="h-7 w-7 p-0 rounded-md bg-transparent hover:!bg-muted-foreground/20"
              title="Archiver"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              regenerateCode.mutate(g.id);
            }}
            disabled={regenerateCode.isPending || isArchived}
            className="h-7 w-7 p-0 rounded-md bg-transparent hover:!bg-muted-foreground/20"
            title="Régénérer le code"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Supprimer définitivement ?")) {
                deleteGroup.mutate(g.id);
              }
            }}
            disabled={deleteGroup.isPending}
            className="h-7 w-7 p-0 rounded-md bg-transparent hover:!bg-destructive/20 hover:!text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
}

// Composant compact pour la Homepage
function CompactGroupCard({ g }: { g: any }) {
  const router = useRouter();
  const isArchived = g.isArchived;
  const memberCount = g._count?.members || 0;
  const booksCount = g._count?.books || 0;

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors ${isArchived ? 'opacity-50' : ''}`}
      onClick={() => router.push((g.type === "CLUB" ? `/dashboard/clubs/${g.id}` : `/dashboard/groups/${g.id}`) as any)}
    >
      {/* Partie Gauche : Infos Textuelles */}
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="text-sm font-semibold truncate">{g.name}</span>
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          <span>
            {memberCount} {g.type === "CLASS" ? ("élève" + (memberCount > 1 ? "s" : "")) : ("membre" + (memberCount > 1 ? "s" : ""))}
          </span>
          <span>
            Créé le {new Date(g.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
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

