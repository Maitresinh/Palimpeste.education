"use client";

import { useState } from "react";
import { 
  Search, 
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case "CLASS":
      return <Badge className="bg-blue-600">Classe</Badge>;
    case "CLUB":
      return <Badge className="bg-purple-600">Club</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery(trpc.admin.listAllGroups.queryOptions({
    page,
    limit: 20,
    search: search || undefined,
    type: typeFilter as "CLASS" | "CLUB" | undefined,
  }));

  const deleteGroupMutation = useMutation(trpc.admin.deleteGroup.mutationOptions());

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroupMutation.mutateAsync({ groupId: selectedGroup.id });
      toast.success("Groupe supprimé");
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Groupes</h1>
        <p className="text-muted-foreground">
          Visualisez et gérez tous les groupes de la plateforme
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un groupe..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={typeFilter || "all"} 
              onValueChange={(value) => {
                setTypeFilter(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="CLASS">Classes</SelectItem>
                <SelectItem value="CLUB">Clubs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table des groupes */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun groupe trouvé
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead>Membres</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.groups.map((group: {
                    id: string;
                    name: string;
                    type: string;
                    createdAt: string;
                    isArchived: boolean;
                    memberCount: number;
                    teacher?: { name: string; email: string } | null;
                  }) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell><TypeBadge type={group.type} /></TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{group.teacher?.name}</div>
                          <div className="text-xs text-muted-foreground">{group.teacher?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {group.memberCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(group.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {group.isArchived ? (
                          <Badge variant="secondary">Archivé</Badge>
                        ) : (
                          <Badge className="bg-green-600">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedGroup({ id: group.id, name: group.name });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} sur {data.pagination.totalPages} ({data.pagination.total} groupes)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={page === data.pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le groupe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le groupe <strong>{selectedGroup?.name}</strong> ? 
              Cette action est irréversible et supprimera tous les documents et membres associés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
