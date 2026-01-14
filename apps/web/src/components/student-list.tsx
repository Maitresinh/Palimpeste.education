"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Trash2,
  User as UserIcon,
  Eye
} from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentListProps {
  groupId: string;
}

interface StudentAnnotation {
  id: string;
  selectedText: string;
  comment: string | null;
  highlightColor: string;
  createdAt: string | Date; // TRPC dates are deserialized
}

export function StudentList({ groupId }: StudentListProps) {
  const queryClient = useQueryClient();
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [annotationsDialog, setAnnotationsDialog] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    bookId: string;
    bookTitle: string;
  } | null>(null);

  const { data: members, isLoading, refetch } = useQuery(
    trpc.groups.getMembersWithDetails.queryOptions({ groupId })
  );

  const { data: annotations } = useQuery(
    trpc.groups.getMemberAnnotations.queryOptions(
      {
        groupId,
        userId: annotationsDialog?.studentId || "",
        documentId: annotationsDialog?.bookId || ""
      },
      { enabled: !!annotationsDialog?.open }
    )
  );

  const removeMember = useMutation({
    mutationFn: async ({ groupId: gid, userId }: { groupId: string; userId: string }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/groups.removeMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId: gid, userId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erreur lors de la suppression");
      }
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Élève retiré");
      await refetch();
    },
    onError: (error: Error) => toast.error(error.message || "Erreur"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Élèves</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Élèves</CardTitle>
          <CardDescription>Aucun élève pour le moment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-sm text-muted-foreground">
            Partagez le code d&apos;invitation pour que les élèves puissent rejoindre.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Élèves ({members.length})
          </CardTitle>
          <CardDescription>
            Cliquez sur un élève pour voir ses détails de lecture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((student) => (
            <Card
              key={student.id}
              className="overflow-hidden transition-shadow hover:shadow-sm"
            >
              <CardContent className="p-0">
                {/* En-tête du student (toujours visible) */}
                <div
                  className="py-1.5 px-2 cursor-pointer flex items-center justify-between gap-3continn max-h-[20px]"
                  onClick={() => setExpandedStudent(
                    expandedStudent === student.id ? null : student.id
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">
                        {student.name || "Sans nom"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Rôle Badge */}
                    <div className={`text-xs px-2 py-0.5 rounded-full border font-medium
                        ${student.role === "OWNER" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" :
                        student.role === "ADMIN" ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" :
                          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      }`}>
                      {student.role === "OWNER" ? "Propriétaire" : student.role === "ADMIN" ? "Admin" : "Membre"}
                    </div>

                    {/* Stats rapides */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1" title="Progression moyenne">
                        <BookOpen className="h-3.5 w-3.5" />
                        {student.avgProgress}%
                      </div>
                      <div className="flex items-center gap-1" title="Annotations">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {student.totalAnnotations}
                      </div>
                    </div>

                    {/* Bouton expand */}
                    {expandedStudent === student.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Détails (expandable) */}
                {expandedStudent === student.id && (
                  <div className="border-t bg-muted/30 p-3 space-y-3">
                    {/* Stats mobiles */}
                    <div className="sm:hidden flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        Progression: {student.avgProgress}%
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {student.totalAnnotations} annotations
                      </div>
                    </div>

                    {/* Progression par livre */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Progression par livre
                      </div>
                      {student.progressByBook.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic">
                          Aucun livre
                        </div>
                      ) : (
                        student.progressByBook.map((book) => {
                          const annotCount = student.annotationsByBook.find(
                            (a) => a.bookId === book.bookId
                          )?.count || 0;

                          return (
                            <div key={book.bookId} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium truncate max-w-[200px]">
                                  {book.bookTitle}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {book.progressPercentage}%
                                  </span>
                                  {annotCount > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAnnotationsDialog({
                                          open: true,
                                          studentId: student.id,
                                          studentName: student.name || "Élève",
                                          bookId: book.bookId,
                                          bookTitle: book.bookTitle,
                                        });
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                      {annotCount}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <Progress
                                value={book.progressPercentage}
                                className="h-1.5"
                              />
                              {book.lastReadAt && (
                                <div className="text-[10px] text-muted-foreground">
                                  Dernière lecture: {new Date(book.lastReadAt).toLocaleString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                    timeZone: "Europe/Paris"
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Voulez-vous vraiment retirer ${student.name || "cet élève"} ?`)) {
                            removeMember.mutate({ groupId, userId: student.id });
                          }
                        }}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                        Retirer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Dialog pour voir les annotations */}
      <Dialog
        open={!!annotationsDialog?.open}
        onOpenChange={(open) => !open && setAnnotationsDialog(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Annotations de {annotationsDialog?.studentName}
            </DialogTitle>
            <DialogDescription>
              Livre: {annotationsDialog?.bookTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {!annotations || annotations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                Aucune annotation pour ce livre.
              </div>
            ) : (
              annotations.map((ann: StudentAnnotation) => (
                <div
                  key={ann.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div
                    className="text-sm p-2 rounded"
                    style={{ backgroundColor: ann.highlightColor }}
                  >
                    &ldquo;{ann.selectedText.substring(0, 150)}
                    {ann.selectedText.length > 150 ? "..." : ""}&rdquo;
                  </div>
                  {ann.comment && (
                    <div className="text-sm text-muted-foreground pl-2 border-l-2">
                      {ann.comment}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(ann.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Europe/Paris"
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
