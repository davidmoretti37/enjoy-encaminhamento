import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Plus,
  Calendar,
  Search,
  CheckCircle,
  Clock,
  Pause,
  Users,
  Play,
  DollarSign,
  MapPin,
  ChevronDown,
  ChevronUp,
  Building2,
  FileText
} from "lucide-react";
import JobProgressBar, { statusToStep } from "@/components/JobProgressBar";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const jobStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Aguardando análise', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  searching: { label: 'Buscando candidatos', color: 'bg-blue-100 text-blue-800', icon: <Search className="h-3 w-3" /> },
  candidates_found: { label: 'Candidatos encontrados', color: 'bg-green-100 text-green-800', icon: <Users className="h-3 w-3" /> },
  in_selection: { label: 'Em processo seletivo', color: 'bg-purple-100 text-purple-800', icon: <Calendar className="h-3 w-3" /> },
  filled: { label: 'Vaga preenchida', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> },
};

export default function CompanyJobs() {
  const { user, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contract_type: '',
    salary_min: '',
    salary_max: '',
    description: '',
    requirements: '',
    work_schedule: '',
  });

  const utils = trpc.useUtils();
  const { data: jobs, isLoading } = trpc.company.getJobs.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: companyProfile } = trpc.company.getProfile.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const createJobMutation = trpc.company.createJobRequest.useMutation({
    onSuccess: () => {
      toast.success('Vaga solicitada com sucesso!');
      setIsModalOpen(false);
      setFormData({
        title: '',
        contract_type: '',
        salary_min: '',
        salary_max: '',
        description: '',
        requirements: '',
        work_schedule: '',
      });
      utils.company.getJobs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao solicitar vaga');
    },
  });

  const pauseJobMutation = trpc.company.pauseJob.useMutation({
    onSuccess: () => {
      toast.success('Vaga pausada');
      utils.company.getJobs.invalidate();
    },
  });

  const resumeJobMutation = trpc.company.resumeJob.useMutation({
    onSuccess: () => {
      toast.success('Busca retomada');
      utils.company.getJobs.invalidate();
    },
  });

  // TODO: triggerMatching endpoint not yet implemented
  // const triggerMatchingMutation = trpc.job.triggerMatching.useMutation({
  //   onSuccess: () => {
  //     toast.success('Busca de candidatos iniciada!');
  //     utils.company.getJobs.invalidate();
  //   },
  //   onError: (error: Error) => {
  //     toast.error('Erro ao iniciar busca: ' + error.message);
  //   },
  // });

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

  const handleSubmit = () => {
    if (!formData.title || !formData.contract_type || !formData.description) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    createJobMutation.mutate({
      title: formData.title,
      description: formData.description,
      contract_type: formData.contract_type as 'estagio' | 'clt' | 'menor-aprendiz',
      salary_min: formData.salary_min ? parseFloat(formData.salary_min) : undefined,
      salary_max: formData.salary_max ? parseFloat(formData.salary_max) : undefined,
      work_schedule: formData.work_schedule || undefined,
      requirements: formData.requirements || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered like Dashboard */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Vagas</h1>
          <p className="text-gray-500 mt-1">Gerencie suas solicitações de vagas</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Solicitar Nova Vaga</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da vaga que você precisa. Nossa equipe irá analisar e buscar os melhores candidatos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título da vaga *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Auxiliar Administrativo"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contract_type">Tipo de contrato *</Label>
                    <Select
                      value={formData.contract_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estagio">Estágio</SelectItem>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="menor-aprendiz">Menor Aprendiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="work_schedule">Horário de trabalho</Label>
                    <Input
                      id="work_schedule"
                      placeholder="Ex: 08:00 às 14:00"
                      value={formData.work_schedule}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_schedule: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="salary_min">Salário mínimo (R$)</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      placeholder="1200"
                      value={formData.salary_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, salary_min: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salary_max">Salário máximo (R$)</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      placeholder="1500"
                      value={formData.salary_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, salary_max: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição das atividades *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as principais atividades e responsabilidades..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="requirements">Requisitos</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Descreva os requisitos necessários..."
                    rows={3}
                    value={formData.requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? 'Enviando...' : 'Solicitar Vaga'}
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Jobs List */}
        <div className="space-y-6">
          {isLoading ? (
            // Skeleton loading cards
            <>
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 pb-4">
                      {/* Header skeleton */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <Skeleton className="h-6 w-48 mb-2" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-6 w-32" />
                      </div>

                      {/* Info grid skeleton */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="bg-gray-50 rounded-lg p-3">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        ))}
                      </div>

                      {/* Description skeleton */}
                      <div className="mb-4">
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>

                    {/* Progress section skeleton */}
                    <div className="border-t bg-gray-50/50 p-6">
                      <Skeleton className="h-3 w-40 mb-4" />
                      <div className="flex items-center justify-between">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="flex items-center flex-1 last:flex-none">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            {j < 4 && <Skeleton className="flex-1 h-1 mx-1" />}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-3">
                        {[1, 2, 3, 4].map((j) => (
                          <Skeleton key={j} className="h-3 w-16" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : jobs && jobs.length > 0 ? (
            jobs.map((job: any) => {
              const statusConfig = jobStatusConfig[job.status] || jobStatusConfig.pending_review;
              const presentation = job.presentation?.[0];
              const currentStep = statusToStep[job.status] || 1;

              return (
                <Card key={job.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Header Section */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">{job.title}</h3>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-medium">
                            {contractTypeLabels[job.contract_type] || job.contract_type}
                          </Badge>
                        </div>
                        <Badge className={statusConfig.color}>
                          <span className="flex items-center gap-1">
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </Badge>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <DollarSign className="h-3 w-3" />
                            Salário
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {job.salary_min || job.salary_max ? (
                              <>
                                {job.salary_min && `R$ ${job.salary_min.toLocaleString('pt-BR')}`}
                                {job.salary_min && job.salary_max && ' - '}
                                {job.salary_max && `R$ ${job.salary_max.toLocaleString('pt-BR')}`}
                              </>
                            ) : (
                              <span className="text-gray-400">A combinar</span>
                            )}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Clock className="h-3 w-3" />
                            Horário
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {job.work_schedule || <span className="text-gray-400">A definir</span>}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Calendar className="h-3 w-3" />
                            Criado em
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {job.created_at ? format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Description - parse embedded Requisitos/Observações */}
                      {job.description && (() => {
                        // Parse description that may contain embedded "Requisitos:" and "Observações:"
                        const descText = job.description;
                        const reqMatch = descText.match(/Requisitos:\s*([\s\S]+?)(?=Observações:|$)/);
                        const obsMatch = descText.match(/Observações:\s*([\s\S]+?)$/);
                        const mainDesc = descText.split(/Requisitos:/)[0].trim();
                        const embeddedReq = reqMatch ? reqMatch[1].trim() : null;
                        const embeddedObs = obsMatch ? obsMatch[1].trim() : null;

                        return (
                          <>
                            {mainDesc && (
                              <div className="mb-4">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrição</h4>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{mainDesc}</p>
                              </div>
                            )}
                            {(embeddedReq || job.requirements) && (
                              <div className="mb-4">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requisitos</h4>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{job.requirements || embeddedReq}</p>
                              </div>
                            )}
                            {embeddedObs && (
                              <div className="mb-4">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observações</h4>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{embeddedObs}</p>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Requirements - only if not already shown above */}
                      {job.requirements && !job.description?.includes('Requisitos:') && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requisitos</h4>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{job.requirements}</p>
                        </div>
                      )}

                      {/* Status Message */}
                      {job.status === 'candidates_found' && presentation?.scheduled_at && (
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                          <p className="text-sm text-green-700">
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Visita agendada: {format(new Date(presentation.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                      {job.status === 'searching' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-700">
                            <Search className="h-4 w-4 inline mr-1" />
                            Aguarde, estamos procurando os melhores perfis
                          </p>
                        </div>
                      )}
                      {job.status === 'pending_review' && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-700">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Nossa equipe está analisando sua solicitação
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Progress Section */}
                    <div className="border-t bg-gray-50/50 p-6">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Progresso do Recrutamento</h4>
                      <JobProgressBar currentStep={currentStep} compact />

                      {/* Company Summary Dropdown */}
                      {companyProfile?.summary && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setShowSummary(!showSummary)}
                            className="w-full flex items-center justify-between text-left hover:bg-gray-100 rounded-lg p-2 -mx-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700">Resumo da Empresa</span>
                              <span className="text-xs text-gray-400">• Gerado por IA</span>
                            </div>
                            {showSummary ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          {showSummary && (
                            <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {companyProfile.summary}
                              </p>
                              {companyProfile.summary_generated_at && (
                                <p className="text-xs text-gray-400 mt-3">
                                  Gerado em: {format(new Date(companyProfile.summary_generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        {job.status === 'searching' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pauseJobMutation.mutate({ jobId: job.id })}
                            disabled={pauseJobMutation.isPending}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar busca
                          </Button>
                        )}
                        {job.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resumeJobMutation.mutate({ jobId: job.id })}
                            disabled={resumeJobMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Retomar busca
                          </Button>
                        )}
                        {/* TODO: Manual matching trigger - endpoint not yet implemented */}
                        {/* {(job.status === 'pending_review' || job.status === 'paused') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => triggerMatchingMutation.mutate({ jobId: job.id })}
                            disabled={triggerMatchingMutation.isPending}
                          >
                            <Search className="h-4 w-4 mr-1" />
                            {triggerMatchingMutation.isPending ? 'Iniciando...' : 'Iniciar Busca'}
                          </Button>
                        )} */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // Wireframe/sketch style demo card
            <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
              {/* Wireframe demo card */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 overflow-hidden">
                <div className="p-6 pb-4">
                  {/* Header - placeholder bars */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                      <div className="h-5 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="h-6 w-32 bg-gray-200 rounded-full" />
                  </div>

                  {/* Info Grid - placeholder boxes with dashed borders */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-dashed border-gray-300 rounded-lg p-3 bg-white/50">
                        <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
                        <div className="h-4 w-20 bg-gray-300 rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Description placeholder */}
                  <div className="mb-4">
                    <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-full bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-4/5 bg-gray-200 rounded" />
                  </div>

                  {/* Requirements placeholder */}
                  <div className="mb-4">
                    <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-gray-200 rounded" />
                  </div>
                </div>

                {/* Progress Section - wireframe style */}
                <div className="border-t border-dashed border-gray-300 bg-white/30 p-6">
                  <div className="h-3 w-40 bg-gray-200 rounded mb-4" />
                  {/* Progress dots with dashed lines */}
                  <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-400 bg-white" />
                        {i < 4 && (
                          <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Step labels placeholder */}
                  <div className="flex justify-between mt-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-2 w-14 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtle overlay always visible, darkens on hover */}
              <div className="absolute inset-0 bg-gray-400/20 group-hover:bg-gray-900/50 transition-all duration-300 flex items-center justify-center rounded-xl">
                <Button className="opacity-60 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 hover:bg-gray-100 shadow-lg group-hover:shadow-xl group-hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Solicitar Vaga
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
