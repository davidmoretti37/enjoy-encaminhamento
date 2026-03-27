import { useAuth } from "@/_core/hooks/useAuth";
import ContentTransition from "@/components/ui/ContentTransition";
import { PageHeaderSkeleton, SearchBarSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Search,
  Ban,
  Mail,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminAgencies() {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNotes, setInviteNotes] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: agencies, isLoading, refetch } = trpc.affiliate.getAgencies.useQuery();

  const createInvitationMutation = trpc.affiliate.createAgencyInvitation.useMutation({
    onSuccess: (data) => {
      const inviteLink = `${window.location.origin}/register/agency?token=${data.token}`;
      const subject = encodeURIComponent('Convite para Cadastro - ANEC Recrutamento');
      const body = encodeURIComponent(
        `Olá!\n\nVocê foi convidado(a) por ${data.affiliateName} para cadastrar sua agência em nossa plataforma de recrutamento.\n\n${inviteNotes ? `Mensagem: ${inviteNotes}\n\n` : ''}Clique no link abaixo para completar seu cadastro:\n${inviteLink}\n\nEste link é válido por 7 dias e é exclusivo para ${inviteEmail}.`
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(inviteEmail)}&su=${subject}&body=${body}`,
        '_blank'
      );
      toast.success('Convite criado! Abrindo Gmail para envio.');
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteNotes("");
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar convite');
    }
  });

  const updateStatusMutation = trpc.agency.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      refetch();
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedAgency(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  const dataLoading = affiliateLoading || isLoading;

  if (!dataLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !affiliate)) {
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

  const handleApprove = async (agencyId: string) => {
    await updateStatusMutation.mutateAsync({ id: agencyId, status: 'active' });
  };

  const handleSuspend = async (agencyId: string) => {
    await updateStatusMutation.mutateAsync({ id: agencyId, status: 'suspended' });
  };

  const handleReactivate = async (agencyId: string) => {
    await updateStatusMutation.mutateAsync({ id: agencyId, status: 'active' });
  };

  const openRejectDialog = (agency: any) => {
    setSelectedAgency(agency);
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedAgency || !rejectionReason.trim()) {
      toast.error('Por favor, forneça um motivo para a rejeição');
      return;
    }

    // TODO: Add rejection reason to the mutation when backend supports it
    await updateStatusMutation.mutateAsync({
      id: selectedAgency.id,
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
        return <Badge className="bg-green-500 text-white">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500 text-white">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500 text-white">Suspensa</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white">{status}</Badge>;
    }
  };

  // Filter agencies based on search term
  const filteredAgencies = agencies?.filter((agency: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      agency.agency_name?.toLowerCase().includes(searchLower) ||
      agency.city?.toLowerCase().includes(searchLower) ||
      agency.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <ContentTransition isLoading={dataLoading} skeleton={
        <>
          <PageHeaderSkeleton centered />
          <SearchBarSkeleton />
          <CardGridSkeleton count={8} columns={4} />
        </>
      }>
      <div className="space-y-6">
        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#0A2342]">Agências</h2>
          <p className="text-slate-600 mt-1">Gerencie as agências da sua região</p>
        </div>

        {/* Invite Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsInviteDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#0A2342]/25 hover:shadow-xl transition-all"
          >
            <Mail className="h-4 w-4" />
            Convidar Agência
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar agências..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Agencies Grid */}
        {filteredAgencies && filteredAgencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAgencies.map((agency: any) => (
              <div
                key={agency.id}
                className="bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all p-4 flex flex-col h-full"
              >
                {/* Agency Avatar */}
                <div className="mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {agency.agency_name?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  </div>
                </div>

                {/* Agency Info */}
                <h3 className="text-base font-semibold text-[#0A2342] mb-1">
                  {agency.agency_name}
                </h3>
                {agency.city && (
                  <p className="text-xs text-slate-600 mb-2">{agency.city}</p>
                )}
                <p className="text-xs text-slate-500 mb-3 truncate">{agency.email}</p>

                {/* Status Badge */}
                <div className="mb-3">
                  {getStatusBadge(agency.status)}
                </div>

                {/* Actions */}
                <div className="mt-auto space-y-2">
                  {agency.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] hover:shadow-lg shadow-[#0A2342]/25"
                        onClick={() => handleApprove(agency.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => openRejectDialog(agency)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                  {agency.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleSuspend(agency.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspender
                    </Button>
                  )}
                  {agency.status === 'suspended' && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] hover:shadow-lg shadow-[#0A2342]/25"
                      onClick={() => handleReactivate(agency.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reativar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
              <Building className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
              {searchTerm ? 'Nenhuma agência encontrada' : 'Nenhuma agência cadastrada'}
            </h3>
            <p className="text-slate-600 max-w-sm">
              {searchTerm ? 'Tente ajustar sua busca' : 'Convide agências para se juntarem à sua rede'}
            </p>
          </div>
        )}

        {/* Rejection Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Agência</DialogTitle>
              <DialogDescription>
                Por favor, forneça um motivo para a rejeição de {selectedAgency?.agency_name}
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
                    setSelectedAgency(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={updateStatusMutation.isPending || !rejectionReason.trim()}
                >
                  {updateStatusMutation.isPending ? <Skeleton className="h-4 w-20" /> : 'Confirmar Rejeição'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invitation Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Nova Agência</DialogTitle>
              <DialogDescription>
                Envie um convite para uma agência se juntar à sua rede
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email da Agência *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agencia@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre a agência..."
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
                {createInvitationMutation.isPending ? <Skeleton className="h-4 w-20" /> : 'Enviar Convite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
