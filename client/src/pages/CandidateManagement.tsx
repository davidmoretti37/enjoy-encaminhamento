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
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  UserCheck,
  UserX,
  ArrowLeft
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function CandidateManagement() {
  useAgentContext('candidatos');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  const { data: candidates, isLoading, refetch } = trpc.candidate.getAllForAdmin.useQuery();
  const updateStatusMutation = trpc.candidate.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
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

  const handleActivate = async (candidateId: string) => {
    await updateStatusMutation.mutateAsync({ id: candidateId, status: 'active' });
  };

  const handleDeactivate = async (candidateId: string) => {
    await updateStatusMutation.mutateAsync({ id: candidateId, status: 'inactive' });
  };

  const handleMarkEmployed = async (candidateId: string) => {
    await updateStatusMutation.mutateAsync({ id: candidateId, status: 'employed' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'employed':
        return <Badge className="bg-blue-500">Empregado</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativo</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEducationLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'fundamental': 'Fundamental',
      'medio': 'Médio',
      'superior': 'Superior',
      'pos-graduacao': 'Pós-graduação',
      'mestrado': 'Mestrado',
      'doutorado': 'Doutorado'
    };
    return labels[level] || level;
  };

  // Filter candidates based on search term
  const filteredCandidates = candidates?.filter((candidate: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      candidate.full_name?.toLowerCase().includes(searchLower) ||
      candidate.cpf?.includes(searchTerm) ||
      candidate.users?.email?.toLowerCase().includes(searchLower) ||
      candidate.city?.toLowerCase().includes(searchLower)
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

        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative">
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Users className="h-10 w-10" />
              Gerenciamento de Candidatos
            </h1>
            <p className="text-green-100 text-lg">
              Visualizar, buscar e gerenciar todos os candidatos da plataforma
            </p>
          </div>
        </div>

        {/* Summary Cards - Vibrant Gradients */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-100">Total de Candidatos</CardTitle>
              <Users className="h-5 w-5 text-indigo-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{candidates?.length || 0}</div>
              <p className="text-xs text-indigo-100">
                Candidatos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Candidatos Ativos</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {candidates?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-green-100">
                Disponíveis para vagas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Empregados</CardTitle>
              <UserCheck className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {candidates?.filter((c: any) => c.status === 'employed').length || 0}
              </div>
              <p className="text-xs text-blue-100">
                Contratados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Inativos</CardTitle>
              <UserX className="h-5 w-5 text-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {candidates?.filter((c: any) => c.status === 'inactive').length || 0}
              </div>
              <p className="text-xs text-gray-100">
                Desativados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Candidatos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, email ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Todos os Candidatos</CardTitle>
                <CardDescription>
                  Lista completa de candidatos cadastrados na plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCandidates && filteredCandidates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Escolaridade</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate: any) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">
                        {candidate.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {candidate.users?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {candidate.education_level
                          ? getEducationLevelLabel(candidate.education_level)
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{candidate.city || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                      <TableCell>
                        {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {candidate.status === 'inactive' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivate(candidate.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Ativar
                            </Button>
                          )}
                          {candidate.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkEmployed(candidate.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Empregar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeactivate(candidate.id)}
                                disabled={updateStatusMutation.isLoading}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Desativar
                              </Button>
                            </>
                          )}
                          {candidate.status === 'employed' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivate(candidate.id)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCandidate(candidate.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : searchTerm && (!filteredCandidates || filteredCandidates.length === 0) ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum candidato encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar seus critérios de busca
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum candidato cadastrado</h3>
                <p className="text-muted-foreground">
                  Candidatos aparecerão aqui quando se cadastrarem na plataforma
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
