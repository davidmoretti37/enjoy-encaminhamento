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
        <ClassicLoader />
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

        {/* Hero Header - Modern Clean Design */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8" />
                Gerenciamento de Escolas
              </h1>
              <p className="text-slate-300 text-base">
                Aprovar, editar e gerenciar todas as escolas da plataforma
              </p>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-md hover:shadow-lg transition-all"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Convidar Escola
            </Button>
          </div>
        </div>

        {/* Summary Cards - Modern Clean Design */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Escolas</CardTitle>
              <Building2 className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900 mb-1">{schools?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Escolas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Escolas Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-emerald-900 mb-1">
                {schools?.filter(s => s.status === 'active').length || 0}
              </div>
              <p className="text-xs text-emerald-600">
                Aprovadas e operando
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Cidades Atendidas</CardTitle>
              <Building2 className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-blue-900 mb-1">
                {new Set(schools?.map(s => s.city).filter(Boolean)).size || 0}
              </div>
              <p className="text-xs text-blue-600">
                Cidades diferentes
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
                    <TableHead>CNPJ</TableHead>
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
                      <TableCell>
                        <span className="font-mono text-sm">{school.cnpj || '-'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(school.status)}</TableCell>
                      <TableCell>
                        {new Date(school.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedSchool(school.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
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
                        <ClassicLoader />
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

        {/* School Details Dialog */}
        <Dialog open={!!selectedSchool} onOpenChange={() => setSelectedSchool(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Detalhes da Escola
              </DialogTitle>
              <DialogDescription>
                Informações completas da escola cadastrada
              </DialogDescription>
            </DialogHeader>

            {selectedSchool && (() => {
              const school = schools?.find(s => s.id === selectedSchool);
              if (!school) return <div>Escola não encontrada</div>;

              return (
                <div className="space-y-6 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Nome da Escola</Label>
                        <p className="font-medium">{school.school_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Nome Fantasia</Label>
                        <p className="font-medium">{school.trade_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Razão Social</Label>
                        <p className="font-medium">{school.legal_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CNPJ</Label>
                        <p className="font-medium font-mono">{school.cnpj || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{school.email || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="font-medium">{school.phone || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Website</Label>
                        <p className="font-medium">{school.website || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
                    <div className="grid gap-4">
                      <div>
                        <Label className="text-muted-foreground">Endereço Completo</Label>
                        <p className="font-medium">{school.address || '-'}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label className="text-muted-foreground">Cidade</Label>
                          <p className="font-medium">{school.city || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Estado</Label>
                          <p className="font-medium">{school.state || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CEP</Label>
                          <p className="font-medium">{school.postal_code || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Administrative Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Informações Administrativas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Franquia/Afiliado</Label>
                        <p className="font-medium">{school.franchises?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div className="mt-1">{getStatusBadge(school.status)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data de Cadastro</Label>
                        <p className="font-medium">{new Date(school.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => setSelectedSchool(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
