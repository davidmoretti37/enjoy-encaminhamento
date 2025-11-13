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
import { trpc } from "@/lib/trpc";
import {
  Building,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  MapPin
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AffiliateCompanies() {
  useAgentContext('empresas');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliate, isLoading: affiliateLoading } = trpc.affiliate.getByUserId.useQuery();
  const { data: companies, isLoading: companiesLoading } = trpc.affiliate.getCompanies.useQuery();

  const isLoading = authLoading || affiliateLoading || companiesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'affiliate') {
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

  if (!affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Perfil Não Encontrado</CardTitle>
            <CardDescription>Não foi possível encontrar seu perfil de franqueado.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inativa</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspensa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies?.filter((company: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(searchLower) ||
      company.cnpj?.includes(searchTerm) ||
      company.city?.toLowerCase().includes(searchLower)
    );
  });

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
              Empresas da Região
            </h1>
            <p className="text-slate-300 text-lg">
              Visualizar empresas cadastradas pelas escolas da região: {affiliate.region}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Empresas</CardTitle>
              <Building className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">{companies?.length || 0}</div>
              <p className="text-xs text-slate-500">
                Empresas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Empresas Ativas</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {companies?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-emerald-600">
                Em operação
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Inativas</CardTitle>
              <XCircle className="h-5 w-5 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-slate-900">
                {companies?.filter((c: any) => c.status === 'inactive').length || 0}
              </div>
              <p className="text-xs text-slate-600">
                Desativadas
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
                {companies?.filter((c: any) => c.status === 'suspended').length || 0}
              </div>
              <p className="text-xs text-red-600">
                Empresas suspensas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Empresas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Empresas da Região</CardTitle>
                <CardDescription>
                  Lista de empresas cadastradas pelas escolas da sua região
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCompanies && filteredCompanies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: any) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.company_name}</TableCell>
                      <TableCell className="font-mono text-sm">{company.cnpj || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{company.email || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{company.city || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell>
                        {company.created_at ? new Date(company.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar os termos de busca'
                    : 'Empresas aparecerão aqui quando as escolas da sua região cadastrarem'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
