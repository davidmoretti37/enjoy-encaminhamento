/**
 * Company Job Flow Component
 *
 * Shows all jobs for a selected company with AI matching and candidate management
 * Integrated from AgencyJobDescriptions.tsx
 */

import { useState, useCallback, useEffect, useMemo, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { useAgencyFunnel } from '@/contexts/AgencyFunnelContext';
import { trpc } from '@/lib/trpc';
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
import VerticalWorkflowStepper, { WorkflowStep } from '@/components/ui/VerticalWorkflowStepper';
import CandidateGroupManagement from './CandidateGroupManagement';
import { CompanyInterviewScheduleModal } from '@/components/CompanyInterviewScheduleModal';
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
  Upload,
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
  ArrowDown,
  Building2,
  User,
  Video,
  Send,
  Copy,
  Link,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  searching: { label: 'Buscando candidatos', color: 'bg-orange-100 text-orange-800', icon: <Search className="h-3 w-3" /> },
  candidates_found: { label: 'Candidatos encontrados', color: 'bg-green-100 text-green-800', icon: <Users className="h-3 w-3" /> },
  in_selection: { label: 'Em processo seletivo', color: 'bg-purple-100 text-purple-800', icon: <Calendar className="h-3 w-3" /> },
  filled: { label: 'Vaga preenchida', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: 'Fechada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> },
  paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> },
};

// Score color helper
function getScoreColor(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 60) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

// Score bar for match factors
function FactorBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-orange-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-400';
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
    RECOMMENDED: { label: 'Recomendado', className: 'bg-orange-100 text-orange-800' },
    CONSIDER: { label: 'Considerar', className: 'bg-yellow-100 text-yellow-800' },
    NOT_RECOMMENDED: { label: 'Avaliar', className: 'bg-gray-100 text-gray-600' },
  };
  if (!rec) return null;
  return map[rec] || { label: rec, className: 'bg-gray-100 text-gray-600' };
}

