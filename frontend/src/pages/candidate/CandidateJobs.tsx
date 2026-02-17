// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  MapPin,
  Clock,
  DollarSign,
  Search,
  Briefcase,
  GraduationCap,
  Building2,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

// Format salary as Brazilian currency
const formatSalary = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function CandidateJobs() {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Job detail dialog
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDialog, setShowJobDialog] = useState(false);

  // Application dialog
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applying, setApplying] = useState(false);

  // Fetch open jobs for candidates (no company names)
  const jobsQuery = trpc.job.getOpenJobsForCandidates.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch candidate's existing applications to check if already applied
  const applicationsQuery = trpc.application.getByCandidate.useQuery(undefined, {
    enabled: !!user,
  });

  // Create application mutation
  const createApplication = trpc.application.create.useMutation({
    onSuccess: () => {
      toast.success("Candidatura enviada com sucesso!");
      setShowApplyDialog(false);
      setShowJobDialog(false);
      setApplicationMessage("");
      applicationsQuery.refetch();
    },
    onError: (error) => {
      // Handle duplicate application error with friendly message
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        toast.error("Você já se candidatou a esta vaga");
        applicationsQuery.refetch(); // Refresh to update UI
      } else {
        toast.error(error.message || "Erro ao enviar candidatura");
      }
    },
  });

  const isLoading = authLoading || jobsQuery.isLoading;
  const jobs = jobsQuery.data || [];
  const appliedJobIds = new Set((applicationsQuery.data || []).map((a: any) => a.job_id));

  // Get unique cities for filter
  const cities = [...new Set(jobs.map((j: any) => j.location).filter(Boolean))];

  // Filter jobs
  const filteredJobs = jobs.filter((job: any) => {
    const matchesSearch = !searchTerm ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesContract = contractFilter === "all" || job.contract_type === contractFilter;
    const matchesCity = cityFilter === "all" || job.location === cityFilter;

    return matchesSearch && matchesContract && matchesCity;
  });

  const handleViewJob = (job: any) => {
    setSelectedJob(job);
    setShowJobDialog(true);
  };

  const handleApply = (job: any) => {
    setSelectedJob(job);
    setShowApplyDialog(true);
  };

  const submitApplication = async () => {
    if (!selectedJob) return;

    console.log("[CandidateJobs] Selected job:", selectedJob);
    console.log("[CandidateJobs] Job ID:", selectedJob.id);

    setApplying(true);
    try {
      await createApplication.mutateAsync({
        job_id: selectedJob.id,
        cover_letter: applicationMessage || undefined,
      });
    } finally {
      setApplying(false);
    }
  };

  const formatContractType = (type: string) => {
    const types: Record<string, string> = {
      'clt': 'CLT',
      'estagio': 'Estágio',
      'menor-aprendiz': 'Menor Aprendiz',
      'pj': 'PJ',
    };
    return types[type] || type;
  };

  const formatWorkType = (type: string) => {
    const types: Record<string, string> = {
      'presencial': 'Presencial',
      'remoto': 'Remoto',
      'hibrido': 'Híbrido',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <ClassicLoader />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Vagas Disponíveis</h1>
          <p className="text-gray-500 mt-1">Encontre a oportunidade ideal para você</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vagas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="estagio">Estágio</SelectItem>
                  <SelectItem value="menor-aprendiz">Menor Aprendiz</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map((city: string) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
              <Briefcase className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma vaga encontrada</h3>
            <p className="text-gray-400 text-sm">Tente ajustar os filtros ou volte mais tarde</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job: any) => {
              const hasApplied = appliedJobIds.has(job.id);

              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="secondary">
                                {formatContractType(job.contract_type)}
                              </Badge>
                              {job.work_type && (
                                <Badge variant="outline">
                                  {formatWorkType(job.work_type)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                          )}
                          {job.salary && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatSalary(job.salary)}
                            </span>
                          )}
                          {job.hours_per_week && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.hours_per_week}h/semana
                            </span>
                          )}
                          {job.min_education_level && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-4 w-4" />
                              {job.min_education_level}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleViewJob(job)}>
                          Ver Mais
                        </Button>
                        {hasApplied ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-2">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Já candidatado
                          </Badge>
                        ) : (
                          <Button onClick={() => handleApply(job)}>
                            Candidatar-se
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Job Detail Dialog */}
        <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedJob && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedJob.title}</DialogTitle>
                  <DialogDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">
                        {formatContractType(selectedJob.contract_type)}
                      </Badge>
                      {selectedJob.work_type && (
                        <Badge variant="outline">
                          {formatWorkType(selectedJob.work_type)}
                        </Badge>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedJob.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.location}</span>
                      </div>
                    )}
                    {selectedJob.salary && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{formatSalary(selectedJob.salary)}</span>
                      </div>
                    )}
                    {selectedJob.hours_per_week && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.hours_per_week}h/semana</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedJob.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Descrição</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedJob.description}
                      </p>
                    </div>
                  )}

                  {/* Requirements */}
                  {selectedJob.specific_requirements && (
                    <div>
                      <h4 className="font-semibold mb-2">Requisitos</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedJob.specific_requirements}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Habilidades Requeridas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.required_skills.map((skill: string, i: number) => (
                          <Badge key={i} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Benefícios</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedJob.benefits.map((benefit: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowJobDialog(false)}>
                    Fechar
                  </Button>
                  {!appliedJobIds.has(selectedJob.id) && (
                    <Button onClick={() => {
                      setShowJobDialog(false);
                      handleApply(selectedJob);
                    }}>
                      Candidatar-se
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Apply Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent>
            {selectedJob && (
              <>
                <DialogHeader>
                  <DialogTitle>Confirmar Candidatura</DialogTitle>
                  <DialogDescription>
                    Você está se candidatando para: <strong>{selectedJob.title}</strong>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Mensagem (opcional)
                    </label>
                    <Textarea
                      placeholder="Escreva uma breve apresentação ou mensagem para o recrutador..."
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Ao confirmar, seu perfil será enviado para análise.
                      Você poderá acompanhar o status em "Minhas Candidaturas".
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submitApplication} disabled={applying}>
                    {applying ? (
                      <>
                        <ClassicLoader size="sm" className="mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Confirmar Candidatura'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
