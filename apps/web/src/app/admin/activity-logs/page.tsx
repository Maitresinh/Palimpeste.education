"use client";

import { useState } from "react";
import { 
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  GraduationCap,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  FolderPlus,
  FileUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const activityTypeIcons: Record<string, React.ReactNode> = {
  user_signup: <UserPlus className="h-4 w-4 text-green-600" />,
  user_login: <LogIn className="h-4 w-4 text-blue-600" />,
  user_logout: <LogOut className="h-4 w-4 text-gray-600" />,
  user_role_changed: <Shield className="h-4 w-4 text-purple-600" />,
  user_deleted: <Trash2 className="h-4 w-4 text-red-600" />,
  teacher_request: <GraduationCap className="h-4 w-4 text-yellow-600" />,
  teacher_approved: <GraduationCap className="h-4 w-4 text-green-600" />,
  teacher_rejected: <GraduationCap className="h-4 w-4 text-red-600" />,
  group_created: <FolderPlus className="h-4 w-4 text-blue-600" />,
  group_deleted: <Trash2 className="h-4 w-4 text-red-600" />,
  document_uploaded: <FileUp className="h-4 w-4 text-green-600" />,
  document_deleted: <Trash2 className="h-4 w-4 text-red-600" />,
  admin_action: <Shield className="h-4 w-4 text-red-600" />,
};

const activityTypeLabels: Record<string, string> = {
  user_signup: "Inscription",
  user_login: "Connexion",
  user_logout: "Déconnexion",
  user_role_changed: "Changement de rôle",
  user_deleted: "Utilisateur supprimé",
  teacher_request: "Demande enseignant",
  teacher_approved: "Enseignant approuvé",
  teacher_rejected: "Enseignant rejeté",
  group_created: "Groupe créé",
  group_deleted: "Groupe supprimé",
  document_uploaded: "Document uploadé",
  document_deleted: "Document supprimé",
  admin_action: "Action admin",
};

export default function LogsPage() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(trpc.admin.getActivityLogs.queryOptions({
    page,
    limit: 50,
    type: typeFilter,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activité</h1>
        <p className="text-muted-foreground">
          Historique des actions sur la plateforme
        </p>
      </div>

      {/* Filtre */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select 
              value={typeFilter || "all"} 
              onValueChange={(value) => {
                setTypeFilter(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrer par type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="user_signup">Inscriptions</SelectItem>
                <SelectItem value="user_login">Connexions</SelectItem>
                <SelectItem value="user_role_changed">Changements de rôle</SelectItem>
                <SelectItem value="user_deleted">Utilisateurs supprimés</SelectItem>
                <SelectItem value="teacher_request">Demandes enseignant</SelectItem>
                <SelectItem value="teacher_approved">Enseignants approuvés</SelectItem>
                <SelectItem value="teacher_rejected">Enseignants rejetés</SelectItem>
                <SelectItem value="group_created">Groupes créés</SelectItem>
                <SelectItem value="group_deleted">Groupes supprimés</SelectItem>
                <SelectItem value="admin_action">Actions admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des logs */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune activité enregistrée
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {data?.logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-muted">
                      {activityTypeIcons[log.type] || <User className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {activityTypeLabels[log.type] || log.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {log.description}
                      </p>
                      {log.user && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Utilisateur: {log.user.name} ({log.user.email})
                        </p>
                      )}
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {log.ipAddress}
                        </p>
                      )}
                      {log.metadata && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Détails
                          </summary>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} sur {data.pagination.totalPages} ({data.pagination.total} entrées)
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
    </div>
  );
}
