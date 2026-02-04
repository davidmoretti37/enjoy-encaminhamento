// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  UserCheck,
  UserX,
  Building,
  FileText,
  Calendar,
  Upload,
  X,
  Loader2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  MapPin,
  GraduationCap,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ImportCandidatesModal from "@/components/ImportCandidatesModal";
import { useState } from "react";
import { toast } from "sonner";

// Sub-component to display candidate list inside a batch
function BatchCandidateList({ candidateIds }: { candidateIds: string[] }) {
  // Fetch candidates for this batch
  const allCandidatesQuery = trpc.candidate.getByIds.useQuery(
    { ids: candidateIds },
    { enabled: candidateIds.length > 0 }
  );

  const batchCandidates = allCandidatesQuery.data || [];

  if (allCandidatesQuery.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (batchCandidates.length === 0) {
    return <p className="text-xs text-gray-400 py-2">Nenhum candidato encontrado</p>;
  }

  return (
    <div className="space-y-1">
      {batchCandidates.map((candidate: any) => (
        <div key={candidate.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{candidate.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {candidate.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {candidate.city}
                </span>
              )}
              {candidate.education_level && (
                <span className="flex items-center gap-0.5">
                  <GraduationCap className="h-3 w-3" />
                  {candidate.education_level}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CandidatePage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [smartSearchIds, setSmartSearchIds] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const smartSearchMutation = trpc.candidate.smartSearch.useMutation({
    onSuccess: (results) => {
      if (results.length === 0) {
        toast.info('Nenhum candidato encontrado para essa busca');
        setSmartSearchIds(null);
      } else {
        setSmartSearchIds(new Set(results.map((r: any) => r.candidateId)));
        toast.success(`${results.length} candidato(s) encontrado(s)`);
      }
    },
    onError: () => {
      toast.error('Erro ao realizar busca inteligente');
    },
  });

  const handleSmartSearch = () => {
    if (searchTerm.trim().length >= 3) {
      smartSearchMutation.mutate({ query: searchTerm.trim() });
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSmartSearchIds(null);
  };

  // Determine role capabilities
  const isAffiliate = user?.role === 'admin';
  const isAgency = user?.role === 'agency';
  const isAdmin = isAffiliate;

  // Conditional tRPC queries based on role
  const affiliateCandidatesQuery = trpc.affiliate.getCandidates.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const affiliateApplicationsQuery = trpc.affiliate.getApplications.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );

  const agencyCandidatesQuery = trpc.agency.getCandidates.useQuery(undefined, { enabled: isAgency });

  // Batch queries for Processos Seletivos
  const affiliateBatchesQuery = trpc.batch.getAffiliateBatches.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyBatchesQuery = trpc.batch.getAgencyBatches.useQuery(
    undefined,
    { enabled: isAgency }
  );

  const candidates = isAffiliate ? affiliateCandidatesQuery.data : agencyCandidatesQuery.data;
  const batches = isAffiliate ? affiliateBatchesQuery.data : agencyBatchesQuery.data;
  const refetchCandidates = isAffiliate ? affiliateCandidatesQuery.refetch : agencyCandidatesQuery.refetch;

  const candidatesLoading = affiliateCandidatesQuery.isLoading || agencyCandidatesQuery.isLoading;
  const batchesLoading = affiliateBatchesQuery.isLoading || agencyBatchesQuery.isLoading;

  // Mutations
  const updateCandidateStatusMutation = trpc.candidate.updateStatus.useMutation({
    onSuccess: () => refetchCandidates()
  });

  const isLoading = authLoading || candidatesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !['admin', 'agency'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Handlers
  const handleActivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'active' });
  };

  const handleDeactivate = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'inactive' });
  };

  const handleMarkEmployed = async (candidateId: string) => {
    await updateCandidateStatusMutation.mutateAsync({ id: candidateId, status: 'employed' });
  };

  const getCandidateStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border border-green-200 shadow-none">Ativo</Badge>;
      case 'employed':
        return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 shadow-none">Empregado</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 shadow-none">Inativo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBatchStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Rascunho' },
      sent: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Enviado' },
      unlocked: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Desbloqueado' },
      meeting_scheduled: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Reunião Agendada' },
      completed: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Concluído' },
      cancelled: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelado' },
    };
    const config = configs[status] || { className: 'bg-gray-100 text-gray-600 border-gray-200', label: status };
    return <Badge className={`${config.className} border shadow-none`}>{config.label}</Badge>;
  };

  const getEducationLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'fundamental': 'Fundamental',
      'medio': 'Médio',
      'superior': 'Superior',
      'pos-graduacao': 'Pós-graduação',
      'mestrado': 'Mestrado',
      'doutorado': 'Doutorado'
    };
    return labels[level] || level;
  };

  // Candidate counts
  const activeCount = candidates?.filter((c: any) => c.status === 'active').length || 0;
  const employedCount = candidates?.filter((c: any) => c.status === 'employed').length || 0;
  const inactiveCount = candidates?.filter((c: any) => c.status === 'inactive').length || 0;

  // Batch counts
  const batchCounts = {
    total: batches?.length || 0,
    draft: batches?.filter((b: any) => b.status === 'draft').length || 0,
    sent: batches?.filter((b: any) => b.status === 'sent').length || 0,
    active: batches?.filter((b: any) => ['unlocked', 'meeting_scheduled'].includes(b.status)).length || 0,
    completed: batches?.filter((b: any) => b.status === 'completed').length || 0,
  };

  // Filter candidates
  const filteredCandidates = candidates?.filter((candidate: any) => {
    // Status filter
    if (statusFilter && candidate.status !== statusFilter) return false;
    // AI search active
    if (smartSearchIds) return smartSearchIds.has(candidate.id);
    // Text search
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const email = isAdmin ? candidate.users?.email : candidate.email;
    return (
      candidate.full_name?.toLowerCase().includes(searchLower) ||
      candidate.cpf?.includes(searchTerm) ||
      email?.toLowerCase().includes(searchLower) ||
      candidate.city?.toLowerCase().includes(searchLower) ||
      candidate.agency?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Filter batches
  const filteredBatches = batches?.filter((batch: any) => {
    // Status filter
    if (appStatusFilter) {
      if (appStatusFilter === 'active') {
        if (!['unlocked', 'meeting_scheduled'].includes(batch.status)) return false;
      } else if (batch.status !== appStatusFilter) {
        return false;
      }
    }
    // Text search
    if (!applicationSearchTerm) return true;
    const searchLower = applicationSearchTerm.toLowerCase();
    return (
      batch.company?.company_name?.toLowerCase().includes(searchLower) ||
      batch.job?.title?.toLowerCase().includes(searchLower) ||
      batch.agency?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Status filter badge component
  const FilterBadge = ({ label, count, value, active, onClick }: {
    label: string; count: number; value: string | null; active: boolean; onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? 'bg-gray-900 text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'} px-1.5 py-0 rounded-full text-[10px] font-semibold`}>
        {count}
      </span>
    </button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Candidatos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie candidatos e processos seletivos</p>
          </div>
          {(isAgency || isAffiliate) && (
            <Button onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Candidatos
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar candidatos... (Enter para busca inteligente)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) setSmartSearchIds(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSmartSearch();
              }}
              className="pl-9 pr-10"
            />
            {(searchTerm || smartSearchIds) && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleSmartSearch}
            disabled={smartSearchMutation.isPending || searchTerm.trim().length < 3}
          >
            {smartSearchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          {smartSearchIds && (
            <Badge variant="secondary" className="whitespace-nowrap">
              {smartSearchIds.size} resultado(s)
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profiles" className="space-y-4">
          <TabsList className="bg-gray-100/80 p-1">
            <TabsTrigger value="profiles" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Banco de Talentos
              <span className="text-xs text-gray-500 ml-1">{candidates?.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Processos Seletivos
              <span className="text-xs text-gray-500 ml-1">{batches?.length || 0}</span>
            </TabsTrigger>
          </TabsList>

          {/* PROFILES TAB */}
          <TabsContent value="profiles" className="space-y-4">
            {/* Status filter badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterBadge
                label="Todos"
                count={candidates?.length || 0}
                value={null}
                active={statusFilter === null}
                onClick={() => setStatusFilter(null)}
              />
              <FilterBadge
                label="Ativos"
                count={activeCount}
                value="active"
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
              />
              <FilterBadge
                label="Empregados"
                count={employedCount}
                value="employed"
                active={statusFilter === 'employed'}
                onClick={() => setStatusFilter(statusFilter === 'employed' ? null : 'employed')}
              />
              <FilterBadge
                label="Inativos"
                count={inactiveCount}
                value="inactive"
                active={statusFilter === 'inactive'}
                onClick={() => setStatusFilter(statusFilter === 'inactive' ? null : 'inactive')}
              />
            </div>

            {/* Candidates Table */}
            <Card>
              <CardContent className="p-0">
                {filteredCandidates && filteredCandidates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-medium">Nome</TableHead>
                        <TableHead className="font-medium">Email</TableHead>
                        {isAllAgenciesMode && <TableHead className="font-medium">Escola</TableHead>}
                        <TableHead className="font-medium">Escolaridade</TableHead>
                        <TableHead className="font-medium">Cidade</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Cadastro</TableHead>
                        {isAdmin && <TableHead className="text-right font-medium">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium">{candidate.full_name || 'N/A'}</TableCell>
                          <TableCell className="text-gray-500 text-sm">{(isAdmin ? candidate.users?.email : candidate.email) || 'N/A'}</TableCell>
                          {isAllAgenciesMode && (
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Building className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm">{candidate.agency?.name || 'N/A'}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-sm">{candidate.education_level ? getEducationLevelLabel(candidate.education_level) : 'N/A'}</TableCell>
                          <TableCell className="text-sm">{candidate.city || 'N/A'}</TableCell>
                          <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                          <TableCell className="text-sm text-gray-500">{new Date(candidate.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {candidate.status === 'inactive' && (
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleActivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending} title="Ativar">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {candidate.status === 'active' && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleMarkEmployed(candidate.id)} disabled={updateCandidateStatusMutation.isPending} title="Marcar como empregado">
                                      <UserCheck className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeactivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending} title="Desativar">
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {candidate.status === 'employed' && (
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleActivate(candidate.id)} disabled={updateCandidateStatusMutation.isPending} title="Reativar">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-400 hover:text-gray-600" onClick={() => setSelectedCandidate(candidate.id)} title="Ver detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      {searchTerm || statusFilter ? 'Nenhum candidato encontrado' : 'Nenhum candidato cadastrado'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {searchTerm ? 'Tente ajustar os termos de busca' : statusFilter ? 'Nenhum candidato com esse status' : 'Candidatos aparecerão aqui quando se cadastrarem'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {filteredCandidates && filteredCandidates.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Mostrando {filteredCandidates.length} de {candidates?.length || 0} candidatos
              </p>
            )}
          </TabsContent>

          {/* PROCESSOS SELETIVOS TAB - Groups/Batches */}
          <TabsContent value="applications" className="space-y-4">
            {/* Search + Status filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por empresa ou vaga..."
                  value={applicationSearchTerm}
                  onChange={(e) => setApplicationSearchTerm(e.target.value)}
                  className="pl-9 pr-10"
                />
                {applicationSearchTerm && (
                  <button
                    onClick={() => setApplicationSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <FilterBadge label="Todos" count={batchCounts.total} value={null} active={appStatusFilter === null} onClick={() => setAppStatusFilter(null)} />
                <FilterBadge label="Rascunho" count={batchCounts.draft} value="draft" active={appStatusFilter === 'draft'} onClick={() => setAppStatusFilter(appStatusFilter === 'draft' ? null : 'draft')} />
                <FilterBadge label="Enviado" count={batchCounts.sent} value="sent" active={appStatusFilter === 'sent'} onClick={() => setAppStatusFilter(appStatusFilter === 'sent' ? null : 'sent')} />
                <FilterBadge label="Em andamento" count={batchCounts.active} value="active" active={appStatusFilter === 'active'} onClick={() => setAppStatusFilter(appStatusFilter === 'active' ? null : 'active')} />
                <FilterBadge label="Concluído" count={batchCounts.completed} value="completed" active={appStatusFilter === 'completed'} onClick={() => setAppStatusFilter(appStatusFilter === 'completed' ? null : 'completed')} />
              </div>
            </div>

            {/* Batches/Groups list */}
            {batchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-1" />
                        <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredBatches && filteredBatches.length > 0 ? (
              <div className="space-y-3">
                {filteredBatches.map((batch: any) => {
                  const isExpanded = expandedBatchId === batch.id;
                  const candidateIds = batch.candidate_ids || [];

                  return (
                    <Card
                      key={batch.id}
                      className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md ring-1 ring-blue-200' : 'hover:shadow-sm'}`}
                    >
                      {/* Main row */}
                      <button
                        className="w-full p-4 text-left flex items-center gap-3"
                        onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                      >
                        {/* Company icon */}
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Building className="h-5 w-5 text-gray-500" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">
                              {batch.company?.company_name || 'Empresa'}
                            </p>
                            {getBatchStatusBadge(batch.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {batch.job?.title || 'Vaga'}
                            </span>
                            <span className="text-gray-300">·</span>
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {candidateIds.length} candidato{candidateIds.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              {new Date(batch.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Expand icon */}
                        <div className="shrink-0">
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                          }
                        </div>
                      </button>

                      {/* Expanded - candidate list */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50/50 px-4 py-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Candidatos no Grupo
                          </p>
                          <BatchCandidateList candidateIds={candidateIds} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  {applicationSearchTerm || appStatusFilter ? 'Nenhum grupo encontrado' : 'Nenhum grupo criado'}
                </h3>
                <p className="text-xs text-gray-400">
                  {applicationSearchTerm ? 'Tente ajustar os termos de busca' : 'Grupos aparecerão aqui quando você selecionar candidatos nas vagas'}
                </p>
              </div>
            )}

            {filteredBatches && filteredBatches.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Mostrando {filteredBatches.length} de {batches?.length || 0} grupos
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Modal */}
      {(isAgency || isAffiliate) && (
        <ImportCandidatesModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            refetchCandidates();
          }}
        />
      )}
    </DashboardLayout>
  );
}
