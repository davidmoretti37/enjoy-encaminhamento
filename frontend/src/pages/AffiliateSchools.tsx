import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Building,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Ban,
  Mail,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";

export default function AffiliateSchools() {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNotes, setInviteNotes] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: schools, isLoading, refetch } = trpc.affiliate.getSchools.useQuery();

  const createInvitationMutation = trpc.affiliate.createSchoolInvitation.useMutation({
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteNotes("");
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar convite');
    }
  });

  const updateStatusMutation = trpc.school.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      refetch();
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedSchool(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  if (authLoading || affiliateLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'affiliate' || !affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um franqueado para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleApprove = async (schoolId: string) => {
    await updateStatusMutation.mutateAsync({ id: schoolId, status: 'active' });
  };

  const handleSuspend = async (schoolId: string) => {
    await updateStatusMutation.mutateAsync({ id: schoolId, status: 'suspended' });
  };

  const handleReactivate = async (schoolId: string) => {
    await updateStatusMutation.mutateAsync({ id: schoolId, status: 'active' });
  };

  const openRejectDialog = (school: any) => {
    setSelectedSchool(school);
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSchool || !rejectionReason.trim()) {
      toast.error('Por favor, forneça um motivo para a rejeição');
      return;
    }

    // TODO: Add rejection reason to the mutation when backend supports it
    await updateStatusMutation.mutateAsync({
      id: selectedSchool.id,
      status: 'suspended'
    });
  };

  const handleCreateInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Por favor, forneça um email');
      return;
    }

    await createInvitationMutation.mutateAsync({
      email: inviteEmail,
      notes: inviteNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter schools based on search term
  const filteredSchools = schools?.filter((school: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      school.school_name?.toLowerCase().includes(searchLower) ||
      school.city?.toLowerCase().includes(searchLower) ||
      school.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Escolas</h1>
          <p className="text-gray-500 mt-1">Gerencie as escolas da sua região</p>
        </div>

        {/* Schools Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Escolas</CardTitle>
            <CardDescription>
              Gerencie as escolas da sua região
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSchools && filteredSchools.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school: any) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">
                        {school.school_name}
                      </TableCell>
                      <TableCell>{school.city || 'N/A'}</TableCell>
                      <TableCell>{school.email}</TableCell>
                      <TableCell>{getStatusBadge(school.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {school.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(school.id)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(school)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {school.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(school.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Suspender
                            </Button>
                          )}
                          {school.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReactivate(school.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                  <Building className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma escola encontrada</h3>
                <p className="text-gray-400 text-sm">Convide escolas para se juntarem à sua rede</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Escola</DialogTitle>
              <DialogDescription>
                Por favor, forneça um motivo para a rejeição de {selectedSchool?.school_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Rejeição *</Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Documentação incompleta, informações inconsistentes, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setRejectionReason("");
                    setSelectedSchool(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={updateStatusMutation.isPending || !rejectionReason.trim()}
                >
                  {updateStatusMutation.isPending ? <ClassicLoader /> : 'Confirmar Rejeição'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invitation Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Nova Escola</DialogTitle>
              <DialogDescription>
                Envie um convite para uma escola se juntar à sua rede
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email da Escola *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="escola@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre a escola..."
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsInviteDialogOpen(false);
                  setInviteEmail("");
                  setInviteNotes("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateInvitation}
                disabled={createInvitationMutation.isPending || !inviteEmail.trim()}
              >
                {createInvitationMutation.isPending ? <ClassicLoader /> : 'Enviar Convite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
