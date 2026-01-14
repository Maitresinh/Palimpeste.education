"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnnotationThreadProps {
  annotationId: string;
  documentId: string;
  userId: string;
  isTeacher?: boolean;
  isReadOnly?: boolean;
  showInputOnly?: boolean;
  onReplyAdded?: () => void;
}

export function AnnotationThread({
  annotationId,
  documentId,
  userId,
  isTeacher = false,
  isReadOnly = false,
  showInputOnly = false,
  onReplyAdded,
}: AnnotationThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [showAllReplies, setShowAllReplies] = useState(false);

  const { data: replies = [], refetch } = useQuery(
    trpc.reading.getAnnotationReplies.queryOptions({ annotationId })
  );

  const replyMutation = useMutation(
    trpc.reading.replyToAnnotation.mutationOptions()
  );

  const deleteMutation = useMutation(
    trpc.reading.deleteAnnotation.mutationOptions()
  );

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        parentId: annotationId,
        comment: replyText,
        documentId,
      });
      setReplyText("");
      await refetch();
      if (onReplyAdded) onReplyAdded();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Supprimer cette réponse ?")) return;

    try {
      await deleteMutation.mutateAsync({ id: replyId });
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  // Show only first 2 replies by default, or all if expanded
  const visibleReplies = showAllReplies ? replies : replies.slice(0, 2);
  const hasMoreReplies = replies.length > 2;

  return (
    <div className="flex flex-col">
      {/* Messages - compact style (only if not showInputOnly) */}
      {!showInputOnly && replies.length > 0 && (
        <div className="-space-y-0.5">
          {visibleReplies.map((reply) => {
            const isOwn = reply.userId === userId;
            
            return (
              <div
                key={reply.id}
                className="group flex items-center gap-1 leading-tight"
              >
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-[10px] font-medium mr-0.5 leading-none",
                    isOwn ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-500 dark:text-neutral-400"
                  )}>
                    {isOwn ? "Vous" : reply.author?.name || "Anonyme"}:
                  </span>
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-300 leading-none">
                    {reply.comment}
                  </span>
                </div>
                {(isOwn || isTeacher) && !isReadOnly && (
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    className="p-0 rounded text-neutral-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Show more/less button */}
          {hasMoreReplies && (
            <button
              onClick={() => setShowAllReplies(!showAllReplies)}
              className="flex items-center gap-0.5 text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              {showAllReplies ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  +{replies.length - 2} réponse{replies.length - 2 > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Compact input */}
      {!isReadOnly && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Répondre..."
            className="flex-1 px-2 py-0.5 text-[11px] bg-neutral-100 dark:bg-neutral-800 border-0 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 placeholder:text-neutral-400"
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || replyMutation.isPending}
            className={cn(
              "p-1.5 rounded-full transition-colors shrink-0",
              replyText.trim() 
                ? "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600" 
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
            )}
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
