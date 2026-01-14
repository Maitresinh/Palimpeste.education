"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, BookOpen, Trash2, FileText, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



// ... imports
import { BookCard } from "@/components/book-card";

export default function MyBooks() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Récupérer mes livres
  const { data: books, isLoading, refetch } = useQuery(
    trpc.documents.getMyBooksWithProgress.queryOptions()
  );

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
      await queryClient.invalidateQueries({ queryKey: ["documents", "getMyBooks"] });
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
      await queryClient.invalidateQueries({ queryKey: ["documents", "getMyBooks"] });
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {books?.length || 0} livre{(books?.length || 0) > 1 ? "s" : ""}
        </p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,application/epub+zip"
            onChange={handleFileSelect}
            className="hidden"
            id="book-upload"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            variant="outline"
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
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Aucun livre dans votre bibliothèque
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer votre premier EPUB
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
          {books?.map((book: any) => (
            <BookCard
              key={book.id}
              book={book}
              onDelete={() => deleteBook.mutate(book.id)}
              onClick={() => router.push(`/read/${book.id}` as any)}
            />
          ))}
        </div>
      )
      }
    </div >
  );
}

