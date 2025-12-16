import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  User,
  FileText,
  FileCheck,
  ClipboardList,
  DollarSign,
  Download,
  GraduationCap,
  MapPin,
  Calendar,
  Briefcase
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CompanyEmployeeDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/company/employees/:employeeId");
  const employeeId = params?.employeeId;

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    rating: '',
    strengths: '',
    improvements: '',
    notes: '',
  });

  const utils = trpc.useUtils();

  // Fetch employee/contract details
  const { data: employee, isLoading } = trpc.company.getEmployeeDetails.useQuery(
    { contractId: employeeId! },
    { enabled: !!employeeId && !!user && user.role === 'company' }
  );

  // Fetch payment history for this employee
  const { data: paymentHistory, isLoading: paymentsLoading } = trpc.company.getEmployeePayments.useQuery(
    { contractId: employeeId! },
    { enabled: !!employeeId && !!user && user.role === 'company' }
  );

  const submitReportMutation = trpc.company.submitMonthlyReport.useMutation({
    onSuccess: () => {
      toast.success('Relatório enviado com sucesso!');
      setReportModalOpen(false);
      setReportForm({ rating: '', strengths: '', improvements: '', notes: '' });
      utils.company.getEmployeeDetails.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar relatório');
    },
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ClassicLoader />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'company') {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Funcionário não encontrado</CardTitle>
              <CardDescription>Este funcionário não existe ou você não tem acesso.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/employees">
                <Button>Voltar para Funcionários</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const contractTypeLabels: Record<string, string> = {
    estagio: 'Estágio',
    clt: 'CLT',
    'menor-aprendiz': 'Menor Aprendiz',
  };

  const ratingLabels: Record<string, string> = {
    excellent: 'Excelente',
    good: 'Bom',
    regular: 'Regular',
    needs_improvement: 'Precisa melhorar',
  };

  const ratingColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    regular: 'bg-yellow-100 text-yellow-700',
    needs_improvement: 'bg-red-100 text-red-700',
  };

  const handleSubmitReport = () => {
    if (!reportForm.rating) {
      toast.error('Selecione uma avaliação');
      return;
    }

    const now = new Date();
    submitReportMutation.mutate({
      contractId: employee.id,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      rating: reportForm.rating as 'excellent' | 'good' | 'regular' | 'needs_improvement',
      strengths: reportForm.strengths || undefined,
      improvements: reportForm.improvements || undefined,
      notes: reportForm.notes || undefined,
    });
  };

  // Calculate age from birth_date
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(employee.candidate?.birth_date);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button + Header */}
        <div className="flex items-center gap-4">
          <Link href="/company/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.candidate?.full_name}</h1>
            <p className="text-gray-500">{employee.job?.title}</p>
          </div>
        </div>

        {/* Section 1: Candidate Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Perfil do Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <Label className="text-gray-500 text-sm">Nome Completo</Label>
                  <p className="font-medium">{employee.candidate?.full_name || '-'}</p>
                </div>
              </div>
              {age && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-gray-500 text-sm">Idade</Label>
                    <p className="font-medium">{age} anos</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <Label className="text-gray-500 text-sm">Cidade</Label>
                  <p className="font-medium">{employee.candidate?.city || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <Label className="text-gray-500 text-sm">Formação</Label>
                  <p className="font-medium">{employee.candidate?.education_level || '-'}</p>
                </div>
              </div>
              {employee.candidate?.skills && employee.candidate.skills.length > 0 && (
                <div className="col-span-full flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-gray-500 text-sm">Habilidades</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {employee.candidate.skills.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {employee.candidate?.experience && (
                <div className="col-span-full flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-gray-500 text-sm">Experiência</Label>
                    <p className="font-medium">{employee.candidate.experience}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Detalhes do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="text-gray-500 text-sm">Cargo</Label>
                <p className="font-medium">{employee.job?.title || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Tipo de Contrato</Label>
                <p className="font-medium">{contractTypeLabels[employee.job?.contract_type] || employee.job?.contract_type || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Status</Label>
                <Badge className={employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {employee.status === 'active' ? 'Ativo' : 'Encerrado'}
                </Badge>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Data de Início</Label>
                <p className="font-medium">
                  {employee.start_date ? format(new Date(employee.start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Data de Término</Label>
                <p className="font-medium">
                  {employee.end_date ? format(new Date(employee.end_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Indeterminado'}
                </p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Salário Mensal</Label>
                <p className="font-medium">
                  {employee.monthly_salary
                    ? `R$ ${employee.monthly_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Signed Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employee.contract_document_url ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Contrato de Trabalho</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={employee.contract_document_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum documento disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Monthly Reports History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Relatórios Mensais
            </CardTitle>
            {employee.status === 'active' && (
              <Button onClick={() => setReportModalOpen(true)}>
                Novo Relatório
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {employee.feedback && employee.feedback.length > 0 ? (
              <div className="space-y-3">
                {employee.feedback.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{report.period_month}/{report.period_year}</p>
                      <p className="text-sm text-gray-500">
                        Enviado em {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={ratingColors[report.rating] || 'bg-gray-100'}>
                      {ratingLabels[report.rating] || report.rating}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum relatório enviado</p>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Payment History for this Employee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex justify-center py-8">
                <ClassicLoader />
              </div>
            ) : paymentHistory && paymentHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.reference_month}/{payment.reference_year}
                      </TableCell>
                      <TableCell>
                        R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          payment.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : payment.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }>
                          {payment.status === 'paid' ? 'Pago' : payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum pagamento registrado</p>
            )}
          </CardContent>
        </Card>

        {/* Report Modal */}
        <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Relatório Mensal</DialogTitle>
              <DialogDescription>
                {employee.candidate?.full_name} - {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
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
