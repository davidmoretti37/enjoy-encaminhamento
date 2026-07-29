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
  Pencil,
  Trash2,
  KeyRound,
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<any>(null);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [accessAgency, setAccessAgency] = useState<any>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");

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

  const updateAgencyMutation = (trpc.agency as any).update.useMutation({
    onSuccess: () => {
      toast.success('Agência atualizada com sucesso!');
      refetch();
      setIsEditDialogOpen(false);
      setEditForm({});
      setSelectedAgency(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar agência');
    }
  });

  const deleteAgencyMutation = (trpc.agency as any).deleteAgency.useMutation({
    onSuccess: () => {
      toast.success('Agência excluída com sucesso!');
      refetch();
      setIsDeleteDialogOpen(false);
      setAgencyToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir agência');
    }
  });

  const updateAccessMutation = (trpc.agency as any).updateAccess.useMutation({
    onSuccess: (data: any) => {
      const changed = [
        data?.emailChanged ? 'e-mail' : null,
        data?.passwordChanged ? 'senha' : null,
      ].filter(Boolean).join(' e ');
      toast.success(
        `Acesso atualizado (${changed}). O acesso anterior deixa de funcionar — informe os novos dados ao responsável.`,
      );
      refetch();
      setIsAccessDialogOpen(false);
      setAccessAgency(null);
      setAccessEmail("");
      setAccessPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar acesso');
    }
  });

  const openAccessDialog = (agency: any) => {
    setAccessAgency(agency);
    setAccessEmail(agency?.email || "");
    setAccessPassword("");
    setIsAccessDialogOpen(true);
  };

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

    await updateStatusMutation.mutateAsync({
      id: selectedAgency.id,
      status: 'rejected',
      rejectionReason: rejectionReason.trim(),
    });
  };

  const openEditDialog = (agency: any) => {
    setSelectedAgency(agency);
    setEditForm({
      agency_name: agency.agency_name || "",
      trade_name: agency.trade_name || "",
      legal_name: agency.legal_name || "",
      cnpj: agency.cnpj || "",
      address: agency.address || "",
      city: agency.city || "",
      state: agency.state || "",
      postal_code: agency.postal_code || "",
      phone: agency.phone || "",
      website: agency.website || "",
      notes: agency.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedAgency) return;
    await updateAgencyMutation.mutateAsync({
      id: selectedAgency.id,
      ...editForm,
    });
  };

  const openDeleteDialog = (agency: any) => {
    setAgencyToDelete(agency);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!agencyToDelete) return;
    await deleteAgencyMutation.mutateAsync({ id: agencyToDelete.id });
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
      case 'rejected':
        return <Badge className="bg-slate-600 text-white">Rejeitada</Badge>;
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

                {/* Rejection reason (report #25) */}
                {agency.status === 'rejected' && agency.rejection_reason && (
                  <div className="mb-3 rounded-md bg-red-50 border border-red-100 p-2">
                    <p className="text-[11px] font-medium text-red-700">Motivo da rejeição</p>
                    <p className="text-xs text-red-600 mt-0.5 break-words">{agency.rejection_reason}</p>
                  </div>
                )}

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

                  {/* Edit / Delete (reports #26, #37) */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() => openEditDialog(agency)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => openDeleteDialog(agency)}
                      disabled={deleteAgencyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>

                  {/* Transfer the branch login to a different person. The agency
                      keeps all of its data — only the credentials move. */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => openAccessDialog(agency)}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    Alterar acesso
                  </Button>
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

        {/* Edit Agency Dialog (report #26) */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agência</DialogTitle>
              <DialogDescription>
                Atualize os dados de {selectedAgency?.agency_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-agency_name">Nome da Agência</Label>
                  <Input
                    id="edit-agency_name"
                    value={editForm.agency_name || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, agency_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-trade_name">Nome Fantasia</Label>
                  <Input
                    id="edit-trade_name"
                    value={editForm.trade_name || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, trade_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-legal_name">Razão Social</Label>
                  <Input
                    id="edit-legal_name"
                    value={editForm.legal_name || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, legal_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={editForm.cnpj || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, cnpj: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-address">Endereço</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input
                    id="edit-city"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    value={editForm.state || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, state: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-postal_code">CEP</Label>
                  <Input
                    id="edit-postal_code"
                    value={editForm.postal_code || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, postal_code: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, website: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditForm({});
                    setSelectedAgency(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] hover:shadow-lg shadow-[#0A2342]/25"
                  onClick={handleEditSave}
                  disabled={updateAgencyMutation.isPending}
                >
                  {updateAgencyMutation.isPending ? <Skeleton className="h-4 w-20" /> : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog (report #37) */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Agência</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir {agencyToDelete?.agency_name}? Esta ação removerá a agência das listagens ativas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setAgencyToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteAgencyMutation.isPending}
              >
                {deleteAgencyMutation.isPending ? <Skeleton className="h-4 w-20" /> : 'Confirmar Exclusão'}
              </Button>
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

        {/* Alterar acesso — move a branch's login to a new person.
            The agency row is untouched, so candidates, empresas, vagas and
            reuniões all stay attached exactly as they are. */}
        <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar acesso da agência</DialogTitle>
              <DialogDescription>
                {accessAgency?.agency_name}
                {accessAgency?.city ? ` · ${accessAgency.city}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Os dados da agência não mudam — candidatos, empresas, vagas e reuniões
              continuam exatamente como estão. Só o login muda. Quem usava o acesso
              anterior perde o acesso.
            </div>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="access-email">Novo e-mail de acesso</Label>
                <Input
                  id="access-email"
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  placeholder="nome@anecrh.com.br"
                />
              </div>
              <div>
                <Label htmlFor="access-password">Nova senha</Label>
                <Input
                  id="access-password"
                  type="text"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Fica visível para você copiar e enviar ao responsável. Deixe em
                  branco para manter a senha atual.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAccessDialogOpen(false)}
                disabled={updateAccessMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const emailChanged =
                    !!accessEmail.trim() &&
                    accessEmail.trim().toLowerCase() !== (accessAgency?.email || '').toLowerCase();
                  const password = accessPassword.trim();
                  if (!emailChanged && !password) {
                    toast.error('Informe um novo e-mail ou uma nova senha');
                    return;
                  }
                  if (password && password.length < 8) {
                    toast.error('A senha deve ter pelo menos 8 caracteres');
                    return;
                  }
                  updateAccessMutation.mutate({
                    id: accessAgency.id,
                    ...(emailChanged ? { email: accessEmail.trim() } : {}),
                    ...(password ? { password } : {}),
                  });
                }}
                disabled={updateAccessMutation.isPending}
              >
                {updateAccessMutation.isPending ? <Skeleton className="h-4 w-24" /> : 'Salvar acesso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