// Component to show matched candidates for a job
function AgencyCandidateEditForm({ candidateId, initial, onSaved }: {
  candidateId: string;
  initial: { full_name: string; email: string; phone: string; city: string; state: string; education_level: string; skills: string[] };
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [skillInput, setSkillInput] = useState('');
  const mutation = trpc.candidate.agencyUpdateCandidate.useMutation({
    onSuccess: () => { toast.success('Cadastro atualizado!'); onSaved(); },
    onError: (err) => toast.error(err.message || 'Erro ao salvar'),
  });

  return (
    <div className="bg-white rounded-lg border border-orange-200 p-4 space-y-3">
      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Editar Cadastro do Candidato</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Nome</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Estado</Label><Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Escolaridade</Label>
          <select value={form.education_level} onChange={e => setForm({...form, education_level: e.target.value})} className="w-full h-8 text-sm border rounded px-2">
            <option value="">-</option>
            <option value="fundamental">Fundamental</option>
            <option value="medio">Médio</option>
            <option value="superior">Superior</option>
            <option value="pos-graduacao">Pós-graduação</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Habilidades</Label>
        <div className="flex flex-wrap gap-1 mb-1">
          {form.skills.map((s, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded border border-orange-100 flex items-center gap-1">
              {s}
              <button onClick={() => setForm({...form, skills: form.skills.filter((_, j) => j !== i)})} className="text-orange-400 hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Adicionar habilidade" className="h-7 text-xs flex-1"
            onKeyDown={e => { if (e.key === 'Enter' && skillInput.trim()) { e.preventDefault(); setForm({...form, skills: [...form.skills, skillInput.trim()]}); setSkillInput(''); }}} />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (skillInput.trim()) { setForm({...form, skills: [...form.skills, skillInput.trim()]}); setSkillInput(''); }}}>+</Button>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onSaved} className="text-xs">Cancelar</Button>
        <Button size="sm" onClick={() => mutation.mutate({ candidateId, ...form })} disabled={mutation.isPending} className="text-xs bg-orange-600 hover:bg-orange-700 text-white">
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function MatchedCandidatesList({ jobId, onGroupCreated }: { jobId: string; onGroupCreated?: () => void }) {
  const [minScore, setMinScore] = useState(0);
  const [cityFilter, setCityFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [manualCandidates, setManualCandidates] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const utils = trpc.useUtils();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search candidates by name
  const { data: searchResults } = trpc.agency.searchCandidatesByName.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Check if a batch already exists for this job
  const { data: existingBatches } = trpc.batch.getBatchesByJobId.useQuery(
    { jobId },
    { enabled: !!jobId }
  );
  const hasExistingBatch = existingBatches && existingBatches.length > 0;

  const { data, isLoading } = trpc.job.getMatchesForJob.useQuery(
    { jobId, minScore: 0, limit: 100 },
    { enabled: !!jobId }
  );

  const createBatchMutation = trpc.batch.createDraftBatch.useMutation({
    onSuccess: () => {
      toast.success(`Grupo criado com ${selectedIds.size} candidato(s)!`);
      setSelectedIds(new Set());
      setManualCandidates([]);
      utils.batch.getBatchesByJobId.invalidate({ jobId });
      onGroupCreated?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar grupo');
    },
  });

  const addCandidatesMutation = trpc.batch.addCandidatesToBatch.useMutation({
    onSuccess: () => {
      toast.success(`${selectedIds.size} candidato(s) adicionado(s) ao grupo!`);
      setSelectedIds(new Set());
      setManualCandidates([]);
      utils.batch.getBatchesByJobId.invalidate({ jobId });
      onGroupCreated?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao adicionar candidatos');
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
    const candidateIds = Array.from(selectedIds);

    if (hasExistingBatch && existingBatches?.[0]?.id) {
      addCandidatesMutation.mutate({ batchId: existingBatches[0].id, candidateIds });
    } else {
      createBatchMutation.mutate({ jobId, candidateIds });
    }
  };

  const addManualCandidate = (candidate: any) => {
    // Don't add duplicates
    if (manualCandidates.some((c) => c.id === candidate.id)) return;
    setManualCandidates(prev => [...prev, candidate]);
    setSelectedIds(prev => new Set([...prev, candidate.id]));
    setSearchQuery('');
    setSearchFocused(false);
  };

  const removeManualCandidate = (candidateId: string) => {
    setManualCandidates(prev => prev.filter(c => c.id !== candidateId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });
  };

  const isMutating = createBatchMutation.isPending || addCandidatesMutation.isPending;

  // IDs already in AI matches or manually added
  const aiMatchedIds = new Set((data?.matches || []).map((m: any) => m.candidateId));
  const manualIds = new Set(manualCandidates.map((c) => c.id));

  // Filter search results to exclude already-added candidates
  const filteredSearchResults = (searchResults || []).filter(
    (r: any) => !aiMatchedIds.has(r.id) && !manualIds.has(r.id)
  );

  if (isLoading) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Candidatos Compatíveis</h4>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter by min score and city on the client
  const matches = data?.matches || [];
  const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const titleCase = (s: string) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();
  const cityMap = new Map<string, string>();
  for (const m of matches) {
    const raw = m.candidateProfile?.city;
    if (!raw) continue;
    const key = normalize(raw);
    if (!cityMap.has(key)) cityMap.set(key, titleCase(raw));
  }
  const availableCities = [...cityMap.values()].sort();
  const filteredMatches = matches.filter((m: any) => {
    if (m.compositeScore < minScore) return false;
    if (cityFilter && normalize(m.candidateProfile?.city || "") !== normalize(cityFilter)) return false;
    return true;
  });
  const displayedMatches = showAll ? filteredMatches : filteredMatches.slice(0, 10);

  return (
    <div className="mt-4">
      {/* Manual search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Buscar candidato manualmente</h4>
        </div>
        <div className="relative">
          <Input
            placeholder="Digite o nome do candidato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full"
          />
          {/* Search results dropdown */}
          {searchFocused && debouncedQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((candidate: any) => (
                  <button
                    key={candidate.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors border-b border-gray-100 last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addManualCandidate(candidate)}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#0A2342] flex items-center justify-center text-white font-medium text-xs shrink-0">
                      {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{candidate.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[candidate.city, candidate.state, candidate.education_level].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Nenhum candidato encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manually added candidates */}
      {manualCandidates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-700">
              Adicionados Manualmente ({manualCandidates.length})
            </h4>
          </div>
          <div className="space-y-2">
            {manualCandidates.map((candidate: any) => (
              <Card key={candidate.id} className="overflow-hidden">
                <div className="w-full p-4 text-left flex items-center gap-3">
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(candidate.id)}
                      onCheckedChange={() => toggleSelection(candidate.id)}
                      className="h-4.5 w-4.5"
                    />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-medium text-sm shrink-0">
                    {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{candidate.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[candidate.city, candidate.state, candidate.education_level].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                    Manual
                  </Badge>
                  <button
                    onClick={() => removeManualCandidate(candidate.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1"
                    title="Remover"
                  >
                    <span className="text-xs font-medium">x</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI-matched candidates header */}
      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <h4 className="text-sm font-medium text-gray-700">
                Candidatos Compatíveis ({filteredMatches.length})
              </h4>
            </div>
          </div>

      {/* Score filter */}
      {data && data.matches.length > 5 && (
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
              {filteredMatches.length}/{data?.matches.length}
            </span>
          </div>
        </Card>
      )}

      {/* City filter */}
      {availableCities.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Todas as cidades</option>
            {availableCities.map((city: string) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          {cityFilter && (
            <button onClick={() => setCityFilter('')} className="text-xs text-gray-400 hover:text-gray-600">
              Limpar
            </button>
          )}
        </div>
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
              className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md ring-1 ring-orange-200' : 'hover:shadow-sm'}`}
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
                <div className="h-10 w-10 rounded-full bg-[#0A2342] flex items-center justify-center text-white font-medium text-sm shrink-0">
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
                        <span key={skill} className="px-1.5 py-0 text-[10px] bg-orange-50 text-orange-700 rounded border border-orange-100">
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
                  {/* Contact info + Edit button */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-4">
                      {match.candidateEmail && (
                        <a href={`mailto:${match.candidateEmail}`} className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {match.candidateEmail}
                        </a>
                      )}
                      {match.candidatePhone && (
                        <a href={`tel:${match.candidatePhone}`} className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {match.candidatePhone}
                        </a>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setEditingCandidateId(editingCandidateId === match.candidateId ? null : match.candidateId); }}
                      className="text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {editingCandidateId === match.candidateId ? 'Fechar' : 'Editar Cadastro'}
                    </Button>
                  </div>

                  {/* Inline edit form */}
                  {editingCandidateId === match.candidateId && (
                    <AgencyCandidateEditForm
                      candidateId={match.candidateId}
                      initial={{
                        full_name: match.candidateName || '',
                        email: match.candidateEmail || '',
                        phone: match.candidatePhone || '',
                        city: match.candidateProfile?.city || '',
                        state: match.candidateProfile?.state || '',
                        education_level: match.candidateProfile?.educationLevel || '',
                        skills: match.candidateProfile?.skills || [],
                      }}
                      onSaved={() => { setEditingCandidateId(null); utils.job.getMatchesForJob.invalidate({ jobId }); }}
                    />
                  )}

                  {/* Summary */}
                  {match.candidateProfile?.summary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Resumo</p>
                      <p className="text-sm text-gray-700">{match.candidateProfile.summary}</p>
                    </div>
                  )}

                  {/* DISC Profile Visualization */}
                  {match.candidateProfile?.disc && (match.candidateProfile.disc.dominante != null) && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Perfil DISC</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'D', name: 'Dominante', value: match.candidateProfile.disc.dominante, color: 'bg-red-400' },
                          { label: 'I', name: 'Influente', value: match.candidateProfile.disc.influente, color: 'bg-yellow-400' },
                          { label: 'S', name: 'Estável', value: match.candidateProfile.disc.estavel, color: 'bg-green-400' },
                          { label: 'C', name: 'Conforme', value: match.candidateProfile.disc.conforme, color: 'bg-blue-400' },
                        ].map(d => (
                          <div key={d.label} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{d.label}</div>
                            <div className="h-16 bg-gray-100 rounded relative flex items-end justify-center overflow-hidden">
                              <div className={`${d.color} w-full rounded-t transition-all`} style={{ height: `${d.value || 0}%` }} />
                            </div>
                            <div className="text-xs font-semibold mt-1">{d.value || 0}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDP Competencies */}
                  {match.candidateProfile?.pdpCompetencies?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Competências PDP</p>
                      <div className="flex flex-wrap gap-1">
                        {match.candidateProfile.pdpCompetencies.map((c: string) => (
                          <span key={c} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deep AI Analysis */}
                  {match.discAnalysis && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 space-y-3 border border-purple-100">
                      <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" /> Análise Profunda da IA
                      </p>

                      {match.discAnalysis && (
                        <div>
                          <p className="text-xs font-medium text-purple-700 mb-0.5">Perfil Comportamental (DISC)</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{match.discAnalysis}</p>
                        </div>
                      )}

                      {match.competencyAnalysis && (
                        <div>
                          <p className="text-xs font-medium text-indigo-700 mb-0.5">Competências</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{match.competencyAnalysis}</p>
                        </div>
                      )}

                      {match.companyFitNotes && (
                        <div>
                          <p className="text-xs font-medium text-emerald-700 mb-0.5">Fit com a Empresa</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{match.companyFitNotes}</p>
                        </div>
                      )}

                      {match.llm?.reasoning && (
                        <div className="pt-2 border-t border-purple-200">
                          <p className="text-sm text-gray-700 italic">{match.llm.reasoning}</p>
                          {match.llm.confidence && (
                            <p className="text-xs text-purple-500 mt-1">Confiança da análise: {Math.round(match.llm.confidence)}%</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback: simple explanation if no deep analysis */}
                  {!match.discAnalysis && match.explanationSummary && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-orange-800 mb-1 flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" /> Análise IA
                      </p>
                      <p className="text-sm text-orange-900">{match.explanationSummary}</p>
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
                        <FactorBar label="Competências" value={match.matchFactors.competency} />
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
                          <span key={skill} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded border border-orange-100">
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
        </>
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
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleCreateGroup}
                disabled={isMutating}
              >
                {isMutating ? (
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
function AgentMessage({ text, isLatest }: { text: string; isLatest: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: isLatest ? 1 : 0.6, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-2.5"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className={`px-3.5 py-2 rounded-2xl rounded-tl-sm max-w-[85%] ${isLatest ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-500'}`}>
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-slate-100">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchingStatusCard({ jobId, autoTrigger }: { jobId: string; autoTrigger?: boolean }) {
  const utils = trpc.useUtils();
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isReSearching, setIsReSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: progress, isLoading } = trpc.job.getMatchingProgress.useQuery(
    { jobId },
    { refetchInterval: (query: any) => {
      const status = query.state?.data?.status;
      return (status === 'running' || status === 'pending' || status === 'not_started' || isReSearching) ? 1500 : false;
    }}
  );

  const triggerMatchingMutation = trpc.job.triggerMatchingForAgency.useMutation({
    onSuccess: () => {
      utils.job.getMatchingProgress.invalidate({ jobId });
      utils.job.getMatchesForJob.invalidate({ jobId });
    },
  });

  // Auto-trigger matching when autoTrigger is set and no search is running/completed
  useEffect(() => {
    if (autoTrigger && !hasTriggered && !isLoading) {
      const shouldTrigger = !progress || progress.status === 'not_started';
      if (shouldTrigger && !triggerMatchingMutation.isPending) {
        setHasTriggered(true);
        triggerMatchingMutation.mutate({ jobId });
      } else if (!shouldTrigger) {
        setHasTriggered(true);
      }
    }
  }, [autoTrigger, hasTriggered, isLoading, progress, triggerMatchingMutation, jobId]);

  // Auto-scroll to bottom when new messages arrive
  const messages = (progress as any)?.messages || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isRunning = isReSearching || !progress || progress.status === 'not_started' || progress.status === 'running' || progress.status === 'pending';

  // Stop re-searching state when progress shows completed after a re-search
  useEffect(() => {
    if (isReSearching && progress?.status === 'completed') {
      setIsReSearching(false);
    }
  }, [isReSearching, progress?.status]);

  // Loading / Running state with chat bubbles
  if (isLoading || (autoTrigger && !hasTriggered) || isRunning) {
    return (
      <div className="flex flex-col gap-4 py-6 px-2">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35] flex items-center justify-center"
          >
            <Bot className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-[#0A2342]">Agente de Recrutamento</p>
            <p className="text-xs text-slate-400">Buscando candidatos...</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto">
          {messages.map((msg: any, i: number) => (
            <AgentMessage key={i} text={msg.text} isLatest={i === messages.length - 1} />
          ))}
          {progress?.status !== 'completed' && progress?.status !== 'failed' && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {progress && progress.percentComplete > 0 && progress.status !== 'completed' && (
          <div className="w-full max-w-sm mx-auto mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Progresso</span>
              <span className="font-medium">{progress.percentComplete}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #1B4D7A, #FF6B35)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
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

  const config = statusConfig[progress.status] || statusConfig.completed;

  // Completed or failed states
  return (
    <div className={`p-5 ${config.bg} rounded-xl border ${config.border}`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.text}`}>
            {progress.status === 'completed' && `Busca concluída — ${progress.matchesFound} candidatos encontrados`}
            {progress.status === 'failed' && 'Erro na busca de candidatos'}
          </p>

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

          {(progress.status === 'completed' || progress.status === 'failed') && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setIsReSearching(true);
                triggerMatchingMutation.mutate({ jobId });
              }}
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

// Document assignment section — agency selects which documents to send
function DocumentAssignmentSection({
  hiringProcessId,
  hiringType,
  onAssigned,
}: {
  hiringProcessId: string;
  hiringType: string;
  onAssigned: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, 'company' | 'candidate' | 'both'>>({});
  const [isUploading, setIsUploading] = useState(false);
  const utils = trpc.useUtils();

  const categoryMap: Record<string, string> = {
    estagio: 'estagio',
    clt: 'clt',
    'menor-aprendiz': 'menor_aprendiz',
    pj: 'clt',
  };
  const category = categoryMap[hiringType] || hiringType;

  const { data: templates = [] } = (trpc.agency.getDocumentTemplates as any).useQuery(
    { category },
    { enabled: isOpen }
  );

  const { data: assigned = [] } = (trpc.hiring as any).getHiringDocuments.useQuery(
    { hiringProcessId },
    { enabled: true }
  );

  const assignMutation = (trpc.hiring as any).assignDocumentsToHiring.useMutation({
    onSuccess: () => {
      toast.success('Documentos atribuídos!');
      (utils.hiring as any).getHiringDocuments.invalidate({ hiringProcessId });
      onAssigned();
      setIsOpen(false);
    },
    onError: () => toast.error('Erro ao atribuir documentos'),
  });

  const uploadMutation = (trpc.agency as any).uploadDocumentTemplate.useMutation({
    onSuccess: () => {
      toast.success('Documento enviado!');
      (utils.agency as any).getDocumentTemplates.invalidate({ category });
      setIsUploading(false);
    },
    onError: () => {
      toast.error('Erro ao enviar documento');
      setIsUploading(false);
    },
  });

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        uploadMutation.mutate({
          category,
          name: file.name,
          fileBase64: base64,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Initialize selections from assigned data
  useEffect(() => {
    if (assigned.length > 0 && Object.keys(selections).length === 0) {
      const sel: Record<string, 'company' | 'candidate' | 'both'> = {};
      assigned.forEach((a: any) => {
        const templateId = a.template?.id || a.template_id;
        if (templateId) sel[templateId] = a.target;
      });
      setSelections(sel);
    }
  }, [assigned]);

  const handleSave = () => {
    const documents = Object.entries(selections).map(([templateId, target]) => ({
      templateId,
      target,
    }));
    assignMutation.mutate({ hiringProcessId, documents });
  };

  const toggleTemplate = (templateId: string) => {
    setSelections(prev => {
      const next = { ...prev };
      if (next[templateId]) {
        delete next[templateId];
      } else {
        next[templateId] = 'both';
      }
      return next;
    });
  };

  const assignedCount = assigned.length;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          {assignedCount > 0 ? `${assignedCount} documento(s)` : 'Selecionar Documentos'}
        </button>
        {assignedCount > 0 && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Atribuídos
          </span>
        )}
      </div>

      {assignedCount > 0 && (
        <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
          {assigned.map((doc: any, idx: number) => {
            const templateName = doc.template?.name || 'Documento';
            const signing = doc.signingStatus;
            const isLast = idx === assigned.length - 1;
            return (
              <div key={doc.id} className={`px-3 py-2.5 ${!isLast ? 'border-b border-slate-100' : ''} bg-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-[#0A2342] truncate">{templateName}</span>
                </div>
                {signing ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] ${signing.agencySigned ? 'bg-green-50' : 'bg-blue-50'}`}>
                        <span className="text-slate-500">Agência</span>
                        {signing.agencySigned ? (
                          <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                        ) : (
                          <Clock className="w-3 h-3 text-blue-400 ml-auto" />
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] ${signing.companySigned ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <span className="text-slate-500">Empresa</span>
                        {signing.companySigned ? (
                          <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-400 ml-auto" />
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] ${signing.candidateSigned ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <span className="text-slate-500">Candidato</span>
                        {signing.candidateSigned ? (
                          <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-400 ml-auto" />
                        )}
                      </div>
                    </div>
                    {!signing.agencySigned && signing.agencySignUrl && (
                      <button
                        onClick={() => window.open(signing.agencySignUrl, '_blank')}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium bg-[#0A2342] text-white hover:bg-[#1B4D7A] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Assinar na Autentique
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 ml-5.5">Aguardando envio</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="mt-3 border border-slate-200 rounded-lg p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documentos disponíveis</p>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              Enviar documento
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum documento cadastrado para esta categoria.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t: any) => {
                const isSelected = !!selections[t.id];
                return (
                  <div key={t.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isSelected ? 'border-[#FF6B35] bg-orange-50' : 'border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTemplate(t.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-[#0A2342]">{t.name}</span>
                    </label>
                    {isSelected && (
                      <select
                        value={selections[t.id]}
                        onChange={(e) => setSelections(prev => ({ ...prev, [t.id]: e.target.value as any }))}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="both">Ambos</option>
                        <option value="company">Empresa</option>
                        <option value="candidate">Candidato</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={assignMutation.isPending || Object.keys(selections).length === 0}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#0A2342] text-white hover:bg-[#1B4D7A] disabled:opacity-50 transition-colors"
            >
              {assignMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Safe wrapper with error boundary for DocumentAssignmentSection
class DocAssignErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[DocAssign Error]', error, info); }
  render() {
    if (this.state.hasError) return <p className="text-xs text-red-500 mt-2">Erro ao carregar documentos: {this.state.error}</p>;
    return this.props.children;
  }
}
function DocumentAssignmentSectionSafe(props: { hiringProcessId: string; hiringType: string; onAssigned: () => void }) {
  return <DocAssignErrorBoundary><DocumentAssignmentSection {...props} /></DocAssignErrorBoundary>;
}

// Modal for agency to configure contract terms before sending
function ConfigureContractButton({
  hiringProcess,
  onConfigured,
}: {
  hiringProcess: any;
  onConfigured: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [durationMonths, setDurationMonths] = useState('12');
  const [monthlyFee, setMonthlyFee] = useState(
    hiringProcess.calculated_fee ? String(hiringProcess.calculated_fee / 100) : '150'
  );
  const [paymentDay, setPaymentDay] = useState('10');
  const [monthlySalary, setMonthlySalary] = useState(
    hiringProcess.monthly_salary ? String(hiringProcess.monthly_salary / 100) : ''
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [placeholderData, setPlaceholderData] = useState<any>(null);

  // Map hiring type to template category
  const categoryMap: Record<string, string> = {
    estagio: 'estagio',
    clt: 'clt',
    'menor-aprendiz': 'menor_aprendiz',
  };
  const templateCategory = categoryMap[hiringProcess.hiring_type] || hiringProcess.hiring_type;

  // Fetch available document templates for this hiring type
  const { data: templates, isLoading: templatesLoading } = trpc.agency.getDocumentTemplates.useQuery(
    { category: templateCategory },
    { enabled: open }
  );

  // Select all templates by default when first loaded
  useEffect(() => {
    if (templates && templates.length > 0 && selectedTemplateIds.length === 0) {
      setSelectedTemplateIds(templates.map((t: any) => t.id));
    }
  }, [templates]);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  // Scan templates for placeholders
  const scanMutation = trpc.hiring.getTemplatePlaceholders.useMutation({
    onSuccess: (data) => {
      setPlaceholderData(data);
      setStep('review');
    },
    onError: (err) => toast.error(err.message || 'Erro ao analisar documentos'),
  });

  const mutation = trpc.hiring.configureAndSendContract.useMutation({
    onSuccess: () => {
      toast.success('Contrato configurado e enviado!');
      setOpen(false);
      setStep('configure');
      setManualFields({});
      setPlaceholderData(null);
      onConfigured();
    },
    onError: (err) => toast.error(err.message || 'Erro ao configurar contrato'),
  });

  const handleNextToReview = () => {
    if (selectedTemplateIds.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }
    // Scan templates for placeholder fields
    scanMutation.mutate({
      hiringProcessId: hiringProcess.id,
      selectedTemplateIds,
    });
  };

  const handleSubmit = () => {
    const feeInCents = Math.round(parseFloat(monthlyFee || '0') * 100);
    const salaryInCents = monthlySalary ? Math.round(parseFloat(monthlySalary) * 100) : undefined;

    // Only include non-empty manual fields
    const filledManualFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(manualFields)) {
      if (value.trim()) filledManualFields[key] = value.trim();
    }

    mutation.mutate({
      hiringProcessId: hiringProcess.id,
      durationMonths: parseInt(durationMonths),
      monthlyFee: feeInCents,
      paymentDay: parseInt(paymentDay),
      monthlySalary: salaryInCents,
      selectedTemplateIds,
      manualFields: Object.keys(filledManualFields).length > 0 ? filledManualFields : undefined,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setStep('configure');
    setManualFields({});
    setPlaceholderData(null);
  };

  // Count total missing fields across all templates
  const totalMissing = placeholderData?.templates?.reduce(
    (acc: number, t: any) => acc + t.missing.length, 0
  ) || 0;
  const totalMissingFilled = placeholderData?.templates?.reduce(
    (acc: number, t: any) => acc + t.missing.filter((m: any) => manualFields[m.key]?.trim()).length, 0
  ) || 0;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        size="sm"
      >
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        Configurar e enviar contrato
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          {step === 'configure' ? (
            <>
              <DialogHeader>
                <DialogTitle>Configurar Contrato</DialogTitle>
                <DialogDescription>
                  Configure os termos do contrato de estágio para {hiringProcess.candidate?.full_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                {/* Document selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Documentos do contrato
                  </Label>
                  {templatesLoading ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando documentos...
                    </div>
                  ) : templates && templates.length > 0 ? (
                    <div className="space-y-1.5">
                      {templates.map((template: any) => (
                        <label
                          key={template.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            selectedTemplateIds.includes(template.id)
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Checkbox
                            checked={selectedTemplateIds.includes(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0A2342] truncate">{template.name}</p>
                          </div>
                          <a
                            href={template.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-purple-600 transition-colors shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </label>
                      ))}
                      <p className="text-xs text-slate-500">
                        {selectedTemplateIds.length} de {templates.length} documento{templates.length !== 1 ? 's' : ''} selecionado{selectedTemplateIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                      Nenhum documento cadastrado para este tipo de contrato.
                      Cadastre documentos nas configurações da agência.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Duração do contrato</Label>
                  <Select value={durationMonths} onValueChange={setDurationMonths}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">1 ano</SelectItem>
                      <SelectItem value="24">2 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Salário mensal do estagiário (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1200.00"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Taxa mensal da agência (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 150.00"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Valor que a empresa pagará mensalmente à agência
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Dia do pagamento</Label>
                  <Select value={paymentDay} onValueChange={setPaymentDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Dia do mês em que a empresa deve pagar
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-[#0A2342]">Resumo</p>
                  <p className="text-slate-600">
                    {durationMonths} meses × R$ {monthlyFee || '0'} = R$ {(parseInt(durationMonths || '0') * parseFloat(monthlyFee || '0')).toFixed(2)} total
                  </p>
                  <p className="text-slate-500 text-xs">
                    Pagamento todo dia {paymentDay} do mês
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleNextToReview}
                  disabled={scanMutation.isPending || !monthlyFee || selectedTemplateIds.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  {scanMutation.isPending ? 'Analisando...' : 'Revisar campos'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Revisar Campos do Contrato</DialogTitle>
                <DialogDescription>
                  Verifique os campos preenchidos automaticamente e preencha os campos pendentes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                {placeholderData?.templates?.map((tmpl: any) => {
                  const hasPlaceholders = Object.keys(tmpl.autoFilled).length > 0 || tmpl.missing.length > 0;
                  if (!hasPlaceholders) return null;

                  return (
                    <div key={tmpl.templateId} className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b">
                        <p className="text-sm font-medium text-[#0A2342] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {tmpl.templateName}
                        </p>
                      </div>
                      <div className="p-3 space-y-3">
                        {/* Auto-filled fields */}
                        {Object.keys(tmpl.autoFilled).length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Preenchidos automaticamente
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(tmpl.autoFilled).map(([key, value]: [string, any]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  title={`${placeholderData.allPlaceholderLabels[key] || key}: ${value}`}
                                >
                                  {placeholderData.allPlaceholderLabels[key] || key}: <span className="font-medium truncate max-w-[150px]">{value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing fields */}
                        {tmpl.missing.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Preencher manualmente ({tmpl.missing.filter((m: any) => manualFields[m.key]?.trim()).length}/{tmpl.missing.length})
                            </p>
                            <div className="space-y-2">
                              {tmpl.missing.map((field: any) => (
                                <div key={field.key} className="space-y-0.5">
                                  <Label className="text-xs text-slate-600">{field.label}</Label>
                                  <Input
                                    placeholder={field.label}
                                    value={manualFields[field.key] || ''}
                                    onChange={(e) =>
                                      setManualFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Templates with no placeholders */}
                {placeholderData?.templates?.every(
                  (t: any) => Object.keys(t.autoFilled).length === 0 && t.missing.length === 0
                ) && (
                  <div className="p-4 rounded-lg bg-slate-50 text-center text-sm text-slate-500">
                    Nenhum campo de preenchimento encontrado nos documentos selecionados.
                    Os documentos serão enviados como estão.
                  </div>
                )}

                {/* Summary */}
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-[#0A2342]">Resumo do contrato</p>
                  <p className="text-slate-600">
                    {durationMonths} meses × R$ {monthlyFee || '0'} = R$ {(parseInt(durationMonths || '0') * parseFloat(monthlyFee || '0')).toFixed(2)} total
                  </p>
                  <p className="text-slate-500 text-xs">
                    Pagamento todo dia {paymentDay} do mês
                  </p>
                  {totalMissing > 0 && (
                    <p className="text-xs text-amber-600">
                      {totalMissingFilled}/{totalMissing} campo{totalMissing !== 1 ? 's' : ''} pendente{totalMissing !== 1 ? 's' : ''} preenchido{totalMissingFilled !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('configure')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar contrato
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Small inline form to create a signing invitation for a missing party
function CreateInvitationButton({
  hiringProcessId,
  signerRole,
  label,
  onCreated,
}: {
  hiringProcessId: string;
  signerRole: 'parent_guardian' | 'educational_institution';
  label: string;
  onCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const mutation = trpc.hiring.createSigningInvitationForRole.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/assinar/${data.token}`;
      navigator.clipboard.writeText(url);
      toast.success(`Link de ${label} criado e copiado!`);
      setShowForm(false);
      onCreated();
    },
    onError: () => toast.error('Erro ao criar convite'),
  });

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#1B4D7A] hover:text-[#0A2342] transition-colors"
      >
        <Plus className="w-3 h-3" />
        Gerar link
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1.5 text-left" onClick={(e) => e.stopPropagation()}>
      <Input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-7 text-xs"
      />
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-7 text-xs"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          className="h-6 text-[11px] px-2 bg-[#0A2342] hover:bg-[#1B4D7A]"
          disabled={!name.trim() || !email.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ hiringProcessId, signerRole, signerName: name.trim(), signerEmail: email.trim() })}
        >
          {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Criar'}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// Agency-side actions on a hiring process card: cancel, mark active, edit fee,
// upload CLT contract. Rendered inside each card on the Finalização step.
function HiringFinalizationActions({
  hp,
  jobId,
}: {
  hp: any;
  jobId: string;
}) {
  const utils = trpc.useUtils();
  const invalidate = () => utils.hiring.invalidate();

  const [isFeeOpen, setIsFeeOpen] = useState(false);
  const [feeReais, setFeeReais] = useState<string>(((hp.calculated_fee || 0) / 100).toFixed(2));
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cancelMutation = trpc.hiring.cancelHiring.useMutation({
    onSuccess: () => { toast.success('Contratação cancelada'); setIsCancelOpen(false); invalidate(); },
    onError: (e) => toast.error(e.message || 'Erro ao cancelar'),
  });
  const finalizeMutation = trpc.hiring.markHiringActive.useMutation({
    onSuccess: () => { toast.success('Contratação finalizada'); invalidate(); },
    onError: (e) => toast.error(e.message || 'Erro ao finalizar'),
  });
  const updateFeeMutation = trpc.hiring.updateHiringFee.useMutation({
    onSuccess: () => { toast.success('Taxa atualizada'); setIsFeeOpen(false); invalidate(); },
    onError: (e) => toast.error(e.message || 'Erro ao atualizar taxa'),
  });
  const uploadMutation = trpc.hiring.uploadHiringContract.useMutation({
    onSuccess: () => { toast.success('Contrato enviado'); invalidate(); },
    onError: (e) => toast.error(e.message || 'Erro ao enviar contrato'),
  });

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      uploadMutation.mutate({ hiringProcessId: hp.id, fileBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSaveFee = () => {
    const reais = parseFloat(feeReais.replace(',', '.'));
    if (isNaN(reais) || reais < 0) {
      toast.error('Valor inválido');
      return;
    }
    updateFeeMutation.mutate({ hiringProcessId: hp.id, fee: Math.round(reais * 100) });
  };

  const isCancelled = hp.status === 'cancelled';
  const isActive = hp.status === 'active';
  const isCLT = hp.hiring_type === 'clt';
  const feeReaisDisplay = ((hp.calculated_fee || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
      {/* Fee + edit */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm">
          <span className="text-slate-500">Taxa:</span>{' '}
          <span className="font-medium text-[#0A2342]">R$ {feeReaisDisplay}</span>
        </div>
        {!isCancelled && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => { setFeeReais(((hp.calculated_fee || 0) / 100).toFixed(2)); setIsFeeOpen(true); }}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Editar taxa
          </Button>
        )}
      </div>

      {/* CLT contract upload + view */}
      {isCLT && !isCancelled && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            {hp.contract_document_url ? (
              <a
                href={hp.contract_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1B4D7A] hover:underline inline-flex items-center gap-1"
              >
                Ver contrato <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-500">Nenhum contrato anexado</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={onFileChosen}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 mr-1" />
              )}
              {hp.contract_document_url ? 'Substituir' : 'Enviar contrato'}
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isCancelled && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!isActive && (
            <Button
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
              disabled={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate({ hiringProcessId: hp.id })}
            >
              {finalizeMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              Finalizar contratação
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            disabled={cancelMutation.isPending || finalizeMutation.isPending}
            onClick={() => setIsCancelOpen(true)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Cancelar contratação
          </Button>
        </div>
      )}

      {/* Edit fee dialog */}
      <Dialog open={isFeeOpen} onOpenChange={setIsFeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar valor da taxa</DialogTitle>
            <DialogDescription>Valor cobrado da empresa por esta contratação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fee-input">Taxa (R$)</Label>
            <Input
              id="fee-input"
              type="number"
              step="0.01"
              min="0"
              value={feeReais}
              onChange={(e) => setFeeReais(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFeeOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#0A2342] hover:bg-[#1B4D7A]"
              disabled={updateFeeMutation.isPending}
              onClick={onSaveFee}
            >
              {updateFeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar contratação</DialogTitle>
            <DialogDescription>
              Esta ação marcará a contratação como cancelada. Você poderá iniciar uma nova contratação para o mesmo candidato depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Candidato desistiu, empresa cancelou..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCancelOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({ hiringProcessId: hp.id, reason: cancelReason.trim() || undefined })}
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component to handle individual job workflow state
function JobWithWorkflow({ job, contractTypeLabels, companyName }: { job: any; contractTypeLabels: Record<string, string>; companyName: string }) {
  const [hasCreatedGroup, setHasCreatedGroup] = useState(false);
  const [shouldAutoTrigger, setShouldAutoTrigger] = useState(false);

  // Edit/delete state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: job.title || '',
    contract_type: job.contract_type || '',
    work_type: job.work_type || 'presencial',
    work_schedule: job.work_schedule || '',
    salary: job.salary_min ? String(job.salary_min) : '',
    description: job.description || '',
    requirements: job.specific_requirements || job.requirements || '',
    openings: String(job.openings || 1),
  });

  // Check if this job has any batches
  const { data: batches } = trpc.batch.getBatchesByJobId.useQuery(
    { jobId: job.id },
    { enabled: !!job.id }
  );

  // Check for hiring processes (contract status)
  const { data: hiringProcesses } = trpc.hiring.getHiringProcessesByJobId.useQuery(
    { jobId: job.id },
    { enabled: !!job.id, staleTime: 30000, refetchInterval: 30000 }
  );

  const utils = trpc.useUtils();
  const sendInvitationsMutation = trpc.hiring.sendSigningInvitations.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.sent} convite(s) enviado(s) com sucesso!`);
      utils.hiring.getHiringProcessesByJobId.invalidate({ jobId: job.id });
    },
    onError: () => {
      toast.error("Erro ao enviar convites. Tente novamente.");
    },
  });

  const updateJobMutation = trpc.job.updateForCompany.useMutation({
    onSuccess: () => {
      toast.success('Vaga atualizada!');
      setIsEditOpen(false);
      utils.job.getByCompanyId.invalidate({ companyId: job.company_id });
    },
    onError: (error) => toast.error(error.message || 'Erro ao atualizar vaga'),
  });

  const deleteJobMutation = trpc.job.deleteForCompany.useMutation({
    onSuccess: () => {
      toast.success('Vaga excluída!');
      setIsDeleteOpen(false);
      utils.job.getByCompanyId.invalidate({ companyId: job.company_id });
    },
    onError: (error) => toast.error(error.message || 'Erro ao excluir vaga'),
  });

  const handleSaveEdit = () => {
    if (!editForm.title || !editForm.description) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    updateJobMutation.mutate({
      jobId: job.id,
      title: editForm.title,
      description: editForm.description,
      contractType: editForm.contract_type as any || undefined,
      workType: editForm.work_type as any,
      workSchedule: editForm.work_schedule || undefined,
      salaryMin: editForm.salary ? parseFloat(editForm.salary) : undefined,
      salaryMax: editForm.salary ? parseFloat(editForm.salary) : undefined,
      requirements: editForm.requirements || undefined,
      openings: editForm.openings ? parseInt(editForm.openings) : 1,
    });
  };

  const hasHiringProcess = hiringProcesses && hiringProcesses.length > 0;
  const hasActiveContract = hiringProcesses?.some((hp: any) => hp.status === "active") ?? false;
  const hasPendingContract = hiringProcesses?.some(
    (hp: any) => hp.status === "pending_signatures" || hp.status === "pending_payment"
  ) ?? false;

  // Update state when batches are loaded
  const hasBatches = batches && batches.length > 0;

  // Set hasCreatedGroup when batches are detected
  useEffect(() => {
    if (hasBatches && !hasCreatedGroup) {
      setHasCreatedGroup(true);
    }
  }, [hasBatches, hasCreatedGroup]);

  // Handle group creation
  const handleGroupCreated = useCallback(() => {
    setHasCreatedGroup(true);

    setTimeout(() => {
      const el = document.getElementById(`group-management-${job.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [job.id]);

  // Handle step click - scroll to section
  const handleStepClick = useCallback((stepId: string) => {
    const el = document.getElementById(`${stepId}-${job.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [job.id]);

  // Check if batch has been sent/forwarded to company
  const currentBatch = batches?.[0];
  const isBatchSent = currentBatch?.status === 'sent' || currentBatch?.status === 'unlocked' || currentBatch?.status === 'forwarded' || currentBatch?.status === 'completed';

  // Company interview data for Step 4
  const { data: companyInterviewSessions, refetch: refetchCompanyInterviews } = trpc.batch.getCompanyInterviewSessions.useQuery(
    { batchId: currentBatch?.id! },
    { enabled: !!currentBatch?.id }
  );

  const hasCompanyInterviews = (companyInterviewSessions || []).length > 0;

  // Build set of candidate IDs that have company interviews (to exclude from Step 3)
  const companyInterviewCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of companyInterviewSessions || []) {
      for (const p of session.participants || []) {
        if (p.candidate_id) ids.add(p.candidate_id);
      }
    }
    return ids;
  }, [companyInterviewSessions]);

  // Build candidate → company interview session map for display
  const companyInterviewMap = useMemo(() => {
    const map = new Map<string, { scheduledAt: string; interviewType: string; sessionFormat: string }>();
    for (const session of companyInterviewSessions || []) {
      for (const p of session.participants || []) {
        if (p.candidate_id) {
          map.set(p.candidate_id, {
            scheduledAt: session.scheduled_at,
            interviewType: session.interview_type,
            sessionFormat: session.session_format || "group",
          });
        }
      }
    }
    return map;
  }, [companyInterviewSessions]);

  // Company interview scheduling modal state
  const [isCompanyInterviewModalOpen, setIsCompanyInterviewModalOpen] = useState(false);
  const [companyInterviewCandidateIdsForModal, setCompanyInterviewCandidateIdsForModal] = useState<string[]>([]);
  const [companyInterviewCandidateNamesForModal, setCompanyInterviewCandidateNamesForModal] = useState<string[]>([]);

  const handleScheduleCompanyInterview = useCallback((candidateIds: string[], candidateNames: string[]) => {
    setCompanyInterviewCandidateIdsForModal(candidateIds);
    setCompanyInterviewCandidateNamesForModal(candidateNames);
    setIsCompanyInterviewModalOpen(true);
  }, []);

  // Get workflow steps for this job
  const getWorkflowSteps = (): WorkflowStep[] => {
    const groupExists = hasCreatedGroup || hasBatches;

    return [
      {
        id: 'job-details',
        label: 'Detalhes da Vaga',
        status: 'completed',
        sectionId: `job-details-${job.id}`,
      },
      {
        id: 'matched-candidates',
        label: 'Buscar Candidatos',
        status: groupExists ? 'completed' : 'current',
        sectionId: `matched-candidates-${job.id}`,
      },
      {
        id: 'group-management',
        label: 'Gerenciar Grupo',
        status: groupExists ? ((hasCompanyInterviews || isBatchSent || hasHiringProcess) ? 'completed' : 'current') : 'upcoming',
        sectionId: `group-management-${job.id}`,
      },
      {
        id: 'selection',
        label: 'Entrevista Empresa',
        status: hasHiringProcess ? 'completed' : ((hasCompanyInterviews || isBatchSent) ? 'current' : 'upcoming'),
        sectionId: `selection-${job.id}`,
      },
      {
        id: 'completion',
        label: 'Finalização',
        status: hasActiveContract ? 'completed' : (hasPendingContract ? 'current' : 'upcoming'),
        sectionId: `completion-${job.id}`,
      },
    ];
  };

  const statusConfig = jobStatusConfig[job.status] || jobStatusConfig.open;
  const showGroupManagement = hasCreatedGroup || hasBatches;

  return (
    <div>
      <div className="flex-1 min-w-0">
        {/* Step 1: Job Details */}
        <div id={`job-details-${job.id}`} className="scroll-mt-20 min-h-screen flex flex-col justify-start pt-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow w-full">
              <CardContent className="p-0">
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
                      <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-8 w-8 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(true)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

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

                  {job.description && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrição</h4>
                      <p className="text-gray-700 text-sm">{job.description}</p>
                    </div>
                  )}

                  {(job.requirements || job.specific_requirements) && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requisitos</h4>
                      <p className="text-gray-700 text-sm">{job.requirements || job.specific_requirements}</p>
                    </div>
                  )}
                </div>

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

            {/* Scroll to next step button */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => {
                  setShouldAutoTrigger(true);
                  handleStepClick('matched-candidates');
                }}
                className="bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] hover:opacity-90 text-white px-6 py-3 rounded-xl shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all"
                size="lg"
              >
                <Search className="h-5 w-5 mr-2" />
                Buscar Candidatos
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="ml-2"
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.div>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Step 2: Matched Candidates */}
        <div id={`matched-candidates-${job.id}`} className="scroll-mt-20 min-h-screen flex flex-col justify-start pt-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <MatchingStatusCard jobId={job.id} autoTrigger={shouldAutoTrigger} />
            <MatchedCandidatesList
              jobId={job.id}
              onGroupCreated={handleGroupCreated}
            />
          </motion.div>
        </div>

        {/* Step 3: Group Management - only renders when group exists */}
        {showGroupManagement && (
          <div id={`group-management-${job.id}`} className="scroll-mt-20 min-h-screen flex flex-col justify-center py-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <CandidateGroupManagement
                jobId={job.id}
                companyInterviewCandidateIds={companyInterviewCandidateIds}
                onScheduleCompanyInterview={handleScheduleCompanyInterview}
                onBatchSent={() => {
                  setTimeout(() => {
                    const el = document.getElementById(`selection-${job.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 300);
                }}
              />
            </motion.div>
          </div>
        )}


        {/* Step 4: Entrevista com Empresa - after company interviews are scheduled */}
        {(hasCompanyInterviews || isBatchSent) && (
          <div id={`selection-${job.id}`} className="scroll-mt-20 min-h-screen flex flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0A2342]">Entrevista com Empresa</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {companyInterviewCandidateIds.size} candidato{companyInterviewCandidateIds.size !== 1 ? 's' : ''} agendado{companyInterviewCandidateIds.size !== 1 ? 's' : ''} para entrevista
                  </p>
                </div>
              </div>

              {/* Company interview session cards */}
              {companyInterviewSessions && companyInterviewSessions.length > 0 && (
                <div className="space-y-2">
                  {companyInterviewSessions.map((session: any) => {
                    const participants = session.participants || [];
                    const isOnline = session.interview_type === "online";
                    const isIndividual = session.session_format === "individual";

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border p-4 ${
                          isOnline
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-amber-50/50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isOnline ? "bg-emerald-100" : "bg-amber-100"
                            }`}>
                              {isOnline ? (
                                <Video className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <MapPin className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${isOnline ? "text-emerald-900" : "text-amber-900"}`}>
                                {isOnline ? "Online" : "Presencial"} — {isIndividual ? "Individual" : "Grupo"}
                              </p>
                              <p className={`text-xs ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
                                {new Date(session.scheduled_at).toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {participants.map((p: any) => (
                            <span
                              key={p.candidate_id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                isOnline
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              <User className="w-3 h-3" />
                              {p.candidate?.full_name || "Candidato"}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Company interview candidate list */}
              {currentBatch?.candidates && (
                <div className="space-y-2">
                  {currentBatch.candidates
                    .filter((bc: any) => bc.candidate && companyInterviewCandidateIds.has(bc.candidate.id))
                    .map((bc: any) => {
                      const candidate = bc.candidate;
                      const ciInfo = companyInterviewMap.get(candidate.id);
                      const scheduledDate = ciInfo?.scheduledAt ? new Date(ciInfo.scheduledAt) : null;
                      const dateStr = scheduledDate
                        ? `${scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        : "";
                      return (
                        <div
                          key={candidate.id}
                          className="bg-white rounded-lg border-2 border-[#FF6B35]/30 p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#FF6B35]/10 flex items-center justify-center text-sm font-bold text-[#FF6B35]">
                              {(candidate.full_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#0A2342]">{candidate.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {candidate.education_level || ""}
                                {bc.match_score != null && (
                                  <span className="ml-2 text-[#FF6B35] font-medium">{Math.round(bc.match_score)}% match</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
                              <Building2 className="w-3 h-3" />
                              {dateStr || "Agendada"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Status message */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Aguardando entrevista com a empresa</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    As entrevistas foram agendadas. Apos a empresa realizar as entrevistas e avaliar os candidatos, o processo seguira para a proxima etapa.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        )}

        {/* Company Interview Schedule Modal */}
        {currentBatch && (
          <CompanyInterviewScheduleModal
            open={isCompanyInterviewModalOpen}
            onClose={() => setIsCompanyInterviewModalOpen(false)}
            batchId={currentBatch.id}
            jobId={job.id}
            candidateIds={companyInterviewCandidateIdsForModal}
            candidateNames={companyInterviewCandidateNamesForModal}
            onSuccess={() => {
              refetchCompanyInterviews();
              setIsCompanyInterviewModalOpen(false);
              setTimeout(() => {
                const el = document.getElementById(`selection-${job.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 300);
            }}
          />
        )}

        {/* Step 5: Finalização - renders when hiring process exists */}
        {hasHiringProcess && (
          <div id={`completion-${job.id}`} className="scroll-mt-20 min-h-screen flex flex-col justify-center py-8 pb-[20vh]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#0A2342]">Finalização</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Acompanhe o status dos contratos e assinaturas
                </p>
              </div>

              {/* Hiring process cards */}
              <div className="space-y-4">
                {hiringProcesses?.map((hp: any) => {
                  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                    awaiting_configuration: { label: 'Aguardando configuração', color: 'text-purple-700', bg: 'bg-purple-100' },
                    pending_signatures: { label: 'Aguardando assinaturas', color: 'text-amber-700', bg: 'bg-amber-100' },
                    pending_payment: { label: 'Aguardando pagamento', color: 'text-blue-700', bg: 'bg-blue-100' },
                    active: { label: 'Ativo', color: 'text-green-700', bg: 'bg-green-100' },
                    cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
                  };
                  const statusInfo = statusMap[hp.status] || { label: hp.status, color: 'text-gray-700', bg: 'bg-gray-100' };

                  const contractTypeLabelsMap: Record<string, string> = {
                    estagio: 'Estágio',
                    clt: 'CLT',
                    'menor-aprendiz': 'Jovem Aprendiz',
                  };

                  // Count signatures using boolean fields (4 parties for estágio)
                  const isEstagio = hp.hiring_type === 'estagio';
                  const invitations = hp.signing_invitations || [];
                  const getInvitation = (role: string) => {
                    const inv = invitations.find((i: any) => i.signer_role === role);
                    return { emailSent: !!inv?.email_sent_at, token: inv?.token || null, signerName: inv?.signer_name || null };
                  };
                  const signatureParties = isEstagio
                    ? [
                        { label: 'Empresa', signed: hp.company_signed, role: 'company', emailSent: true, token: null as string | null, signerName: null as string | null },
                        { label: 'Candidato', signed: hp.candidate_signed, role: 'candidate', ...getInvitation('candidate') },
                        { label: 'Responsável', signed: hp.parent_signed, role: 'parent_guardian', ...getInvitation('parent_guardian') },
                        { label: 'Escola', signed: hp.school_signed, role: 'educational_institution', ...getInvitation('educational_institution') },
                      ]
                    : [];
                  const hasUnsentInvitations = signatureParties.some(
                    (p) => !p.signed && !p.emailSent && p.role !== 'company'
                  );
                  const totalSignatures = signatureParties.length;
                  const signedCount = signatureParties.filter((s) => s.signed).length;

                  return (
                    <Card key={hp.id} className="overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0A2342] flex items-center justify-center shrink-0">
                              <span className="text-white font-medium text-sm">
                                {hp.candidate?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-[#0A2342]">{hp.candidate?.full_name || 'Candidato'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">
                                  {contractTypeLabelsMap[hp.hiring_type] || hp.hiring_type}
                                </Badge>
                                {isEstagio && hp.status === 'pending_signatures' && (
                                  <span className="text-xs text-slate-500">
                                    {signedCount}/{totalSignatures} assinaturas
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0`}>
                            {hp.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Configure contract button for awaiting_configuration */}
                        {hp.status === 'awaiting_configuration' && (
                          <div className="mt-4">
                            <ConfigureContractButton
                              hiringProcess={hp}
                              onConfigured={() => utils.hiring.getHiringProcessesByJobId.invalidate({ jobId: job.id })}
                            />
                          </div>
                        )}

                        {/* Document assignment */}
                        {(hp.status === 'pending_signatures' || hp.status === 'awaiting_configuration') && (
                          <DocumentAssignmentSectionSafe
                            hiringProcessId={hp.id}
                            hiringType={hp.hiring_type}
                            onAssigned={() => utils.hiring.getHiringProcessesByJobId.invalidate({ jobId: job.id })}
                          />
                        )}

                        {/* Cancel / Finalize / Edit fee / Upload CLT contract */}
                        <HiringFinalizationActions hp={hp} jobId={job.id} />

                        {/* Signature progress for estágio — 4 parties */}
                        {isEstagio && hp.status === 'pending_signatures' && (
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {signatureParties.map((party, idx) => {
                                const signingUrl = party.token ? `${window.location.origin}/assinar/${party.token}` : null;
                                const needsLink = !party.signed && (party.role === 'parent_guardian' || party.role === 'educational_institution');
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-lg border text-center text-xs ${
                                      party.signed
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <p className="font-medium">{party.label}</p>
                                    <p>{party.signed ? 'Assinado' : 'Pendente'}</p>
                                    {needsLink && signingUrl && (
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(signingUrl);
                                          toast.success(`Link de ${party.label} copiado!`);
                                        }}
                                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#1B4D7A] hover:text-[#0A2342] transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copiar link
                                      </button>
                                    )}
                                    {needsLink && !signingUrl && (
                                      <CreateInvitationButton
                                        hiringProcessId={hp.id}
                                        signerRole={party.role as 'parent_guardian' | 'educational_institution'}
                                        label={party.label}
                                        onCreated={() => utils.hiring.getHiringProcessesByJobId.invalidate({ jobId: job.id })}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </motion.div>
          </div>
        )}
      </div>

      {/* Vertical Workflow Stepper - fixed on the right side */}
      <VerticalWorkflowStepper
        steps={getWorkflowSteps()}
        onStepClick={handleStepClick}
      />

      {/* Edit Job Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Vaga</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Título da vaga *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de contrato *</Label>
              <Select
                value={editForm.contract_type}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, contract_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estagio">Estágio</SelectItem>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="menor-aprendiz">Jovem Aprendiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Modalidade</Label>
              <Select
                value={editForm.work_type}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, work_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="remoto">Remoto</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Horário de trabalho</Label>
              <WorkSchedulePicker
                value={editForm.work_schedule}
                onChange={(v) => setEditForm(prev => ({ ...prev, work_schedule: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Salário (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1500"
                  value={editForm.salary}
                  onChange={(e) => setEditForm(prev => ({ ...prev, salary: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vagas</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.openings}
                  onChange={(e) => setEditForm(prev => ({ ...prev, openings: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Textarea
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Requisitos</Label>
              <Textarea
                rows={3}
                value={editForm.requirements}
                onChange={(e) => setEditForm(prev => ({ ...prev, requirements: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateJobMutation.isPending}
              className="bg-[#0A2342] hover:opacity-90"
            >
              {updateJobMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir Vaga</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a vaga <strong>"{job.title}"</strong>? Esta ação não pode ser desfeita. Todos os candidatos associados e dados de matching serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteJobMutation.mutate({ jobId: job.id })}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompanyJobFlow() {
  const { selectedCompanyId, setSelectedCompanyId, selectedCompany } = useAgencyFunnel();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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

  const utils = trpc.useUtils();

  // Get jobs for this company
  const { data: jobs, isLoading: jobsLoading } = trpc.job.getByCompanyId.useQuery(
    { companyId: selectedCompanyId || '' },
    { enabled: !!selectedCompanyId }
  );

  // Auto-select first job when jobs load, or reset if selected job was deleted
  useEffect(() => {
    if (!jobs || jobs.length === 0) {
      setSelectedJobId(null);
      return;
    }
    const selectedStillExists = jobs.some((j: any) => j.id === selectedJobId);
    if (!selectedJobId || !selectedStillExists) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Create job mutation
  const createJobMutation = trpc.job.createForCompany.useMutation({
    onSuccess: (data) => {
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
      utils.job.getByCompanyId.invalidate({ companyId: selectedCompanyId || '' }).then(() => {
        // Select the newly created job
        if (data?.jobId) {
          setSelectedJobId(data.jobId);
        }
      });
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
      companyId: selectedCompanyId || '',
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

  const companyName = selectedCompany?.company_name || 'Empresa';
  const selectedJob = jobs?.find((j: any) => j.id === selectedJobId);

  const contractTypeLabels: Record<string, string> = {
    estagio: 'Estágio',
    clt: 'CLT',
    'menor-aprendiz': 'Jovem Aprendiz',
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('[CompanyJobFlow] Back button clicked, setting selectedCompanyId to null');
              setSelectedCompanyId(null);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-[#0A2342]">{companyName}</h2>
            <p className="text-sm text-slate-600">Vagas e candidatos compatíveis</p>
          </div>
        </div>
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
                    <SelectItem value="menor-aprendiz">Jovem Aprendiz</SelectItem>
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
              <Label htmlFor="work_schedule">Horário de trabalho</Label>
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

      {/* Job Tabs */}
      {jobsLoading ? (
        <div className="flex items-center gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-48 rounded-xl" />
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {jobs.map((job: any) => {
            const isSelected = job.id === selectedJobId;
            const statusCfg = jobStatusConfig[job.status] || jobStatusConfig.open;
            return (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all shrink-0 text-left ${
                  isSelected
                    ? 'border-[#FF6B35] bg-orange-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Briefcase className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#FF6B35]' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate max-w-[160px] ${isSelected ? 'text-[#0A2342]' : 'text-slate-700'}`}>
                    {job.title}
                  </p>
                  <p className={`text-xs ${isSelected ? 'text-[#FF6B35]' : 'text-slate-400'}`}>
                    {contractTypeLabels[job.contract_type] || job.contract_type}
                  </p>
                </div>
              </button>
            );
          })}
          {/* New Job tab */}
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-all shrink-0"
          >
            <Plus className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Nova Vaga</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-700 mb-1">Nenhuma vaga cadastrada</h3>
          <p className="text-gray-500 text-sm mb-4">Esta empresa ainda não cadastrou nenhuma vaga</p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#0A2342] hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Vaga
          </Button>
        </div>
      )}

      {/* Selected Job Workflow */}
      {selectedJob && (
        <JobWithWorkflow
          key={selectedJob.id}
          job={selectedJob}
          contractTypeLabels={contractTypeLabels}
          companyName={companyName}
        />
      )}
    </div>
  );
}
