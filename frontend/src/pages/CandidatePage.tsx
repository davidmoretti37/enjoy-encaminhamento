// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import {
  Users, CheckCircle, XCircle, Eye, Search, UserCheck, UserX,
  Building, FileText, Calendar, Upload, X, Loader2, Briefcase,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ImportCandidatesModal from "@/components/ImportCandidatesModal";
import BatchCandidateList from "./candidates/BatchCandidateList";
import ContactInfoModal from "./candidates/ContactInfoModal";
import { useState } from "react";
import { toast } from "sonner";

export default function CandidatePage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, availableAgencies, isAllAgenciesMode } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [smartSearchIds, setSmartSearchIds] = useState<Set<string> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [batchSelections, setBatchSelections] = useState<Record<string, string[]>>({});
  const [contactModalBatchId, setContactModalBatchId] = useState<string | null>(null);

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
  const isAffiliate = user?.role === 'admin' || user?.role === 'super_admin';
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

  const affiliateBatchesQuery = trpc.batch.getAffiliateBatches.useQuery(
    { agencyId: null },
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

  const cancelBatchMutation = trpc.batch.cancelBatch.useMutation({
    onSuccess: () => {
      toast.success("Grupo cancelado com sucesso");
      setBatchToDelete(null);
      affiliateBatchesQuery.refetch();
      agencyBatchesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cancelar grupo");
    }
  });

  const sendBatchMutation = trpc.batch.sendBatchToCompany.useMutation({
    onSuccess: () => {
      toast.success("Grupo enviado para a empresa!");
      setExpandedBatchId(null);
      affiliateBatchesQuery.refetch();
      agencyBatchesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar grupo");
    }
  });

  const handleDeleteBatch = (batchId: string) => setBatchToDelete(batchId);

  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      cancelBatchMutation.mutate({ batchId: batchToDelete });
    }
  };

  const handleSendBatchToCompany = (batchId: string, jobId: string) => {
    const selectedCandidates = batchSelections[batchId] || [];
    if (selectedCandidates.length === 0) {
      toast.error("Selecione pelo menos um candidato");
      return;
    }
    sendBatchMutation.mutate({ batchId, jobId, candidateIds: selectedCandidates, unlockFee: 0 });
  };

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
      case 'active': return <Badge className="bg-green-100 text-green-700 border border-green-200 shadow-none">Ativo</Badge>;
      case 'employed': return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 shadow-none">Empregado</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 shadow-none">Inativo</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBatchStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Ativo' },
      sent: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Enviado' },
      unlocked: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Enviado' },
      meeting_scheduled: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Reunião Agendada' },
      completed: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Concluído' },
      cancelled: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelado' },
    };
    const config = configs[status] || { className: 'bg-gray-100 text-gray-600 border-gray-200', label: status };
    return <Badge className={`${config.className} border shadow-none`}>{config.label}</Badge>;
  };

  const getEducationLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'fundamental': 'Fundamental', 'medio': 'Médio', 'superior': 'Superior',
      'pos-graduacao': 'Pós-graduação', 'mestrado': 'Mestrado', 'doutorado': 'Doutorado'
    };
    return labels[level] || level;
  };

  // Counts
  const activeCount = candidates?.filter((c: any) => c.status === 'active').length || 0;
  const employedCount = candidates?.filter((c: any) => c.status === 'employed').length || 0;
  const inactiveCount = candidates?.filter((c: any) => c.status === 'inactive').length || 0;

  const batchCounts = {
    total: batches?.length || 0,
    ativo: batches?.filter((b: any) => b.status === 'draft').length || 0,
    enviado: batches?.filter((b: any) => b.status === 'unlocked').length || 0,
    active: batches?.filter((b: any) => b.status === 'meeting_scheduled').length || 0,
    completed: batches?.filter((b: any) => b.status === 'completed').length || 0,
    cancelled: batches?.filter((b: any) => b.status === 'cancelled').length || 0,
  };

  // Filter candidates
  const filteredCandidates = candidates?.filter((candidate: any) => {
    if (statusFilter && candidate.status !== statusFilter) return false;
    if (smartSearchIds) return smartSearchIds.has(candidate.id);
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
    if (appStatusFilter) {
      if (appStatusFilter === 'enviado') { if (batch.status !== 'unlocked') return false; }
      else if (appStatusFilter === 'active') { if (batch.status !== 'meeting_scheduled') return false; }
      else if (batch.status !== appStatusFilter) { return false; }
    }
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

  // Candidate table row renderer (shared between grouped and flat views)
  const renderCandidateRow = (candidate: any) => (
    <TableRow key={candidate.id} className="hover:bg-gray-50/50">
      <TableCell className="font-medium">{candidate.full_name || 'N/A'}</TableCell>
      <TableCell className="text-gray-500 text-sm">{(isAdmin ? candidate.users?.email : candidate.email) || 'N/A'}</TableCell>
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
  );

  const tableHeaders = (
    <TableRow className="bg-gray-50/50">
      <TableHead className="font-medium">Nome</TableHead>
      <TableHead className="font-medium">Email</TableHead>
      <TableHead className="font-medium">Escolaridade</TableHead>
      <TableHead className="font-medium">Cidade</TableHead>
      <TableHead className="font-medium">Status</TableHead>
      <TableHead className="font-medium">Cadastro</TableHead>
      {isAdmin && <TableHead className="text-right font-medium">Ações</TableHead>}
    </TableRow>
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
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="default" size="sm" onClick={handleSmartSearch} disabled={smartSearchMutation.isPending || searchTerm.trim().length < 3}>
            {smartSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {smartSearchIds && (
            <Badge variant="secondary" className="whitespace-nowrap">{smartSearchIds.size} resultado(s)</Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profiles" className="space-y-4">
          <TabsList className="bg-gray-100/80 p-1">
            <TabsTrigger value="profiles" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" /> Banco de Talentos
              <span className="text-xs text-gray-500 ml-1">{candidates?.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" /> Processos Seletivos
              <span className="text-xs text-gray-500 ml-1">{batches?.length || 0}</span>
            </TabsTrigger>
          </TabsList>

          {/* PROFILES TAB */}
          <TabsContent value="profiles" className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <FilterBadge label="Todos" count={candidates?.length || 0} value={null} active={statusFilter === null} onClick={() => setStatusFilter(null)} />
              <FilterBadge label="Ativos" count={activeCount} value="active" active={statusFilter === 'active'} onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')} />
              <FilterBadge label="Empregados" count={employedCount} value="employed" active={statusFilter === 'employed'} onClick={() => setStatusFilter(statusFilter === 'employed' ? null : 'employed')} />
              <FilterBadge label="Inativos" count={inactiveCount} value="inactive" active={statusFilter === 'inactive'} onClick={() => setStatusFilter(statusFilter === 'inactive' ? null : 'inactive')} />
            </div>

            {filteredCandidates && filteredCandidates.length > 0 ? (
              isAllAgenciesMode ? (
                <div className="space-y-4">
                  {availableAgencies.map(agency => {
                    const agencyCandidates = filteredCandidates.filter((c: any) => c.agency_id === agency.id);
                    return (
                      <div key={agency.id}>
                        <div className="flex items-center gap-2 py-3 px-3 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold text-gray-700">{agency.name}</span>
                          <span className="text-xs text-gray-400">({agencyCandidates.length})</span>
                        </div>
                        {agencyCandidates.length > 0 ? (
                          <Card className="rounded-t-none">
                            <CardContent className="p-0">
                              <Table>
                                <TableHeader>{tableHeaders}</TableHeader>
                                <TableBody>{agencyCandidates.map(renderCandidateRow)}</TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="rounded-t-none">
                            <CardContent className="py-6 text-center text-sm text-gray-400">Nenhum candidato nesta agência</CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>{tableHeaders}</TableHeader>
                      <TableBody>{filteredCandidates.map(renderCandidateRow)}</TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      {searchTerm || statusFilter ? 'Nenhum candidato encontrado' : 'Nenhum candidato cadastrado'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {searchTerm ? 'Tente ajustar os termos de busca' : statusFilter ? 'Nenhum candidato com esse status' : 'Candidatos aparecerão aqui quando se cadastrarem'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredCandidates && filteredCandidates.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Mostrando {filteredCandidates.length} de {candidates?.length || 0} candidatos
              </p>
            )}
          </TabsContent>

          {/* PROCESSOS SELETIVOS TAB */}
          <TabsContent value="applications" className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar por empresa ou vaga..." value={applicationSearchTerm} onChange={(e) => setApplicationSearchTerm(e.target.value)} className="pl-9 pr-10" />
                {applicationSearchTerm && (
                  <button onClick={() => setApplicationSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <FilterBadge label="Todos" count={batchCounts.total} value={null} active={appStatusFilter === null} onClick={() => setAppStatusFilter(null)} />
                <FilterBadge label="Ativo" count={batchCounts.ativo} value="draft" active={appStatusFilter === 'draft'} onClick={() => setAppStatusFilter(appStatusFilter === 'draft' ? null : 'draft')} />
                <FilterBadge label="Enviado" count={batchCounts.enviado} value="enviado" active={appStatusFilter === 'enviado'} onClick={() => setAppStatusFilter(appStatusFilter === 'enviado' ? null : 'enviado')} />
                <FilterBadge label="Em andamento" count={batchCounts.active} value="active" active={appStatusFilter === 'active'} onClick={() => setAppStatusFilter(appStatusFilter === 'active' ? null : 'active')} />
                <FilterBadge label="Concluído" count={batchCounts.completed} value="completed" active={appStatusFilter === 'completed'} onClick={() => setAppStatusFilter(appStatusFilter === 'completed' ? null : 'completed')} />
                <FilterBadge label="Cancelados" count={batchCounts.cancelled} value="cancelled" active={appStatusFilter === 'cancelled'} onClick={() => setAppStatusFilter(appStatusFilter === 'cancelled' ? null : 'cancelled')} />
              </div>
            </div>

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
                    <Card key={batch.id} className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md ring-1 ring-blue-200' : 'hover:shadow-sm'}`}>
                      <button className="w-full p-4 text-left flex items-center gap-3" onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}>
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Building className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{batch.company?.company_name || 'Empresa'}</p>
                            {getBatchStatusBadge(batch.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{batch.job?.title || 'Vaga'}</span>
                            <span className="text-gray-300">·</span>
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{candidateIds.length} candidato{candidateIds.length !== 1 ? 's' : ''}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{new Date(batch.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-gray-50/50 px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Candidatos no Grupo
                              {batch.status === 'draft' && batchSelections[batch.id]?.length > 0 && (
                                <span className="ml-2 text-blue-600">
                                  ({batchSelections[batch.id].length} selecionado{batchSelections[batch.id].length !== 1 ? 's' : ''})
                                </span>
                              )}
                            </p>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }} disabled={cancelBatchMutation.isPending}>
                              <Trash2 className="h-4 w-4 mr-1" /> Excluir Grupo
                            </Button>
                          </div>
                          <BatchCandidateList
                            candidateIds={candidateIds}
                            selectable={batch.status === 'draft'}
                            selectedIds={batchSelections[batch.id] || []}
                            onSelectionChange={(ids) => setBatchSelections(prev => ({ ...prev, [batch.id]: ids }))}
                          />

                          {batch.status === 'draft' && (
                            <div className="border-t mt-3 pt-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  {(!batchSelections[batch.id]?.length) && (
                                    <p className="text-xs text-amber-600">Selecione os candidatos que deseja enviar para a empresa</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={(e) => { e.stopPropagation(); setContactModalBatchId(batch.id); }} disabled={!batchSelections[batch.id]?.length} className="h-9">
                                    <Calendar className="h-4 w-4 mr-1" /> Fazer Reunião
                                  </Button>
                                  <Button onClick={(e) => { e.stopPropagation(); handleSendBatchToCompany(batch.id, batch.job?.id); }} disabled={sendBatchMutation.isPending || !batchSelections[batch.id]?.length} className="h-9">
                                    {sendBatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    Enviar para Empresa
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
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

      {(isAgency || isAffiliate) && (
        <ImportCandidatesModal open={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={() => refetchCandidates()} />
      )}

      <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBatch} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {cancelBatchMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactInfoModal
        open={!!contactModalBatchId}
        onClose={() => setContactModalBatchId(null)}
        candidateIds={contactModalBatchId ? (batchSelections[contactModalBatchId] || []) : []}
      />
    </DashboardLayout>
  );
}
