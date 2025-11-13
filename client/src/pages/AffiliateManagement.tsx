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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  UserPlus,
  Mail,
  MapPin,
  TrendingUp,
  Eye,
  Search,
  ArrowLeft,
  UserCheck,
  UserX,
  Send
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AffiliateManagement() {
  useAgentContext('escolas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for new affiliate invitation
  const [inviteEmail, setInviteEmail] = useState("");
  const [cities, setCities] = useState<string[]>([""]);

  const { data: affiliates, isLoading, refetch } = trpc.affiliate.getAll.useQuery();
  const { data: invitations, refetch: refetchInvitations } = trpc.affiliate.getInvitations.useQuery();

  const createInvitationMutation = trpc.affiliate.createInvitation.useMutation({
    onSuccess: (data) => {
      toast.success('Convite criado com sucesso!');
      setIsDialogOpen(false);

      // Open Gmail with pre-filled email
      const invitationLink = `${window.location.origin}/affiliate/accept/${data.token}`;
      const subject = encodeURIComponent('Convite para ser Franqueado');
      const body = encodeURIComponent(`Olá,

Você foi convidado(a) para se juntar à nossa rede como franqueado!

Para criar sua conta e preencher as informações da sua franquia, acesse o link abaixo:

${invitationLink}

Este convite expira em 7 dias.

Atenciosamente,
Equipe Corriculos`);

      // Open Gmail compose with pre-filled content
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inviteEmail)}&su=${subject}&body=${body}`;
      window.open(gmailUrl, '_blank');

      setInviteEmail("");
      setCities([""]);
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar convite');
    }
  });

  const updateStatusMutation = trpc.affiliate.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um super administrador para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleCreateInvitation = () => {
    if (!inviteEmail.trim()) {
      toast.error('Por favor, forneça um email');
      return;
    }

    // Filter out empty city names
    const validCities = cities.filter(city => city.trim());

    if (validCities.length === 0) {
      toast.error('Por favor, adicione pelo menos uma cidade');
      return;
    }

    if (validCities.length > 100) {
      toast.error('O número máximo de cidades é 100');
      return;
    }

    createInvitationMutation.mutate({
      email: inviteEmail,
      cities: validCities,
    });
  };

  const handleToggleStatus = async (affiliateId: string, currentStatus: boolean) => {
    await updateStatusMutation.mutateAsync({
      id: affiliateId,
      is_active: !currentStatus
    });
  };

  // Filter affiliates based on search term
  const filteredAffiliates = affiliates?.filter((affiliate: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      affiliate.name?.toLowerCase().includes(searchLower) ||
      affiliate.city?.toLowerCase().includes(searchLower) ||
      affiliate.contact_email?.toLowerCase().includes(searchLower)
    );
  });

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/affiliate/accept/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para área de transferência!');
  };

  const sendInvitationEmail = (invitation: any) => {
    const invitationLink = `${window.location.origin}/affiliate/accept/${invitation.token}`;
    const subject = `Convite para ser Franqueado - ${invitation.city}`;
    const body = `Olá ${invitation.name},

Você foi convidado para ser nosso franqueado na cidade de ${invitation.city}!

Para aceitar o convite e criar sua conta, acesse o link abaixo:

${invitationLink}

Este convite expira em ${new Date(invitation.expires_at).toLocaleDateString('pt-BR')}.

Atenciosamente,
Equipe Corriculos`;

    // Open Gmail compose with pre-filled content
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(invitation.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    toast.success('Gmail aberto para enviar o convite!');
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

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="relative">
            <h1 className="text-4xl font-semibold flex items-center gap-3 mb-2">
              <UserPlus className="h-10 w-10" />
              Gerenciamento de Franqueados
            </h1>
            <p className="text-slate-300 text-lg">
              Gerenciar franqueados regionais e suas permissões
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Franqueados</CardTitle>
              <UserPlus className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">{affiliates?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Franqueados cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Franqueados Ativos</CardTitle>
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {affiliates?.filter((a: any) => a.is_active).length || 0}
              </div>
              <p className="text-xs text-emerald-600">
                Operando atualmente
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Convites Pendentes</CardTitle>
              <Mail className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-amber-900">
                {invitations?.filter((i: any) => !i.claimed_at && i.is_active).length || 0}
              </div>
              <p className="text-xs text-amber-600">
                Aguardando aceitação
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Franqueados Inativos</CardTitle>
              <UserX className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">
                {affiliates?.filter((a: any) => !a.is_active).length || 0}
              </div>
              <p className="text-xs text-red-600">
                Desativados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar Novo Franqueado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Franqueado</DialogTitle>
                <DialogDescription>
                  Envie um convite para um novo franqueado. Eles preencherão todas as informações da franquia ao aceitar o convite.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="franqueado@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    O franqueado receberá um link para criar sua conta e preencher todas as informações da franquia.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cidades *</Label>
                  <div className="space-y-2">
                    {cities.map((city, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={`Cidade ${index + 1}`}
                          value={city}
                          onChange={(e) => {
                            const updatedCities = [...cities];
                            updatedCities[index] = e.target.value;
                            setCities(updatedCities);
                          }}
                        />
                        {cities.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const updatedCities = cities.filter((_, i) => i !== index);
                              setCities(updatedCities);
                            }}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCities([...cities, ""]);
                      }}
                      disabled={cities.length >= 100}
                    >
                      + Adicionar Cidade
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O franqueado deverá registrar uma escola para cada cidade listada.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateInvitation}
                  disabled={createInvitationMutation.isLoading}
                >
                  {createInvitationMutation.isLoading ? <ClassicLoader /> : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex-1 max-w-md ml-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, região ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations && invitations.some((i: any) => !i.claimed_at && i.is_active) && (
          <Card className="shadow-lg border-amber-200 bg-amber-50/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-600" />
                <CardTitle>Convites Pendentes</CardTitle>
              </div>
              <CardDescription>
                Convites enviados aguardando aceitação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations
                  .filter((i: any) => !i.claimed_at && i.is_active)
                  .map((invitation: any) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <p className="font-medium">{invitation.name}</p>
                        <p className="text-sm text-muted-foreground">{invitation.email} • {invitation.city}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expira em {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => sendInvitationEmail(invitation)}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Enviar Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInvitationLink(invitation.token)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Copiar Link
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Affiliates Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-slate-600" />
              <div>
                <CardTitle>Todos os Franqueados</CardTitle>
                <CardDescription>
                  Lista completa de franqueados cadastrados na plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAffiliates && filteredAffiliates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((affiliate: any) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">
                        {affiliate.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {affiliate.city || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{affiliate.contact_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          {affiliate.commission_rate}%
                        </div>
                      </TableCell>
                      <TableCell>
                        {affiliate.is_active ? (
                          <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                          <Badge className="bg-gray-500">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {affiliate.created_at ? new Date(affiliate.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={affiliate.is_active ? "destructive" : "default"}
                            onClick={() => handleToggleStatus(affiliate.id, affiliate.is_active)}
                            disabled={updateStatusMutation.isLoading}
                          >
                            {affiliate.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/admin/affiliates/${affiliate.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : searchTerm && (!filteredAffiliates || filteredAffiliates.length === 0) ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum franqueado encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar seus critérios de busca
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum franqueado cadastrado</h3>
                <p className="text-muted-foreground">
                  Comece convidando seu primeiro franqueado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
