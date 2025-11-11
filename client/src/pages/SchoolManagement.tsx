import { useAuth } from "@/_core/hooks/useAuth";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Ban,
  Mail,
  Copy,
  Send,
  UserPlus,
  Clock,
  X as XIcon,
  ArrowLeft
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SchoolManagement() {
  useAgentContext('escolas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<any>(null);

  const { data: schools, isLoading, refetch } = trpc.school.getAll.useQuery();
  const { data: invitations, refetch: refetchInvitations } = trpc.invitation.list.useQuery();
  const { data: franchises } = trpc.invitation.getFranchises.useQuery();

  const updateStatusMutation = trpc.school.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const createInvitationMutation = trpc.invitation.create.useMutation({
    onSuccess: (data) => {
      setCreatedInvitation(data);
      refetchInvitations();
      toast.success("Convite criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar convite: ${error.message}`);
    }
  });

  const revokeInvitationMutation = trpc.invitation.revoke.useMutation({
    onSuccess: () => {
      refetchInvitations();
      toast.success("Convite revogado");
    }
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Aceito</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500">Expirado</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500">Revogado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleCreateInvitation = async () => {
    if (!inviteEmail || !selectedFranchise) {
      toast.error("Preencha todos os campos");
      return;
    }

    await createInvitationMutation.mutateAsync({
      email: inviteEmail,
      franchiseId: selectedFranchise,
    });
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register/school/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  const handleSendViaGmail = (email: string, token: string) => {
    const inviteUrl = `${window.location.origin}/register/school/${token}`;
    const subject = encodeURIComponent("Convite para Plataforma Corriculos");
    const body = encodeURIComponent(
      `Olá!\n\nVocê foi convidado(a) para se cadastrar como escola na Plataforma Corriculos.\n\nClique no link abaixo para criar sua conta:\n${inviteUrl}\n\nEste convite é válido por 7 dias e pode ser usado apenas uma vez.\n\nAté breve!\nEquipe Corriculos`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCloseInviteDialog = () => {
    setShowInviteDialog(false);
    setCreatedInvitation(null);
    setInviteEmail("");
    setSelectedFranchise("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <Building2 className="h-10 w-10" />
                Gerenciamento de Escolas
              </h1>
              <p className="text-blue-100 text-lg">
                Aprovar, editar e gerenciar todas as escolas da plataforma
              </p>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Convidar Escola
            </Button>
          </div>
        </div>

        {/* Summary Cards - Vibrant Gradients */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total de Escolas</CardTitle>
              <Building2 className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{schools?.length || 0}</div>
              <p className="text-xs text-blue-100">
                Escolas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Escolas Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {schools?.filter(s => s.status === 'active').length || 0}
              </div>
              <p className="text-xs text-green-100">
                Aprovadas e operando
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Aguardando Aprovação</CardTitle>
              <Clock className="h-5 w-5 text-yellow-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {schools?.filter(s => s.status === 'pending').length || 0}
              </div>
              <p className="text-xs text-yellow-100">
                Pendentes de análise
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Table */}
        {invitations && invitations.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle>Convites Pendentes</CardTitle>
                  <CardDescription>
                    Convites enviados aguardando aceitação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Franquia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.filter((inv: any) => inv.status === 'pending').map((invitation: any) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{invitation.franchises?.name || 'N/A'}</TableCell>
                      <TableCell>{getInvitationStatusBadge(invitation.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyInviteLink(invitation.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendViaGmail(invitation.email, invitation.token)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeInvitationMutation.mutate({ token: invitation.token })}
                            disabled={revokeInvitationMutation.isLoading}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Schools Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Todas as Escolas</CardTitle>
                <CardDescription>
                  Lista completa de escolas cadastradas na plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {schools && schools.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Franquia</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school: any) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{school.school_name || school.trade_name}</div>
                          {school.trade_name && school.school_name !== school.trade_name && (
                            <div className="text-xs text-muted-foreground">{school.trade_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {school.franchises?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{school.city || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(school.status)}</TableCell>
                      <TableCell>
                        {new Date(school.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {school.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(school.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {school.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(school.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Suspender
                            </Button>
                          )}
                          {school.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(school.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSchool(school.id)}
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
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma escola cadastrada</h3>
                <p className="text-muted-foreground">
                  Escolas aparecerão aqui quando se cadastrarem na plataforma
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitation Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={handleCloseInviteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {createdInvitation ? "Convite Criado!" : "Convidar Nova Escola"}
              </DialogTitle>
              <DialogDescription>
                {createdInvitation
                  ? "Envie o link de convite para o email da escola"
                  : "Preencha os dados para criar um convite de cadastro"}
              </DialogDescription>
            </DialogHeader>

            {!createdInvitation ? (
              <>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email da Escola</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="escola@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="franchise">Franquia</Label>
                    <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a franquia" />
                      </SelectTrigger>
                      <SelectContent>
                        {franchises?.map((franchise: any) => (
                          <SelectItem key={franchise.id} value={franchise.id}>
                            {franchise.name} - {franchise.region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseInviteDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={createInvitationMutation.isLoading}
                  >
                    {createInvitationMutation.isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Criar Convite
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Link de Convite:</p>
                    <code className="text-xs break-all">
                      {`${window.location.origin}/register/school/${createdInvitation.token}`}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopyInviteLink(createdInvitation.token)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleSendViaGmail(inviteEmail, createdInvitation.token)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar via Gmail
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseInviteDialog}>Fechar</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
