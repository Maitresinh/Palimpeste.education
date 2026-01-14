"use client";

import {
  Users,
  FolderKanban,
  FileText,
  GraduationCap,
  TrendingUp,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery(trpc.admin.getStats.queryOptions());
  const { data: recentLogs } = useQuery(trpc.admin.getActivityLogs.queryOptions({
    limit: 5,
    page: 1
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vue d'ensemble</h1>
        <p className="text-muted-foreground">
          Bienvenue dans l'interface d'administration de Conpagina
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          description={`+${stats?.recentSignups ?? 0} ces 7 derniers jours`}
          loading={isLoading}
        />
        <StatCard
          title="Groupes"
          value={stats?.totalGroups ?? 0}
          icon={FolderKanban}
          loading={isLoading}
        />
        <StatCard
          title="Documents"
          value={stats?.totalDocuments ?? 0}
          icon={FileText}
          loading={isLoading}
        />
        <Link href={"/admin/teacher-requests" as any}>
          <StatCard
            title="Demandes en attente"
            value={stats?.pendingTeacherRequests ?? 0}
            icon={GraduationCap}
            description="Demandes de compte enseignant"
            loading={isLoading}
          />
        </Link>
      </div>

      {/* Répartition par rôle et sessions actives */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Répartition des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Étudiants</span>
                  <Badge variant="secondary">{stats?.usersByRole?.STUDENT ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Enseignants</span>
                  <Badge variant="secondary">{stats?.usersByRole?.TEACHER ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Administrateurs</span>
                  <Badge variant="destructive">{stats?.usersByRole?.ADMIN ?? 0}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sessions actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-4xl font-bold text-green-600">
                  {stats?.activeSessions ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  utilisateurs connectés
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activité récente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activité récente
          </CardTitle>
          <Link
            href={"/admin/activity-logs" as any}
            className="text-sm text-primary hover:underline"
          >
            Voir tout
          </Link>
        </CardHeader>
        <CardContent>
          {recentLogs?.logs?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune activité récente
            </p>
          ) : (
            <div className="space-y-3">
              {recentLogs?.logs?.map((log: {
                id: string;
                type: string;
                description: string;
                createdAt: string;
                user?: { name: string } | null
              }) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{log.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{log.type}</span>
                      <span>•</span>
                      <span>
                        {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {log.user && (
                        <>
                          <span>•</span>
                          <span>{log.user.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
