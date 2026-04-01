import { motion } from "framer-motion";
import { useState } from "react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  User,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  BarChart,
  Briefcase,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Shield,
  Mail,
  Phone,
  MapPin,
  Upload,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function StepFuncionarioAtivo() {
  const { selectedJob, selectedJobId, hiringProcesses } = useCompanyFunnel();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    rating: '',
    strengths: '',
    improvements: '',
    notes: '',
  });

  const utils = trpc.useUtils();

  const submitReportMutation = trpc.company.submitMonthlyReport.useMutation({
    onSuccess: () => {
      toast.success('Relatório enviado com sucesso!');
      setReportModalOpen(false);
      setReportForm({ rating: '', strengths: '', improvements: '', notes: '' });
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar relatório');
    },
  });

  const handleOpenReport = (employee: any) => {
    setSelectedEmployee(employee);
    setReportModalOpen(true);
  };

  const handleSubmitReport = () => {
    if (!reportForm.rating) {
      toast.error('Selecione uma avaliação');
      return;
    }
    if (!selectedEmployee) return;

    const now = new Date();
    submitReportMutation.mutate({
      contractId: selectedEmployee.contract_id || selectedEmployee.id,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      rating: reportForm.rating as 'excellent' | 'good' | 'regular' | 'needs_improvement',
      strengths: reportForm.strengths || undefined,
      improvements: reportForm.improvements || undefined,
      notes: reportForm.notes || undefined,
    });
  };

  // Filter active employees for selected job
  const activeEmployees = hiringProcesses.filter(
    (hp: any) => hp.job?.id === selectedJobId && hp.status === "active"
  );

  if (!selectedJob) {
    return <EmptyState title="Nenhuma vaga selecionada" description="Selecione uma vaga" />;
  }

  if (activeEmployees.length === 0) {
    return (
      <CardEntrance>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhum funcionário ativo</h3>
          <p className="text-slate-600 max-w-sm">
            Após as assinaturas, os funcionários aparecerão aqui
          </p>
        </div>
      </CardEntrance>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <CardEntrance>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0A2342]">
                Funcionários Ativos
              </h2>
              <p className="text-slate-500 text-sm">
                <span className="text-[#0A2342] font-medium">
                  {activeEmployees.length}
                </span>{" "}
                funcionário{activeEmployees.length !== 1 ? "s" : ""} em{" "}
                <span className="font-medium text-[#0A2342]">
                  {selectedJob.title}
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Employees list */}
      <div className="space-y-2">
        {activeEmployees.map((employee: any, index: number) => (
          <CardEntrance key={employee.id} delay={index * 0.05}>
            <EmployeeCard employee={employee} onOpenReport={handleOpenReport} />
          </CardEntrance>
        ))}
      </div>

      {/* Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Relatório Mensal</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.candidate?.full_name} - {format(new Date(), "MMMM/yyyy", { locale: ptBR })}
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
  );
}

function EmployeeCard({ employee, onOpenReport }: { employee: any; onOpenReport: (emp: any) => void }) {
  const [showDetails, setShowDetails] = useState(false);

  // Fetch signed documents for this hiring process
  const { data: signedDocsData } = (trpc.contract.getDocumentsToSign as any).useQuery(
    { category: employee.hiring_type === "menor-aprendiz" ? "menor_aprendiz" : employee.hiring_type, hiringProcessId: employee.id },
    { enabled: !!employee.id }
  );
  const signedDocs = signedDocsData?.templates?.filter((t: any) => t.isSigned) || [];

  const uploadContractMutation = trpc.company.uploadEmployeeContract.useMutation({
    onSuccess: () => {
      toast.success('Contrato enviado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar contrato');
    },
  });
  const candidate = employee.candidate;
  const isEstagio = employee.hiring_type === "estagio";
  const startDate = employee.start_date ? new Date(employee.start_date) : null;
  const endDate = employee.end_date ? new Date(employee.end_date) : startDate ? addMonths(startDate, 12) : null;

  const daysUntilExpiry = endDate ? differenceInDays(endDate, new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  const hiringLabel = isEstagio
    ? "Estágio"
    : employee.hiring_type === "clt"
    ? "CLT"
    : employee.hiring_type === "pj"
    ? "PJ"
    : employee.hiring_type === "menor_aprendiz" || employee.hiring_type === "menor-aprendiz"
    ? "Jovem Aprendiz"
    : employee.hiring_type;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Expiry warning */}
      {isEstagio && isExpiringSoon && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">
            Contrato expira em {daysUntilExpiry} dias
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white z-10" />
              <div className="w-12 h-12 rounded-full bg-[#0A2342] flex items-center justify-center">
                {candidate?.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={candidate.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-lg">
                    {candidate?.full_name?.charAt(0) || "?"}
                  </span>
                )}
              </div>
            </div>

            {/* Name + badge */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[#0A2342] font-semibold">
                  {candidate?.full_name || "Funcionário"}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isEstagio
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {hiringLabel}
                </span>
              </div>

              {/* Start date */}
              {startDate && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Início <span className="font-medium text-[#0A2342]">{format(startDate, "dd/MM/yyyy")}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Report button */}
          <button
            onClick={() => onOpenReport(employee)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A2342] text-white text-sm font-medium hover:bg-[#1B4D7A] transition-colors"
          >
            <BarChart className="w-4 h-4" />
            Relatório Mensal
          </button>
        </div>
      </div>

      {/* Contract details toggle */}
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-slate-500 hover:text-[#0A2342] font-medium transition-colors flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Ver Detalhes do Contrato
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">Tipo de Contrato</p>
                <p className="text-sm font-semibold text-[#0A2342]">{hiringLabel}</p>
              </div>
              {employee.monthly_fee != null && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Taxa Mensal</p>
                  <p className="text-sm font-semibold text-[#0A2342]">R$ {(employee.monthly_fee / 100).toFixed(2)}</p>
                </div>
              )}
              {employee.payment_day && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Dia de Pagamento</p>
                  <p className="text-sm font-semibold text-[#0A2342]">Dia {employee.payment_day}</p>
                </div>
              )}
              {employee.duration_months && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Duração</p>
                  <p className="text-sm font-semibold text-[#0A2342]">{employee.duration_months} meses</p>
                </div>
              )}
              {isEstagio && endDate && (
                <div className={`p-3 rounded-lg border ${
                  isExpiringSoon ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"
                }`}>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Término</p>
                  <p className={`text-sm font-semibold ${isExpiringSoon ? "text-amber-600" : "text-[#0A2342]"}`}>
                    {format(endDate, "dd/MM/yyyy")}
                  </p>
                </div>
              )}
            </div>

            {/* Contact info */}
            {candidate && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Contato do Funcionário</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {candidate.email && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {candidate.email}
                    </span>
                  )}
                  {candidate.phone && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {candidate.phone}
                    </span>
                  )}
                  {candidate.city && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {candidate.city}{candidate.state ? `, ${candidate.state}` : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Insurance for estágio */}
            {isEstagio && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Shield className="w-3 h-3" /> Seguro Estágio</p>
                <p className="text-sm font-semibold text-[#0A2342]">
                  {employee.insurance_status === "active" ? "Ativo" : employee.insurance_status === "expired" ? "Expirado" : "Pendente"}
                </p>
              </div>
            )}

            {/* Contract document upload */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-2"><FileText className="w-3 h-3" /> Documento do Contrato</p>
              {signedDocs.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {signedDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-2 py-1.5 rounded">
                      <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                      <span className="text-xs text-green-600 ml-auto flex-shrink-0">Assinado</span>
                    </div>
                  ))}
                </div>
              )}
              {employee.contract_document_url && (
                <a href={employee.contract_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Ver contrato
                </a>
              )}
              {!employee.contract_document_url && signedDocs.length === 0 ? (
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Contrato
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    disabled={uploadContractMutation.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        uploadContractMutation.mutate({
                          hiringProcessId: employee.id,
                          fileName: file.name,
                          fileData: base64,
                          contentType: file.type,
                        });
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">{title}</h3>
      <p className="text-slate-600 max-w-sm">{description}</p>
    </div>
  );
}
