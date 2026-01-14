"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Upload, Trash2, MoreVertical, Library } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${v}%` }} />
    </div>
  );
}

export default function DashboardBooksPage() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: books, isLoading, refetch } = useQuery(trpc.documents.getMyBooksWithProgress.queryOptions());

  // Mutation pour uploader un livre
  const uploadBook = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/upload/epub`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: async () => {
      toast.success("Livre ajouté avec succès !");
      setIsUploading(false);
      await queryClient.invalidateQueries({ queryKey: ["documents", "getMyBooksWithProgress"] });
      await refetch();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'upload");
      setIsUploading(false);
    },
  });

  // Mutation pour supprimer un livre
  const deleteBook = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trpc/documents.deleteBook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Livre supprimé");
      await queryClient.invalidateQueries({ queryKey: ["documents", "getMyBooksWithProgress"] });
      await refetch();
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/epub+zip" && !file.name.endsWith(".epub")) {
        toast.error("Seuls les fichiers EPUB sont acceptés");
        return;
      }
      setIsUploading(true);
      uploadBook.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Library className="h-5 w-5" />
          Mes livres importés
        </h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,application/epub+zip"
            onChange={handleFileSelect}
            className="hidden"
            id="book-upload-dashboard"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            className="gap-2"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importer
              </>
            )}
          </Button>

        </div>
      </div>

      {books && books.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun livre importé pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {books?.map((book: any) => {
            const progress = book.progress?.progressPercentage ?? 0;
            return (
              <Card key={book.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col !py-0 !gap-0">
                {/* Cover du livre - Avec coins arrondis en haut */}
                <Link href={`/read/${book.id}`} className="aspect-[2/3] w-full bg-muted relative overflow-hidden rounded-t-xl block">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}/api/cover/${book.id}`}
                    alt={book.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {/* Fallback visual */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80 -z-10">
                    <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                  </div>

                  {/* Overlay progression */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Badge progression */}
                  {progress > 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      {progress}%
                    </div>
                  )}

                  {/* Dropdown menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(e) => e.preventDefault()}
                      className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-md bg-black/50 hover:bg-black/70 text-white rounded-md flex items-center justify-center"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Voulez-vous vraiment supprimer ce livre ?")) {
                            deleteBook.mutate(book.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Link>

                <div className="p-2 space-y-1">
                  <Link
                    href={`/read/${book.id}`}
                    className="font-medium text-xs line-clamp-2 leading-snug block"
                  >
                    {book.title}
                  </Link>
                  {book.author && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  )}

                  {/* Infos supplémentaires pour le dashboard */}
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-0.5">
                      <FileText className="h-2.5 w-2.5" />
                      {book.filesize ? `${(parseInt(book.filesize) / 1024 / 1024).toFixed(1)} MB` : "—"}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(book.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


