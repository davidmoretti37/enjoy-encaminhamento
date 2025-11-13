import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgentContext } from "@/hooks/useAgentContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Clock,
  Ban,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AffiliateSchools() {
  useAgentContext('escolas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
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
    onSuccess: (data) => {
      toast.success('Convite criado com sucesso!');
      setIsInviteDialogOpen(false);

      // Generate invitation link
      const invitationLink = `${window.location.origin}/register/school/${data.token}`;

      // Create email content
      const subject = encodeURIComponent('Convite para se juntar à nossa rede de escolas');
      const body = encodeURIComponent(
        `Olá,\n\n` +
        `Você foi convidado(a) para se juntar à nossa rede de escolas!\n\n` +
        `Para criar sua conta e começar a gerenciar candidatos, acesse o link abaixo:\n\n` +
        `${invitationLink}\n\n` +
        (inviteNotes ? `Informações adicionais:\n${inviteNotes}\n\n` : '') +
        `Este link é exclusivo para ${inviteEmail}.\n\n` +
        `Atenciosamente,\n` +
        `${affiliate?.name || 'Equipe'}`
      );

      // Open Gmail compose with pre-filled content
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inviteEmail)}&su=${subject}&body=${body}`;
      window.open(gmailUrl, '_blank');

      // Reset form
      setInviteEmail("");
      setInviteNotes("");

      toast.success('Abrindo Gmail para enviar o convite...');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar convite');
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

  const pendingSchools = filteredSchools?.filter((s: any) => s.status === 'pending') || [];
  const activeSchools = filteredSchools?.filter((s: any) => s.status === 'active') || [];
  const suspendedSchools = filteredSchools?.filter((s: any) => s.status === 'suspended') || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/affiliate/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="relative">
            <h1 className="text-4xl font-semibold flex items-center gap-3 mb-2">
              <Building className="h-10 w-10" />
              Gerenciamento de Escolas
            </h1>
            <p className="text-slate-300 text-lg">
              Região: {affiliate.region}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Escolas</CardTitle>
              <Building className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">{schools?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Na sua região
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-amber-900">
                {pendingSchools.length}
              </div>
              <p className="text-xs text-amber-600">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {activeSchools.length}
              </div>
              <p className="text-xs text-emerald-600">
                Operando
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Escolas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cidade ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" />
                Convidar Escola
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schools Tabs */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Escolas</CardTitle>
            <CardDescription>
              Gerencie as escolas da sua região
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                  Pendentes ({pendingSchools.length})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Ativas ({activeSchools.length})
                </TabsTrigger>
                <TabsTrigger value="suspended">
                  Suspensas ({suspendedSchools.length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Tab */}
              <TabsContent value="pending" className="mt-6">
                {pendingSchools.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSchools.map((school: any) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">
                            {school.school_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {school.city || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {school.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {school.created_at ? new Date(school.created_at).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(school.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(school)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma escola pendente</h3>
                    <p className="text-muted-foreground">
                      Não há escolas aguardando aprovação no momento
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Active Tab */}
              <TabsContent value="active" className="mt-6">
                {activeSchools.length > 0 ? (
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
                      {activeSchools.map((school: any) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">
                            {school.school_name}
                          </TableCell>
                          <TableCell>{school.city || 'N/A'}</TableCell>
                          <TableCell>{school.email}</TableCell>
                          <TableCell>{getStatusBadge(school.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspend(school.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Suspender
                              </Button>
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
                  <div className="text-center py-12">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma escola ativa</h3>
                    <p className="text-muted-foreground">
                      Escolas ativas aparecerão aqui após aprovação
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Suspended Tab */}
              <TabsContent value="suspended" className="mt-6">
                {suspendedSchools.length > 0 ? (
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
                      {suspendedSchools.map((school: any) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">
                            {school.school_name}
                          </TableCell>
                          <TableCell>{school.city || 'N/A'}</TableCell>
                          <TableCell>{school.email}</TableCell>
                          <TableCell>{getStatusBadge(school.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReactivate(school.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma escola suspensa</h3>
                    <p className="text-muted-foreground">
                      Escolas suspensas aparecerão aqui
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                  disabled={updateStatusMutation.isLoading || !rejectionReason.trim()}
                >
                  {updateStatusMutation.isLoading ? <ClassicLoader /> : 'Confirmar Rejeição'}
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
                disabled={createInvitationMutation.isLoading || !inviteEmail.trim()}
              >
                {createInvitationMutation.isLoading ? <ClassicLoader /> : 'Enviar Convite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
