import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  FileCheck
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CompanyEmployees() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("active");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    rating: '',
    strengths: '',
    improvements: '',
    notes: '',
  });

  const utils = trpc.useUtils();

  const { data: contracts, isLoading } = trpc.company.getContracts.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: expiringContracts } = trpc.company.getExpiringContracts.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const submitReportMutation = trpc.company.submitMonthlyReport.useMutation({
    onSuccess: () => {
      toast.success('Relatório enviado com sucesso!');
      setReportModalOpen(false);
      setReportForm({ rating: '', strengths: '', improvements: '', notes: '' });
      utils.company.getContracts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar relatório');
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser uma empresa para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contractTypeLabels: Record<string, string> = {
    estagio: 'Estágio',
    clt: 'CLT',
    'menor-aprendiz': 'Menor Aprendiz',
  };

  const handleViewDetails = (contract: any) => {
    setLocation(`/company/employees/${contract.id}`);
  };

  const handleOpenReport = (contract: any) => {
    setSelectedContract(contract);
    setReportModalOpen(true);
  };

  const handleSubmitReport = () => {
    if (!reportForm.rating) {
      toast.error('Selecione uma avaliação');
      return;
    }

    const now = new Date();
    submitReportMutation.mutate({
      contractId: selectedContract.id,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      rating: reportForm.rating as 'excellent' | 'good' | 'regular' | 'needs_improvement',
      strengths: reportForm.strengths || undefined,
      improvements: reportForm.improvements || undefined,
      notes: reportForm.notes || undefined,
    });
  };

  const activeContracts = contracts?.filter((c: any) => c.status === 'active') || [];
  const endedContracts = contracts?.filter((c: any) => c.status !== 'active') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-500 mt-1">Gerencie seus funcionários e acompanhe relatórios</p>
        </div>

        {/* Expiring Warning */}
        {expiringContracts && expiringContracts.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Contratos Expirando em Breve</AlertTitle>
            <AlertDescription className="text-amber-600">
              {expiringContracts.map((contract: any) => (
                <div key={contract.id} className="mt-2 flex items-center justify-between">
                  <span>
                    <strong>{contract.candidate?.full_name}</strong> - {contract.job?.title} expira em{' '}
                    <strong>{differenceInDays(new Date(contract.end_date), new Date())} dias</strong>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(contract)}>
                    Ver Mais
                  </Button>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-8"><ClassicLoader /></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Ativos ({activeContracts.length})</TabsTrigger>
              <TabsTrigger value="ended">Encerrados ({endedContracts.length})</TabsTrigger>
            </TabsList>

            {/* Active Contracts */}
            <TabsContent value="active" className="space-y-4">
              {activeContracts.length > 0 ? (
                activeContracts.map((contract: any) => {
                  const lastReport = contract.feedback?.[0];
                  const now = new Date();
                  const currentMonth = `${now.getMonth() + 1}/${now.getFullYear()}`;
                  const hasCurrentReport = lastReport &&
                    lastReport.period_month === now.getMonth() + 1 &&
                    lastReport.period_year === now.getFullYear();

                  return (
                    <Card key={contract.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="h-5 w-5 text-gray-400" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                {contract.candidate?.full_name}
                              </h3>
                            </div>
                            <p className="text-gray-600">
                              {contract.job?.title} • {contractTypeLabels[contract.job?.contract_type] || contract.job?.contract_type}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Desde: {contract.start_date && format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                              {contract.end_date && ` • Até: ${format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}`}
                            </p>
                            {contract.monthly_salary && (
                              <p className="text-sm text-gray-500">
                                Salário: R$ {contract.monthly_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}

                            {/* Report Status */}
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-sm text-gray-600">Relatório {currentMonth}:</span>
                              {hasCurrentReport ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Enviado
                                </Badge>
                              ) : (
                                <>
                                  <Badge className="bg-amber-100 text-amber-700">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendente
                                  </Badge>
                                  <Button variant="outline" size="sm" onClick={() => handleOpenReport(contract)}>
                                    Preencher
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => handleViewDetails(contract)}>
                            Ver Mais
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                    <User className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhum contrato ativo</h3>
                  <p className="text-gray-400 text-sm">Os funcionários contratados aparecerão aqui</p>
                </div>
              )}
            </TabsContent>

            {/* Ended Contracts */}
            <TabsContent value="ended" className="space-y-4">
              {endedContracts.length > 0 ? (
                endedContracts.map((contract: any) => (
                  <Card key={contract.id} className="bg-gray-50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-700">
                              {contract.candidate?.full_name}
                            </h3>
                          </div>
                          <p className="text-gray-500">
                            {contract.job?.title} • {contractTypeLabels[contract.job?.contract_type] || contract.job?.contract_type}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {contract.start_date && format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })} -
                            {contract.end_date && format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
                    <FileCheck className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhum contrato encerrado</h3>
                  <p className="text-gray-400 text-sm">Contratos finalizados aparecerão aqui</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Report Modal */}
        <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Relatório Mensal</DialogTitle>
              <DialogDescription>
                {selectedContract?.candidate?.full_name} - {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Avaliação geral *</Label>
                <Select
                  value={reportForm.rating}
                  onValueChange={(value) => setReportForm(prev => ({ ...prev, rating: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excelente</SelectItem>
                    <SelectItem value="good">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="needs_improvement">Precisa melhorar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pontos fortes</Label>
                <Textarea
                  placeholder="Descreva os pontos positivos do funcionário..."
                  value={reportForm.strengths}
                  onChange={(e) => setReportForm(prev => ({ ...prev, strengths: e.target.value }))}
                />
              </div>
              <div>
                <Label>Pontos a melhorar</Label>
                <Textarea
                  placeholder="Descreva os pontos que podem ser melhorados..."
                  value={reportForm.improvements}
                  onChange={(e) => setReportForm(prev => ({ ...prev, improvements: e.target.value }))}
                />
              </div>
              <div>
                <Label>Observações gerais</Label>
                <Textarea
                  placeholder="Outras observações..."
                  value={reportForm.notes}
                  onChange={(e) => setReportForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitReport} disabled={submitReportMutation.isPending}>
                {submitReportMutation.isPending ? 'Enviando...' : 'Enviar Relatório'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
