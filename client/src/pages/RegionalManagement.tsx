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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2,
  UserPlus,
  Mail,
  MapPin,
  Eye,
  ArrowLeft,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Send
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function RegionalManagement() {
  useAgentContext('escolas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Affiliate state
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState("");
  const [isAffiliateDialogOpen, setIsAffiliateDialogOpen] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({
    email: "",
    cities: [""]
  });

  // School state
  const [schoolSearchTerm, setSchoolSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // Queries
  const { data: affiliates, isLoading: affiliatesLoading, refetch: refetchAffiliates } = trpc.affiliate.getAll.useQuery();
  const { data: affiliateInvitations, refetch: refetchAffiliateInvitations } = trpc.affiliate.getInvitations.useQuery();
  const { data: schools, isLoading: schoolsLoading, refetch: refetchSchools } = trpc.school.getAll.useQuery();

  // Mutations - Affiliates
  const createAffiliateInvitationMutation = trpc.affiliate.createInvitation.useMutation({
    onSuccess: (data) => {
      toast.success('Convite criado com sucesso!');
      setIsAffiliateDialogOpen(false);

      const invitationLink = `${window.location.origin}/affiliate/accept/${data.token}`;
      const subject = `Convite para ser Franqueado`;
      const body = `Olá,

Você foi convidado para se juntar à nossa rede como franqueado!

Para aceitar o convite e criar sua conta, acesse o link abaixo:

${invitationLink}

Este convite expira em 7 dias.

Atenciosamente,
Equipe Corriculos`;

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(newAffiliate.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');

      setNewAffiliate({ name: "", email: "", city: "" });
      refetchAffiliateInvitations();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar convite');
    }
  });

  const updateAffiliateStatusMutation = trpc.affiliate.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      refetchAffiliates();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  // Mutations - Schools
  const updateSchoolStatusMutation = trpc.school.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status da escola atualizado!');
      refetchSchools();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar escola');
    }
  });


  if (authLoading || affiliatesLoading || schoolsLoading) {
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

  // Handlers - Affiliates
  const handleActivateAffiliate = async (id: string) => {
    await updateAffiliateStatusMutation.mutateAsync({ id, is_active: true });
  };

  const handleDeactivateAffiliate = async (id: string) => {
    await updateAffiliateStatusMutation.mutateAsync({ id, is_active: false });
  };

  const handleCreateAffiliateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty city names
    const validCities = newAffiliate.cities.filter(city => city.trim());

    if (validCities.length === 0) {
      toast.error('Por favor, adicione pelo menos uma cidade');
      return;
    }

    await createAffiliateInvitationMutation.mutateAsync({
      email: newAffiliate.email,
      cities: validCities,
      commission_rate: 30
    });
    setNewAffiliate({ email: "", cities: [""] });
  };

  // Handlers - Schools
  const handleApproveSchool = async (id: string) => {
    await updateSchoolStatusMutation.mutateAsync({ id, status: 'active' });
  };

  const handleSuspendSchool = async (id: string) => {
    await updateSchoolStatusMutation.mutateAsync({ id, status: 'suspended' });
  };


  const getAffiliateStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-500">Ativo</Badge>
    ) : (
      <Badge className="bg-gray-500">Inativo</Badge>
    );
  };

  const getSchoolStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter affiliates
  const filteredAffiliates = affiliates?.filter((affiliate: any) => {
    if (!affiliateSearchTerm) return true;
    const searchLower = affiliateSearchTerm.toLowerCase();
    return (
      affiliate.name?.toLowerCase().includes(searchLower) ||
      affiliate.email?.toLowerCase().includes(searchLower) ||
      affiliate.region?.toLowerCase().includes(searchLower)
    );
  });

  // Filter schools
  const filteredSchools = schools?.filter((school: any) => {
    if (!schoolSearchTerm) return true;
    const searchLower = schoolSearchTerm.toLowerCase();
    return (
      school.school_name?.toLowerCase().includes(searchLower) ||
      school.cnpj?.includes(schoolSearchTerm) ||
      school.email?.toLowerCase().includes(searchLower) ||
      school.city?.toLowerCase().includes(searchLower)
    );
  });

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
              <MapPin className="h-10 w-10" />
              Gestão Regional
            </h1>
            <p className="text-slate-300 text-lg">
              Gerenciar franqueados e escolas da rede
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="affiliates" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="affiliates" className="gap-2">
              <Users className="h-4 w-4" />
              Franqueados
            </TabsTrigger>
            <TabsTrigger value="schools" className="gap-2">
              <Building2 className="h-4 w-4" />
              Escolas
            </TabsTrigger>
          </TabsList>

          {/* AFFILIATES TAB */}
          <TabsContent value="affiliates" className="space-y-6">
            {/* Summary Cards - Affiliates */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Ativos</CardTitle>
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {affiliates?.filter((a: any) => a.is_active).length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">
                    Em operação
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Inativos</CardTitle>
                  <UserX className="h-5 w-5 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-slate-900">
                    {affiliates?.filter((a: any) => !a.is_active).length || 0}
                  </div>
                  <p className="text-xs text-slate-600">
                    Desativados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">Convites Pendentes</CardTitle>
                  <Clock className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-yellow-900">
                    {affiliateInvitations?.filter((i: any) => i.status === 'pending').length || 0}
                  </div>
                  <p className="text-xs text-yellow-600">
                    Aguardando aceite
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Actions & Search - Affiliates */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Buscar por nome, email ou região..."
                  value={affiliateSearchTerm}
                  onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                />
              </div>
              <Button className="gap-2" onClick={() => setLocation('/admin/create-affiliate')}>
                <UserPlus className="h-4 w-4" />
                Convidar Franqueado
              </Button>
            </div>

            {/* Affiliates Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardTitle>Franqueados</CardTitle>
                <CardDescription>Lista de todos os franqueados da rede</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAffiliates && filteredAffiliates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Região</TableHead>
                        <TableHead>Comissão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAffiliates.map((affiliate: any) => (
                        <TableRow key={affiliate.id}>
                          <TableCell className="font-medium">{affiliate.name}</TableCell>
                          <TableCell>{affiliate.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {affiliate.region}
                            </div>
                          </TableCell>
                          <TableCell>{affiliate.commission_rate}%</TableCell>
                          <TableCell>{getAffiliateStatusBadge(affiliate.is_active)}</TableCell>
                          <TableCell>
                            {new Date(affiliate.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {affiliate.is_active ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeactivateAffiliate(affiliate.id)}
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleActivateAffiliate(affiliate.id)}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Ativar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {affiliateSearchTerm ? 'Nenhum franqueado encontrado' : 'Nenhum franqueado cadastrado'}
                    </h3>
                    <p className="text-muted-foreground">
                      {affiliateSearchTerm
                        ? 'Tente ajustar os termos de busca'
                        : 'Clique em "Convidar Franqueado" para adicionar o primeiro'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOLS TAB */}
          <TabsContent value="schools" className="space-y-6">
            {/* Summary Cards - Schools */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Ativas</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-emerald-900">
                    {schools?.filter((s: any) => s.status === 'active').length || 0}
                  </div>
                  <p className="text-xs text-emerald-600">
                    Em operação
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">Pendentes</CardTitle>
                  <Clock className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-yellow-900">
                    {schools?.filter((s: any) => s.status === 'pending').length || 0}
                  </div>
                  <p className="text-xs text-yellow-600">
                    Aguardando aprovação
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Suspensas</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold mb-1 text-red-900">
                    {schools?.filter((s: any) => s.status === 'suspended').length || 0}
                  </div>
                  <p className="text-xs text-red-600">
                    Suspensas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search - Schools */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Buscar por nome, CNPJ, email ou cidade..."
                  value={schoolSearchTerm}
                  onChange={(e) => setSchoolSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Schools Table */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle>Escolas</CardTitle>
                <CardDescription>Lista de todas as escolas da rede</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSchools && filteredSchools.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Franqueado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchools.map((school: any) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.school_name}</TableCell>
                          <TableCell className="font-mono text-sm">{school.cnpj || 'N/A'}</TableCell>
                          <TableCell>{school.email || 'N/A'}</TableCell>
                          <TableCell>{school.city || 'N/A'}</TableCell>
                          <TableCell>
                            {school.affiliate?.name || 'N/A'}
                          </TableCell>
                          <TableCell>{getSchoolStatusBadge(school.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {school.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApproveSchool(school.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              {school.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSuspendSchool(school.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Suspender
                                </Button>
                              )}
                              {school.status === 'suspended' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApproveSchool(school.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Reativar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {schoolSearchTerm ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
                    </h3>
                    <p className="text-muted-foreground">
                      {schoolSearchTerm
                        ? 'Tente ajustar os termos de busca'
                        : 'As escolas são convidadas pelos franqueados de cada região'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
