// @ts-nocheck
/**
 * Agency Job Descriptions Page
 *
 * Shows all jobs for a specific company - full page view
 * Design matches company portal job cards for consistency
 */

import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import ContentTransition from '@/components/ui/ContentTransition';
import { SearchBarSkeleton, ListSkeleton } from '@/components/ui/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkSchedulePicker } from '@/components/ui/WorkSchedulePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  GraduationCap,
  Star,
  AlertTriangle,
  ThumbsUp,
  SlidersHorizontal,
  UserPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

// Score color helper
function getScoreColor(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

// Score bar for match factors
function FactorBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// Recommendation label in Portuguese
function getRecommendationLabel(rec: string | null) {
  const map: Record<string, { label: string; className: string }> = {
    HIGHLY_RECOMMENDED: { label: 'Altamente Recomendado', className: 'bg-green-100 text-green-800' },
    RECOMMENDED: { label: 'Recomendado', className: 'bg-blue-100 text-blue-800' },
    CONSIDER: { label: 'Considerar', className: 'bg-yellow-100 text-yellow-800' },
    NOT_RECOMMENDED: { label: 'Avaliar', className: 'bg-gray-100 text-gray-600' },
  };
  if (!rec) return null;
  return map[rec] || { label: rec, className: 'bg-gray-100 text-gray-600' };
}

// Application status labels (Portuguese)
const applicationStatusConfig: Record<string, { label: string; color: string }> = {
  applied: { label: 'Candidatou-se', color: 'bg-blue-100 text-blue-800' },
  screening: { label: 'Em análise', color: 'bg-yellow-100 text-yellow-800' },
  'interview-scheduled': { label: 'Entrevista agendada', color: 'bg-purple-100 text-purple-800' },
  interviewed: { label: 'Entrevistado', color: 'bg-indigo-100 text-indigo-800' },
  selected: { label: 'Selecionado', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Não selecionado', color: 'bg-red-100 text-red-800' },
  withdrawn: { label: 'Desistiu', color: 'bg-gray-100 text-gray-800' },
};

// Component to show direct applicants for a job
function DirectApplicantsList({ jobId }: { jobId: string }) {
  const utils = trpc.useUtils();
  const { data: applications, isLoading } = trpc.application.getByJob.useQuery(
    { jobId },
    { enabled: !!jobId }
  );
  const updateStatusMutation = trpc.application.updateStatus.useMutation({
    onSuccess: () => {
      utils.application.getByJob.invalidate({ jobId });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card className="mt-3">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-700">Candidatos que se Candidataram</h4>
          </div>
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) return null;

  return (
    <Card className="mt-3">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-blue-500" />
          <h4 className="text-sm font-medium text-gray-700">
            Candidatos que se Candidataram ({applications.length})
          </h4>
        </div>
        <div className="space-y-2">
          {applications.map((app: any) => {
            const candidate = app.candidates;
            const statusCfg = applicationStatusConfig[app.status] || { label: app.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {candidate?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{candidate?.full_name || 'Candidato'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {candidate?.city && <span>{candidate.city}</span>}
                      {app.applied_at && (
                        <span>
                          {format(new Date(app.applied_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Select
                  value={app.status}
                  onValueChange={(value) => {
                    updateStatusMutation.mutate({ id: app.id, status: value as any });
                  }}
                >
                  <SelectTrigger className="w-[160px] h-7 text-xs">
                    <SelectValue>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(applicationStatusConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Component to show matched candidates for a job
function MatchedCandidatesList({ jobId }: { jobId: string }) {
  const [minScore, setMinScore] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = trpc.job.getMatchesForJob.useQuery(
    { jobId, minScore: 0, limit: 100 },
    { enabled: !!jobId }
  );

  const createBatchMutation = trpc.batch.createDraftBatch.useMutation({
    onSuccess: () => {
      toast.success(`Grupo criado com ${selectedIds.size} candidato(s)!`);
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar grupo');
    },
  });

  const toggleSelection = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (selectedIds.size === 0) return;
    createBatchMutation.mutate({
      jobId,
      candidateIds: Array.from(selectedIds),
    });
  };

  if (isLoading) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Candidatos Compatíveis</h4>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.matches || data.matches.length === 0) {
    return null;
  }

  // Filter by min score on the client
  const filteredMatches = data.matches.filter((m: any) => m.compositeScore >= minScore);
  const displayedMatches = showAll ? filteredMatches : filteredMatches.slice(0, 10);

  return (
    <div className="mt-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-medium text-gray-700">
            Candidatos Compatíveis ({filteredMatches.length})
          </h4>
        </div>
      </div>

      {/* Score filter */}
      {data.matches.length > 5 && (
        <Card className="p-3 mb-3">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Score mínimo</span>
                <span className="font-medium">{minScore}%</span>
              </div>
              <Slider
                value={[minScore]}
                onValueChange={(v) => setMinScore(v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {filteredMatches.length}/{data.matches.length}
            </span>
          </div>
        </Card>
      )}

      {/* Candidate list */}
      <div className="space-y-2">
        {displayedMatches.map((match: any) => {
          const isExpanded = expandedId === match.matchId;
          const recLabel = getRecommendationLabel(match.recommendation);
          const skills = match.candidateProfile?.skills || [];
          const displaySkills = skills.slice(0, 4);
          const moreSkills = skills.length - displaySkills.length;

          return (
            <Card
              key={match.matchId}
              className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md ring-1 ring-blue-200' : 'hover:shadow-sm'}`}
            >
              {/* Main row - clickable */}
              <div className="w-full p-4 text-left flex items-center gap-3">
                {/* Checkbox */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(match.candidateId)}
                    onCheckedChange={() => toggleSelection(match.candidateId)}
                    className="h-4.5 w-4.5"
                  />
                </div>

                {/* Avatar */}
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : match.matchId)}
                >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
                  {match.candidateName?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {match.candidateName}
                    </p>
                    {match.applied && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                        <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                        Candidatou-se
                      </Badge>
                    )}
                    {recLabel && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${recLabel.className}`}>
                        {recLabel.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {match.candidateProfile?.city && (
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {match.candidateProfile.city}{match.candidateProfile.state ? `, ${match.candidateProfile.state}` : ''}
                      </span>
                    )}
                    {match.candidateProfile?.educationLevel && (
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <GraduationCap className="h-3 w-3" />
                        {match.candidateProfile.educationLevel}
                      </span>
                    )}
                  </div>
                  {/* Skills preview */}
                  {displaySkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {displaySkills.map((skill: string) => (
                        <span key={skill} className="px-1.5 py-0 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-100">
                          {skill}
                        </span>
                      ))}
                      {moreSkills > 0 && (
                        <span className="text-[10px] text-gray-400">+{moreSkills}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Score badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={`text-sm font-semibold px-2.5 py-0.5 border ${getScoreColor(match.compositeScore)}`}
                  >
                    {Math.round(match.compositeScore)}%
                  </Badge>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                  }
                </div>
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t bg-gray-50/50 px-4 py-4 space-y-4">
                  {/* Contact info */}
                  <div className="flex flex-wrap gap-4">
                    {match.candidateEmail && (
                      <a href={`mailto:${match.candidateEmail}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {match.candidateEmail}
                      </a>
                    )}
                    {match.candidatePhone && (
                      <a href={`tel:${match.candidatePhone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {match.candidatePhone}
                      </a>
                    )}
                  </div>

                  {/* Summary */}
                  {match.candidateProfile?.summary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Resumo</p>
                      <p className="text-sm text-gray-700">{match.candidateProfile.summary}</p>
                    </div>
                  )}

                  {/* AI Explanation */}
                  {match.explanationSummary && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" />
                        Análise IA
                      </p>
                      <p className="text-sm text-blue-900">{match.explanationSummary}</p>
                    </div>
                  )}

                  {/* LLM Reasoning */}
                  {match.llm?.reasoning && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-800 mb-1">Raciocínio Detalhado</p>
                      <p className="text-sm text-purple-900">{match.llm.reasoning}</p>
                      {match.llm.confidence && (
                        <p className="text-xs text-purple-600 mt-1">Confiança: {Math.round(match.llm.confidence)}%</p>
                      )}
                    </div>
                  )}

                  {/* Strengths & Concerns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {match.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> Pontos Fortes
                        </p>
                        <ul className="space-y-0.5">
                          {match.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                              <span className="text-green-500 mt-0.5">+</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {match.concerns?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Pontos de Atenção
                        </p>
                        <ul className="space-y-0.5">
                          {match.concerns.map((c: string, i: number) => (
                            <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                              <span className="text-amber-500 mt-0.5">!</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Match factors */}
                  {match.matchFactors && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Fatores de Compatibilidade</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <FactorBar label="Skills" value={match.matchFactors.skills} />
                        <FactorBar label="Experiência" value={match.matchFactors.experience} />
                        <FactorBar label="Localização" value={match.matchFactors.location} />
                        <FactorBar label="Educação" value={match.matchFactors.education} />
                        <FactorBar label="Contrato" value={match.matchFactors.contract} />
                        <FactorBar label="Personalidade" value={match.matchFactors.personality} />
                        <FactorBar label="Histórico" value={match.matchFactors.history} />
                        <FactorBar label="Bidirecional" value={match.matchFactors.bidirectional} />
                      </div>
                    </div>
                  )}

                  {/* All skills */}
                  {skills.length > 4 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Todas as Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {skills.map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded border border-blue-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Show more button */}
      {!showAll && filteredMatches.length > 10 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={() => setShowAll(true)}
        >
          Ver todos os {filteredMatches.length} candidatos
        </Button>
      )}
      {showAll && filteredMatches.length > 10 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-gray-500"
          onClick={() => setShowAll(false)}
        >
          Mostrar menos
        </Button>
      )}

      {/* Floating selection action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 mt-4 z-10">
          <div className="bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">
                {selectedIds.size} candidato{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCreateGroup}
                disabled={createBatchMutation.isPending}
              >
                {createBatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1.5" />
                )}
                Adicionar ao Grupo
              </Button>
            </div>
          </div>
        </div>
      )}
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

  const triggerMatchingMutation = trpc.job.triggerMatchingForAgency.useMutation({
    onSuccess: () => {
      utils.job.getMatchingProgress.invalidate({ jobId });
      utils.job.getMatchesForJob.invalidate({ jobId });
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

export default function AgencyJobDescriptions() {
  const [, params] = useRoute('/agency/job-descriptions/:companyId');
  const [, setLocation] = useLocation();
  const companyId = params?.companyId;

  // Create job dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contract_type: '',
    work_type: 'presencial',
    work_schedule: '',
    salary: '',
    description: '',
    requirements: '',
    openings: '1',
  });

  // Edit job dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    contract_type: '',
    work_type: 'presencial',
    work_schedule: '',
    salary: '',
    description: '',
    requirements: '',
    openings: '1',
  });

  // Delete confirmation state
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<any>(null);

  const utils = trpc.useUtils();

  // Get jobs for this company
  const { data: jobs, isLoading: jobsLoading } = trpc.job.getByCompanyId.useQuery(
    { companyId: companyId || '' },
    { enabled: !!companyId }
  );

  // Create job mutation
  const createJobMutation = trpc.job.createForCompany.useMutation({
    onSuccess: () => {
      toast.success('Vaga criada com sucesso!');
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        contract_type: '',
        work_type: 'presencial',
        work_schedule: '',
        salary: '',
        description: '',
        requirements: '',
        openings: '1',
      });
      utils.job.getByCompanyId.invalidate({ companyId: companyId || '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar vaga');
    },
  });

  const handleCreateJob = () => {
    if (!formData.title || !formData.contract_type || !formData.description) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    createJobMutation.mutate({
      companyId: companyId || '',
      title: formData.title,
      description: formData.description,
      contractType: formData.contract_type as 'estagio' | 'clt' | 'menor-aprendiz' | 'pj',
      workType: formData.work_type as 'presencial' | 'remoto' | 'hibrido',
      workSchedule: formData.work_schedule || undefined,
      salaryMin: formData.salary ? parseFloat(formData.salary) : undefined,
      salaryMax: formData.salary ? parseFloat(formData.salary) : undefined,
      requirements: formData.requirements || undefined,
      openings: formData.openings ? parseInt(formData.openings) : 1,
    });
  };

  // Edit job mutation
  const updateJobMutation = trpc.job.updateForCompany.useMutation({
    onSuccess: () => {
      toast.success('Vaga atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingJob(null);
      utils.job.getByCompanyId.invalidate({ companyId: companyId || '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar vaga');
    },
  });

  // Delete job mutation
  const deleteJobMutation = trpc.job.deleteForCompany.useMutation({
    onSuccess: () => {
      toast.success('Vaga excluída com sucesso!');
      setDeleteConfirmJob(null);
      utils.job.getByCompanyId.invalidate({ companyId: companyId || '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao excluir vaga');
    },
  });

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setEditFormData({
      title: job.title || '',
      contract_type: job.contract_type || '',
      work_type: job.work_type || 'presencial',
      work_schedule: job.work_schedule || '',
      salary: job.salary_min ? String(job.salary_min) : '',
      description: job.description || '',
      requirements: job.specific_requirements || job.requirements || '',
      openings: String(job.openings || 1),
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingJob || !editFormData.title || !editFormData.description) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    updateJobMutation.mutate({
      jobId: editingJob.id,
      title: editFormData.title,
      description: editFormData.description,
      contractType: editFormData.contract_type as 'estagio' | 'clt' | 'menor-aprendiz' | 'pj' || undefined,
      workType: editFormData.work_type as 'presencial' | 'remoto' | 'hibrido',
      workSchedule: editFormData.work_schedule || undefined,
      salaryMin: editFormData.salary ? parseFloat(editFormData.salary) : undefined,
      salaryMax: editFormData.salary ? parseFloat(editFormData.salary) : undefined,
      requirements: editFormData.requirements || undefined,
      openings: editFormData.openings ? parseInt(editFormData.openings) : 1,
    });
  };

  const handleDeleteJob = (job: any) => {
    setDeleteConfirmJob(job);
  };

  const confirmDelete = () => {
    if (deleteConfirmJob) {
      deleteJobMutation.mutate({ jobId: deleteConfirmJob.id });
    }
  };

  // Get company name from the first job (if available)
  const companyName = jobs?.[0]?.company?.company_name || 'Empresa';

  const contractTypeLabels: Record<string, string> = {
    estagio: 'Estágio',
    clt: 'CLT',
    'menor-aprendiz': 'Menor Aprendiz',
    pj: 'PJ',
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
          <Button
            className="mt-4"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </div>

        {/* Create Job Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Vaga</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da vaga para {companyName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
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
                      <SelectItem value="pj">PJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="work_type">Modalidade</Label>
                  <Select
                    value={formData.work_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, work_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salary">Salario (R$)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="1500"
                    value={formData.salary}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="openings">Numero de vagas</Label>
                  <Input
                    id="openings"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.openings}
                    onChange={(e) => setFormData(prev => ({ ...prev, openings: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="work_schedule">Horario de trabalho</Label>
                <WorkSchedulePicker
                  value={formData.work_schedule}
                  onChange={(value) => setFormData(prev => ({ ...prev, work_schedule: value }))}
                />
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateJob} disabled={createJobMutation.isPending}>
                {createJobMutation.isPending ? 'Criando...' : 'Criar Vaga'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Jobs List */}
        <ContentTransition
          isLoading={jobsLoading}
          skeleton={<><SearchBarSkeleton /><ListSkeleton count={5} /></>}
        >
        <div className="space-y-6">
          {jobs && jobs.length > 0 ? (
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
                        <div className="flex items-center gap-2">
                          <Badge className={statusConfig.color}>
                            <span className="flex items-center gap-1">
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditJob(job)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteJob(job)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Info Grid - Same style as company portal */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <DollarSign className="h-3 w-3" />
                            Salário
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {job.salary_min || job.salary ? (
                              job.salary_min
                                ? `R$ ${job.salary_min.toLocaleString('pt-BR')}`
                                : `R$ ${(job.salary / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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

                {/* Direct applicants */}
                <DirectApplicantsList jobId={job.id} />

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
        </ContentTransition>

        {/* Edit Job Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Vaga</DialogTitle>
              <DialogDescription>
                Altere os detalhes da vaga para {companyName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Título da vaga *</Label>
                <Input
                  id="edit-title"
                  placeholder="Ex: Auxiliar Administrativo"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-contract_type">Tipo de contrato *</Label>
                  <Select
                    value={editFormData.contract_type}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, contract_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estagio">Estágio</SelectItem>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="menor-aprendiz">Menor Aprendiz</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-work_type">Modalidade</Label>
                  <Select
                    value={editFormData.work_type}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, work_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-salary">Salário (R$)</Label>
                  <Input
                    id="edit-salary"
                    type="number"
                    placeholder="1500"
                    value={editFormData.salary}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, salary: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-openings">Número de vagas</Label>
                  <Input
                    id="edit-openings"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={editFormData.openings}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, openings: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-work_schedule">Horário de trabalho</Label>
                <WorkSchedulePicker
                  value={editFormData.work_schedule}
                  onChange={(value) => setEditFormData(prev => ({ ...prev, work_schedule: value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descrição das atividades *</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Descreva as principais atividades e responsabilidades..."
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-requirements">Requisitos</Label>
                <Textarea
                  id="edit-requirements"
                  placeholder="Descreva os requisitos necessários..."
                  rows={3}
                  value={editFormData.requirements}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, requirements: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateJobMutation.isPending}>
                {updateJobMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmJob} onOpenChange={(open) => !open && setDeleteConfirmJob(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Excluir Vaga</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a vaga "{deleteConfirmJob?.title}"? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmJob(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteJobMutation.isPending}
              >
                {deleteJobMutation.isPending ? 'Excluindo...' : 'Excluir Vaga'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
