"use client";

import { useState } from "react";
import { 
  Check, 
  X, 
  Clock,
  Building,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600">Approuvée</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejetée</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
  }
}

export default function TeacherRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; userName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery(trpc.admin.listTeacherRequests.queryOptions({
    status: statusFilter,
    page,
    limit: 20,
  }));

  const approveMutation = useMutation(trpc.admin.approveTeacherRequest.mutationOptions());
  const rejectMutation = useMutation(trpc.admin.rejectTeacherRequest.mutationOptions());

  const handleApprove = async (requestId: string) => {
    try {
      await approveMutation.mutateAsync({ requestId });
      toast.success("Demande approuvée");
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectMutation.mutateAsync({ requestId: selectedRequest.id, responseMessage: rejectReason });
      toast.success("Demande rejetée");
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du rejet");
    }
  };

  const pendingCount = data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demandes de compte enseignant</h1>
        <p className="text-muted-foreground">
          Gérez les demandes de rôle enseignant
        </p>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            En attente
            {statusFilter !== "pending" && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
          <TabsTrigger value="rejected">Rejetées</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : data?.requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune demande {statusFilter === "pending" ? "en attente" : statusFilter === "approved" ? "approuvée" : "rejetée"}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        {statusFilter === "pending" && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.requests.map((request: {
                        id: string;
                        status: string;
                        message: string | null;
                        organization: string | null;
                        createdAt: string;
                        user?: { name: string; email: string } | null;
                      }) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{request.user?.name}</div>
                              <div className="text-sm text-muted-foreground">{request.user?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.organization ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {request.organization}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm max-w-xs truncate" title={request.message || ""}>
                              {request.message || "-"}
                            </p>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          {statusFilter === "pending" && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedRequest({ id: request.id, userName: request.user?.name || "" });
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {data && data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {data.pagination.page} sur {data.pagination.totalPages}
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
        </TabsContent>
      </Tabs>

      {/* Dialog de rejet */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet pour <strong>{selectedRequest?.userName}</strong>.
              L'utilisateur sera notifié.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Raison du rejet</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Informations insuffisantes, veuillez fournir plus de détails sur votre établissement..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? "Envoi..." : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
