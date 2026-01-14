import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

export interface Annotation {
  id: string;
  userId: string;
  documentId: string;
  cfiRange: string;
  selectedText: string;
  highlightColor: string;
  comment: string | null;
  isGroupVisible: string;
  parentId?: string | null;
  createdAt?: string;
  replyCount?: number;
  author?: {
    name: string | null;
  };
}

interface UseEpubAnnotationsProps {
  bookId: string;
  userId?: string;
}

export function useEpubAnnotations({
  bookId,
  userId,
}: UseEpubAnnotationsProps) {
  const queryClient = useQueryClient();

  // Fetch annotations
  const { data: annotations = [], refetch } = useQuery(
    trpc.reading.getAnnotations.queryOptions(
      { documentId: bookId },
      {
        enabled: !!bookId,
        refetchInterval: 2000, // Poll every 2s for collaboration
        refetchOnWindowFocus: true,
      }
    )
  );

  // Mutations
  const createMutation = useMutation(trpc.reading.createAnnotation.mutationOptions());
  const updateMutation = useMutation(trpc.reading.updateAnnotation.mutationOptions());
  const deleteMutation = useMutation(trpc.reading.deleteAnnotation.mutationOptions());

  // CRUD wrappers
  const addAnnotation = async (data: { cfiRange: string; selectedText: string; color: string; comment?: string }) => {
    await createMutation.mutateAsync({
        documentId: bookId,
        cfiRange: data.cfiRange,
        selectedText: data.selectedText,
        highlightColor: data.color,
        comment: data.comment,
    });
    await refetch();
  };

  const updateAnnotation = async (id: string, comment: string) => {
    await updateMutation.mutateAsync({ id, comment });
    await refetch();
  };

  const removeAnnotation = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    await refetch();
  };

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    refetch
  };
}
