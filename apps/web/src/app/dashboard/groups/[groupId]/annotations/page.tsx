"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Download,
    Filter,
    MessageSquare,
    BookOpen,
    User,
    Calendar,
    Search,
    FileJson,
    FileText
} from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export default function AnnotationHubPage() {
    const params = useParams<{ groupId: string }>();
    const groupId = params.groupId;
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightId = searchParams.get("highlight");

    // Ref for scrolling to highlighted annotation
    const highlightedRef = useRef<HTMLDivElement>(null);

    // Filter state
    const [selectedBook, setSelectedBook] = useState<string>("all");
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const privateData = useQuery(trpc.privateData.queryOptions());
    const userRole = (privateData.data?.user as any)?.role || "STUDENT";
    const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

    const { data: group, isLoading: isLoadingGroup } = useQuery(
        trpc.groups.get.queryOptions({ id: groupId })
    );

    const { data: members } = useQuery(trpc.groups.getMembers.queryOptions({ groupId }));

    const { data: annotationData, isLoading: isLoadingAnnotations } = useQuery(
        trpc.reading.getGroupAnnotations.queryOptions({
            groupId,
            bookId: selectedBook !== "all" ? selectedBook : undefined,
            userId: selectedUser !== "all" ? selectedUser : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        })
    );

    // Scroll to highlighted annotation when loaded
    useEffect(() => {
        if (highlightId && highlightedRef.current && !isLoadingAnnotations) {
            setTimeout(() => {
                highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        }
    }, [highlightId, isLoadingAnnotations]);

    // Filter by search query locally
    const filteredAnnotations = annotationData?.annotations?.filter((ann: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ann.selectedText?.toLowerCase().includes(query) ||
            ann.comment?.toLowerCase().includes(query) ||
            ann.author?.name?.toLowerCase().includes(query) ||
            ann.bookTitle?.toLowerCase().includes(query)
        );
    }) || [];

    // Get unique users from annotations for filter
    const uniqueUsers = annotationData?.annotations?.reduce((acc: any[], ann: any) => {
        if (ann.author && !acc.find((u: any) => u.id === ann.author.id)) {
            acc.push(ann.author);
        }
        return acc;
    }, []) || [];

    // Export functions
    const exportToJSON = () => {
        const data = filteredAnnotations.map((ann: any) => ({
            text: ann.selectedText,
            comment: ann.comment,
            author: ann.author?.name,
            book: ann.bookTitle,
            color: ann.color,
            createdAt: ann.createdAt,
            isGroupVisible: ann.isGroupVisible,
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `annotations-${group?.name || groupId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Annotations exportées en JSON");
    };

    const exportToCSV = () => {
        const headers = ["Texte", "Commentaire", "Auteur", "Livre", "Couleur", "Date", "Visible groupe"];
        const rows = filteredAnnotations.map((ann: any) => [
            `"${(ann.selectedText || "").replace(/"/g, '""')}"`,
            `"${(ann.comment || "").replace(/"/g, '""')}"`,
            `"${ann.author?.name || ""}"`,
            `"${ann.bookTitle || ""}"`,
            ann.color || "",
            new Date(ann.createdAt).toLocaleDateString("fr-FR"),
            ann.isGroupVisible ? "Oui" : "Non",
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `annotations-${group?.name || groupId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Annotations exportées en CSV");
    };

    if (isLoadingGroup) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-28 w-full" />
            </div>
        );
    }

    if (!group) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Groupe introuvable.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/groups/${groupId}`)} className="gap-2 px-0">
                        <ArrowLeft className="h-4 w-4" /> Retour au groupe
                    </Button>
                    <h1 className="text-xl font-bold flex items-center gap-2 mt-1">
                        <MessageSquare className="h-5 w-5" />
                        Hub d&apos;annotations - {group.name}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {filteredAnnotations.length} annotation{filteredAnnotations.length > 1 ? 's' : ''}
                    </p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
                        <Download className="h-4 w-4" />
                        Exporter
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToJSON} className="gap-2">
                            <FileJson className="h-4 w-4" />
                            Exporter en JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                            <FileText className="h-4 w-4" />
                            Exporter en CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtres
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Search */}
                        <div className="space-y-2">
                            <Label className="text-xs">Recherche</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Texte, commentaire..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Book filter - using native select */}
                        <div className="space-y-2">
                            <Label className="text-xs">Livre</Label>
                            <select
                                value={selectedBook}
                                onChange={(e) => setSelectedBook(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="all">Tous les livres</option>
                                {annotationData?.documents?.map((doc: any) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* User filter (teachers only) - using native select */}
                        {isTeacher && (
                            <div className="space-y-2">
                                <Label className="text-xs">Auteur</Label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                    <option value="all">Tous les auteurs</option>
                                    {uniqueUsers.map((u: any) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date range */}
                        <div className="space-y-2">
                            <Label className="text-xs">Période</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-xs"
                                />
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Annotations list */}
            <Card>
                <CardContent className="py-4">
                    {isLoadingAnnotations ? (
                        <div className="space-y-3">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : filteredAnnotations.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Aucune annotation trouvée.</p>
                            {(selectedBook !== "all" || selectedUser !== "all" || searchQuery || dateFrom || dateTo) && (
                                <p className="text-sm mt-1">Essayez de modifier vos filtres.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAnnotations.map((annotation: any) => {
                                const isHighlighted = annotation.id === highlightId;
                                return (
                                <div
                                    key={annotation.id}
                                    ref={isHighlighted ? highlightedRef : null}
                                    className={`border rounded-lg p-4 transition-all ${
                                        isHighlighted 
                                            ? "ring-2 ring-indigo-500 shadow-lg bg-indigo-50 dark:bg-indigo-950/30" 
                                            : "hover:shadow-sm"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Color indicator */}
                                        <div
                                            className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                                            style={{ backgroundColor: annotation.color || "#fbbf24" }}
                                        />

                                        <div className="flex-1 min-w-0">
                                            {/* Citation */}
                                            <blockquote className="text-sm italic text-gray-700 dark:text-gray-300 border-l-2 border-gray-200 dark:border-gray-700 pl-3 mb-2">
                                                &quot;{annotation.selectedText?.substring(0, 300)}{annotation.selectedText?.length > 300 ? '...' : ''}&quot;
                                            </blockquote>

                                            {/* Comment */}
                                            {annotation.comment && (
                                                <p className="text-sm text-foreground mb-2">
                                                    💬 {annotation.comment}
                                                </p>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {annotation.author?.name || "Anonyme"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" />
                                                    {annotation.bookTitle}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(annotation.createdAt).toLocaleDateString("fr-FR")}
                                                </span>
                                                {annotation.isGroupVisible && (
                                                    <span className="text-green-600 dark:text-green-400">
                                                        👁 Visible par le groupe
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action: Go to book */}
                                        <Link
                                            href={`/read/${annotation.documentId}`}
                                            className="flex-shrink-0 p-2 rounded hover:bg-muted"
                                        >
                                            <BookOpen className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
