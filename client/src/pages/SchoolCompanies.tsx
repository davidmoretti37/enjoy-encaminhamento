import { useAuth } from "@/_core/hooks/useAuth";
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
import { Building, ArrowLeft, Search, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useState } from "react";

export default function SchoolCompanies() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: companies, isLoading: companiesLoading } = trpc.school.getCompanies.useQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'school') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma escola para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>Voltar para Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCompanies = companies?.filter((company: any) =>
    company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/school/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Empresas da Região
          </h1>
          <p className="text-muted-foreground mt-1">
            Empresas disponíveis na sua cidade
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total de Empresas</CardTitle>
              <Building className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-blue-900">
                {companies?.length || 0}
              </div>
              <p className="text-xs text-blue-600">Empresas na sua região</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Empresas Ativas</CardTitle>
              <Building className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-emerald-900">
                {companies?.filter((c: any) => c.status === 'active').length || 0}
              </div>
              <p className="text-xs text-emerald-600">Contratando ativamente</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Setores</CardTitle>
              <Briefcase className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-purple-900">
                {new Set(companies?.map((c: any) => c.industry).filter(Boolean)).size || 0}
              </div>
              <p className="text-xs text-purple-600">Setores diferentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, setor ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Companies Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Lista de todas as empresas da sua cidade</CardDescription>
          </CardHeader>
          <CardContent>
            {companiesLoading ? (
              <div className="flex justify-center py-8">
                <ClassicLoader />
              </div>
            ) : filteredCompanies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: any) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.company_name}</TableCell>
                      <TableCell>{company.industry || '-'}</TableCell>
                      <TableCell>{company.city || '-'}</TableCell>
                      <TableCell>{company.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            company.status === 'active' ? 'default' :
                            company.status === 'suspended' ? 'destructive' :
                            'outline'
                          }
                        >
                          {company.status === 'active' ? 'Ativa' :
                           company.status === 'suspended' ? 'Suspensa' :
                           'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(company.created_at).toLocaleDateString('pt-BR')}
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
                    : 'As empresas da sua cidade aparecerão aqui'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
