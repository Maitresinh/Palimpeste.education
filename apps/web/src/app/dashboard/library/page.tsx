"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Upload, Trash2, MoreVertical, Library, Search, Plus, Globe } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PublicLibraryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [claimingBookId, setClaimingBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeout);
  };

  // Get user role
  const { data: userData } = useQuery(trpc.user.me.queryOptions());
  const isAdmin = userData?.role === "ADMIN";

  // Get public library books
  const { data: books, isLoading, refetch } = useQuery(
    trpc.documents.getPublicLibrary.queryOptions({ search: debouncedSearch || undefined })
  );

  // Mutation for uploading a public book (admin only)
  const uploadPublicBook = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isPublic", "true");

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
      toast.success("Livre ajouté à la bibliothèque publique !");
      setIsUploading(false);
      setShowUploadDialog(false);
      await queryClient.invalidateQueries({ queryKey: ["documents", "getPublicLibrary"] });
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

  // Mutation for removing from public library (marking as private)
  const removeFromPublic = useMutation(
    trpc.documents.markAsPrivate.mutationOptions({
      onSuccess: async () => {
        toast.success("Livre retiré de la bibliothèque publique");
        await queryClient.invalidateQueries({ queryKey: ["documents", "getPublicLibrary"] });
        await refetch();
      },
      onError: () => {
        toast.error("Erreur lors de la suppression");
      },
    })
  );

  // Mutation for claiming a public book (creates personal copy)
  const claimBook = useMutation(
    trpc.documents.claimPublicBook.mutationOptions({
      onSuccess: async (data) => {
        // Invalider le cache des livres accessibles
        await queryClient.invalidateQueries({ queryKey: ["documents", "getAccessibleBooksWithProgress"] });
        // Naviguer vers la copie personnelle
        router.push(`/read/${data.book.id}` as any);
      },
      onError: (error) => {
        toast.error("Erreur lors de l'ajout à vos lectures");
        setClaimingBookId(null);
      },
    })
  );

  // Handler pour ouvrir un livre public
  const handleOpenBook = (bookId: string) => {
    setClaimingBookId(bookId);
    claimBook.mutate({ publicBookId: bookId });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/epub+zip" && !file.name.endsWith(".epub")) {
        toast.error("Seuls les fichiers EPUB sont acceptés");
        return;
      }
      setIsUploading(true);
      uploadPublicBook.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Bibliothèque publique
        </h1>
        {isAdmin && (
          <Button
            onClick={() => setShowUploadDialog(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un livre
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Livres accessibles à tous. Cliquez sur un livre pour l&apos;ajouter à vos lectures et commencer à lire.
      </p>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un livre..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {books && books.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {debouncedSearch ? (
              <>Aucun livre trouvé pour &quot;{debouncedSearch}&quot;</>
            ) : (
              <>La bibliothèque publique est vide pour le moment.</>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {books?.map((book: any) => {
            const isClaiming = claimingBookId === book.id;
            return (
              <Card key={book.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col !py-0 !gap-0">
                {/* Book cover */}
                <div
                  onClick={() => !isClaiming && handleOpenBook(book.id)}
                  className="aspect-[2/3] w-full bg-muted relative overflow-hidden rounded-t-xl block cursor-pointer"
                >
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

                  {/* Loading overlay when claiming */}
                  {isClaiming && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}

                  {/* Public badge */}
                  <div className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Globe className="h-2.5 w-2.5" />
                    Public
                  </div>

                  {/* Admin dropdown menu */}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-md bg-black/50 hover:bg-black/70 text-white rounded-md flex items-center justify-center"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Retirer ce livre de la bibliothèque publique ?")) {
                              removeFromPublic.mutate({ documentId: book.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Retirer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="p-2 space-y-1">
                  <span
                    onClick={() => !isClaiming && handleOpenBook(book.id)}
                    className="font-medium text-xs line-clamp-2 leading-snug block cursor-pointer hover:underline"
                  >
                    {book.title}
                  </span>
                  {book.author && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload dialog for admins */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Ajouter un livre public
            </DialogTitle>
            <DialogDescription>
              Ce livre sera accessible à tous les utilisateurs de la plateforme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,application/epub+zip"
              onChange={handleFileSelect}
              className="hidden"
              id="public-book-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full gap-2"
              variant="outline"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Sélectionner un fichier EPUB
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Seuls les fichiers EPUB sont acceptés.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
