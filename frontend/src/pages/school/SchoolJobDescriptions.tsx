// @ts-nocheck
/**
 * School Job Descriptions Page
 *
 * Shows all jobs for a specific company - full page view
 * Design matches company portal job cards for consistency
 */

import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  ArrowLeft,
  DollarSign,
  Clock,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Search,
  Pause,
  Loader2,
  Bot,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const jobStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
  open: { label: 'Aberta', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  pending_review: { label: 'Aguardando análise', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  searching: { label: 'Buscando candidatos', color: 'bg-blue-100 text-blue-800', icon: <Search className="h-3 w-3" /> },
  candidates_found: { label: 'Candidatos encontrados', color: 'bg-green-100 text-green-800', icon: <Users className="h-3 w-3" /> },
  in_selection: { label: 'Em processo seletivo', color: 'bg-purple-100 text-purple-800', icon: <Calendar className="h-3 w-3" /> },
  filled: { label: 'Vaga preenchida', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: 'Fechada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> },
  paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> },
};

// Component to show matched candidates for a job
function MatchedCandidatesList({ jobId }: { jobId: string }) {
  const { data, isLoading } = trpc.job.getMatchesForJob.useQuery(
    { jobId, minScore: 50 },
    { enabled: !!jobId }
  );

  if (isLoading) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Candidatos Compatíveis</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.matches || data.matches.length === 0) {
    return null; // Don't show anything if no matches
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-medium text-gray-700">
            Candidatos Compatíveis ({data.matches.length})
          </h4>
        </div>
        {data.pagination.totalMatches > data.matches.length && (
          <span className="text-xs text-gray-500">
            +{data.pagination.totalMatches - data.matches.length} mais
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.matches.map((match: any) => (
          <Card key={match.matchId} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {match.candidateName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {match.candidateName}
                  </p>
                  {/* Score badge */}
                  <Badge
                    variant="secondary"
                    className={`text-xs px-1.5 py-0 ${
                      match.compositeScore >= 80 ? 'bg-green-100 text-green-700' :
                      match.compositeScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {Math.round(match.compositeScore)}%
                  </Badge>
                </div>
                {/* Candidate profile info */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {match.candidateProfile?.city && (
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {match.candidateProfile.city}
                    </span>
                  )}
                  {match.candidateProfile?.educationLevel && (
                    <span className="text-xs text-gray-500">
                      • {match.candidateProfile.educationLevel}
                    </span>
                  )}
                </div>
                {/* Recommendation */}
                {match.recommendation && (
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                    {match.recommendation}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Component to show AI matching status for a job
function MatchingStatusCard({ jobId }: { jobId: string }) {
  const utils = trpc.useUtils();
  const { data: progress, isLoading } = trpc.job.getMatchingProgress.useQuery(
    { jobId },
    { refetchInterval: (data) => data?.status === 'running' ? 3000 : false }
  );

  const triggerMatchingMutation = trpc.job.triggerMatchingForSchool.useMutation({
    onSuccess: () => {
      utils.job.getMatchingProgress.invalidate({ jobId });
    },
  });

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700">Verificando status da busca...</span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Busca de candidatos pendente</p>
              <p className="text-xs text-gray-500">Clique para iniciar a busca de candidatos compatíveis</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => triggerMatchingMutation.mutate({ jobId })}
            disabled={triggerMatchingMutation.isPending}
          >
            <Search className="h-4 w-4 mr-1.5" />
            {triggerMatchingMutation.isPending ? 'Iniciando...' : 'Iniciar Busca'}
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
    not_started: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: <Bot className="h-5 w-5 text-gray-400" />,
      text: 'text-gray-700'
    },
    pending: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      text: 'text-yellow-700'
    },
    running: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
      text: 'text-blue-700'
    },
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <UserCheck className="h-5 w-5 text-green-500" />,
      text: 'text-green-700'
    },
    failed: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      text: 'text-red-700'
    }
  };

  const config = statusConfig[progress.status] || statusConfig.pending;

  return (
    <div className={`mt-4 p-4 ${config.bg} rounded-lg border ${config.border}`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-medium ${config.text}`}>
              {progress.status === 'pending' && 'Aguardando início da busca'}
              {progress.status === 'not_started' && 'Busca de candidatos pendente'}
              {progress.status === 'running' && 'IA buscando candidatos...'}
              {progress.status === 'completed' && `Busca concluída - ${progress.matchesFound} candidatos encontrados`}
              {progress.status === 'failed' && 'Erro na busca de candidatos'}
            </p>
            {progress.status === 'running' && (
              <span className="text-xs text-blue-600">{progress.percentComplete}%</span>
            )}
          </div>

          {progress.status === 'running' && (
            <Progress value={progress.percentComplete} className="h-1.5 mt-2" />
          )}

          {progress.status === 'completed' && progress.matchesFound > 0 && (
            <p className="text-xs text-green-600 mt-1">
              {progress.matchesFound} candidatos compatíveis identificados pela IA
            </p>
          )}

          {progress.status === 'completed' && progress.matchesFound === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Nenhum candidato compatível encontrado no momento
            </p>
          )}

          {progress.errorMessage && (
            <p className="text-xs text-red-600 mt-1">{progress.errorMessage}</p>
          )}

          {(progress.status === 'completed' || progress.status === 'failed' || progress.status === 'not_started') && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => triggerMatchingMutation.mutate({ jobId })}
              disabled={triggerMatchingMutation.isPending}
            >
              <Search className="h-4 w-4 mr-1.5" />
              {triggerMatchingMutation.isPending ? 'Iniciando...' : 'Buscar novamente'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchoolJobDescriptions() {
  const [, params] = useRoute('/school/job-descriptions/:companyId');
  const [, setLocation] = useLocation();
  const companyId = params?.companyId;

  // Get jobs for this company
  const { data: jobs, isLoading: jobsLoading } = trpc.job.getByCompanyId.useQuery(
    { companyId: companyId || '' },
    { enabled: !!companyId }
  );

  // Get company name from the first job (if available)
  const companyName = jobs?.[0]?.company?.company_name || 'Empresa';

  const contractTypeLabels: Record<string, string> = {
    estagio: 'Estágio',
    clt: 'CLT',
    'menor-aprendiz': 'Jovem Aprendiz',
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/companies')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Descrições de Vagas
          </h1>
          <p className="text-gray-500 mt-1">{companyName}</p>
        </div>

        {/* Jobs List */}
        <div className="space-y-6">
          {jobsLoading ? (
            // Skeleton loading cards - matches company portal style
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

                      {/* Requirements skeleton */}
                      <div className="mb-4">
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>

                    {/* Footer section skeleton */}
                    <div className="border-t bg-gray-50/50 p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : jobs && jobs.length > 0 ? (
            jobs.map((job: any) => {
              const statusConfig = jobStatusConfig[job.status] || jobStatusConfig.open;

              return (
                <div key={job.id} className="space-y-4">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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

                      {/* Info Grid - Same style as company portal */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <DollarSign className="h-3 w-3" />
                            Salário
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {job.salary_min || job.salary_max || job.salary ? (
                              <>
                                {job.salary_min && `R$ ${job.salary_min.toLocaleString('pt-BR')}`}
                                {job.salary_min && job.salary_max && ' - '}
                                {job.salary_max && `R$ ${job.salary_max.toLocaleString('pt-BR')}`}
                                {!job.salary_min && !job.salary_max && job.salary &&
                                  `R$ ${(job.salary / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                }
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

                      {/* Description */}
                      {job.description && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrição</h4>
                          <p className="text-gray-700 text-sm">{job.description}</p>
                        </div>
                      )}

                      {/* Requirements */}
                      {(job.requirements || job.specific_requirements) && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requisitos</h4>
                          <p className="text-gray-700 text-sm">{job.requirements || job.specific_requirements}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Section - Additional Info */}
                    <div className="border-t bg-gray-50/50 p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {job.location && (
                          <div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <MapPin className="h-3 w-3" />
                              Local
                            </div>
                            <p className="text-gray-900 font-medium text-sm">{job.location}</p>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Users className="h-3 w-3" />
                            Vagas disponíveis
                          </div>
                          <p className="text-gray-900 font-medium text-sm">{job.openings || 1}</p>
                        </div>
                        {job.work_type && (
                          <div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <Briefcase className="h-3 w-3" />
                              Modalidade
                            </div>
                            <p className="text-gray-900 font-medium text-sm capitalize">
                              {job.work_type === 'presencial' ? 'Presencial' :
                               job.work_type === 'remoto' ? 'Remoto' :
                               job.work_type === 'hibrido' ? 'Híbrido' : job.work_type}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Matching Status & Candidates - Outside the job card */}
                <MatchingStatusCard jobId={job.id} />
                <MatchedCandidatesList jobId={job.id} />
              </div>
              );
            })
          ) : (
            // Wireframe/sketch style empty state - matches company portal
            <div className="relative">
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

                {/* Footer Section - wireframe style */}
                <div className="border-t border-dashed border-gray-300 bg-white/30 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                      <div key={i}>
                        <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
                        <div className="h-4 w-20 bg-gray-300 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overlay with message */}
              <div className="absolute inset-0 bg-gray-400/30 flex items-center justify-center rounded-xl">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma vaga cadastrada
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Esta empresa ainda não cadastrou nenhuma vaga
                  </p>
                  <Button variant="outline" onClick={() => setLocation('/companies')}>
                    Voltar para Empresas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
