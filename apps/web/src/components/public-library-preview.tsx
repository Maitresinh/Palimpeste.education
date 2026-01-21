"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/book-card";

export default function PublicLibraryPreview() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [claimingBookId, setClaimingBookId] = useState<string | null>(null);

  // Récupérer les livres publics (limit to 3 for preview)
  const { data: books, isLoading } = useQuery(
    trpc.documents.getPublicLibrary.queryOptions({ limit: 3 })
  );

  // Mutation for claiming a public book (creates personal copy)
  const claimBook = useMutation(
    trpc.documents.claimPublicBook.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({ queryKey: ["documents", "getAccessibleBooksWithProgress"] });
        router.push(`/read/${data.book.id}` as any);
      },
      onError: () => {
        toast.error("Erreur lors de l'ajout à vos lectures");
        setClaimingBookId(null);
      },
    })
  );

  const handleOpenBook = (bookId: string) => {
    setClaimingBookId(bookId);
    claimBook.mutate({ publicBookId: bookId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {books?.length || 0} livre{(books?.length || 0) > 1 ? "s" : ""} disponible{(books?.length || 0) > 1 ? "s" : ""}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => router.push("/dashboard/library" as any)}
        >
          Voir tout
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {books && books.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              La bibliothèque publique est vide
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {books?.map((book: any) => (
            <BookCard
              key={book.id}
              book={book}
              isLoading={claimingBookId === book.id}
              onClick={() => !claimingBookId && handleOpenBook(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
