// Type checking disabled: tRPC type inference issues with franchises endpoint
import { useAuth } from "@/_core/hooks/useAuth";
import ContentTransition from "@/components/ui/ContentTransition";
import { PageHeaderSkeleton, SearchBarSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function AgencyManagement() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<any>(null);

  const { data: agencies, isLoading, refetch } = trpc.agency.getAll.useQuery();
  const { data: invitations, refetch: refetchInvitations } = trpc.invitation.list.useQuery();
  const { data: franchises } = (trpc.invitation as any).getFranchises.useQuery();

  const updateStatusMutation = trpc.agency.updateStatus.useMutation({
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

  if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
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

  const handleApprove = async (agencyId: string) => {
    await updateStatusMutation.mutateAsync({ id: agencyId, status: 'active' });
  };

  const handleSuspend = async (agencyId: string) => {
    await updateStatusMutation.mutateAsync({ id: agencyId, status: 'suspended' });
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

    await (createInvitationMutation as any).mutateAsync({
      email: inviteEmail,
      franchiseId: selectedFranchise,
    });
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register/agency?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  const handleSendViaGmail = (email: string, token: string) => {
    const inviteUrl = `${window.location.origin}/register/agency?token=${token}`;
    const subject = encodeURIComponent("Convite para Plataforma Currículos");
    const body = encodeURIComponent(
      `Olá!\n\nVocê foi convidado(a) para se cadastrar como agência na Plataforma Currículos.\n\nClique no link abaixo para criar sua conta:\n${inviteUrl}\n\nEste convite é válido por 7 dias e pode ser usado apenas uma vez.\n\nAté breve!\nEquipe Currículos`
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
      <ContentTransition isLoading={isLoading} skeleton={
        <>
          <PageHeaderSkeleton />
          <SearchBarSkeleton />
          <TableSkeleton columns={5} rows={6} />
        </>
      }>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-7 w-7 text-blue-600" />
            Agências
          </h1>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Agência
          </Button>
        </div>

        {/* Summary Cards - Modern Clean Design */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Agências</CardTitle>
              <Building2 className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900 mb-1">{agencies?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Agências cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Agências Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-emerald-900 mb-1">
                {agencies?.filter((s: any) => s.status === 'active').length || 0}
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
                {new Set(agencies?.map((s: any) => s.city).filter(Boolean)).size || 0}
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
                            disabled={revokeInvitationMutation.isPending}
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

        {/* Agencies Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Todas as Agências</CardTitle>
                <CardDescription>
                  Lista completa de escolas cadastradas na plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {agencies && agencies.length > 0 ? (
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
                  {agencies.map((agency: any) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{agency.agency_name || agency.trade_name}</div>
                          {agency.trade_name && agency.agency_name !== agency.trade_name && (
                            <div className="text-xs text-muted-foreground">{agency.trade_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agency.franchises?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{agency.city || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{agency.cnpj || '-'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(agency.status)}</TableCell>
                      <TableCell>
                        {new Date(agency.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedAgency(agency.id)}
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
                <h3 className="text-lg font-semibold mb-2">Nenhuma agência cadastrada</h3>
                <p className="text-muted-foreground">
                  Agências aparecerão aqui quando se cadastrarem na plataforma
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
                {createdInvitation ? "Convite Criado!" : "Convidar Nova Agência"}
              </DialogTitle>
              <DialogDescription>
                {createdInvitation
                  ? "Envie o link de convite para o email da agência"
                  : "Preencha os dados para criar um convite de cadastro"}
              </DialogDescription>
            </DialogHeader>

            {!createdInvitation ? (
              <>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email da Agência</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="agencia@exemplo.com"
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
                    disabled={createInvitationMutation.isPending}
                  >
                    {createInvitationMutation.isPending ? (
                      <>
                        <Skeleton className="h-4 w-4 rounded-full" />
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
                      {`${window.location.origin}/register/agency?token=${createdInvitation.token}`}
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

        {/* Agency Details Dialog */}
        <Dialog open={!!selectedAgency} onOpenChange={() => setSelectedAgency(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Detalhes da Agência
              </DialogTitle>
              <DialogDescription>
                Informações completas da agência cadastrada
              </DialogDescription>
            </DialogHeader>

            {selectedAgency && (() => {
              const agency = agencies?.find((s: any) => s.id === selectedAgency);
              if (!agency) return <div>Agência não encontrada</div>;

              return (
                <div className="space-y-6 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Nome da Agência</Label>
                        <p className="font-medium">{agency.agency_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Nome Fantasia</Label>
                        <p className="font-medium">{agency.trade_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Razão Social</Label>
                        <p className="font-medium">{agency.legal_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CNPJ</Label>
                        <p className="font-medium font-mono">{agency.cnpj || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{agency.email || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="font-medium">{agency.phone || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Website</Label>
                        <p className="font-medium">{agency.website || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
                    <div className="grid gap-4">
                      <div>
                        <Label className="text-muted-foreground">Endereço Completo</Label>
                        <p className="font-medium">{agency.address || '-'}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label className="text-muted-foreground">Cidade</Label>
                          <p className="font-medium">{agency.city || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Estado</Label>
                          <p className="font-medium">{agency.state || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CEP</Label>
                          <p className="font-medium">{agency.postal_code || '-'}</p>
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
                        <p className="font-medium">{agency.franchises?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div className="mt-1">{getStatusBadge(agency.status)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data de Cadastro</Label>
                        <p className="font-medium">{new Date(agency.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => setSelectedAgency(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
