import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ContentTransition from "@/components/ui/ContentTransition";
import { PageHeaderSkeleton, SearchBarSkeleton, ListSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  UserCheck,
  Users,
  Calendar,
  GraduationCap,
  Clock,
  FileText,
  Eye
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CompanySelection() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string[]>>({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedBatchCandidates, setSelectedBatchCandidates] = useState<string[]>([]);
  const [contractsModalOpen, setContractsModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Existing presentations query
  const { data: presentations, isLoading } = trpc.company.getPresentedCandidates.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  // Batch query - get all batches with full candidate details
  const { data: companyBatches, isLoading: batchesLoading } = trpc.batch.getCompanyBatches.useQuery(
    undefined,
    { enabled: !!user && user.role === 'company' }
  );

  const { data: batchContracts, isLoading: contractsLoading } = trpc.batch.getBatchContracts.useQuery(
    { batchId: selectedBatchId! },
    { enabled: !!selectedBatchId && contractsModalOpen }
  );

  const { data: candidateProfile, isLoading: profileLoading } = trpc.company.getCandidateProfile.useQuery(
    { candidateId: selectedCandidateId! },
    { enabled: !!selectedCandidateId && profileModalOpen }
  );

  const selectCandidatesMutation = trpc.company.selectCandidatesForInterview.useMutation({
    onSuccess: () => {
      toast.success('Seleção confirmada! Entraremos em contato para agendar as entrevistas.');
      utils.company.getPresentedCandidates.invalidate();
      setSelectedCandidates({});
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao confirmar seleção');
    },
  });

  const selectBatchCandidatesMutation = trpc.batch.selectCandidatesForInterview.useMutation({
    onSuccess: () => {
      toast.success('Candidatos selecionados com sucesso! Entraremos em contato para agendar.');
      utils.batch.getCompanyBatches.invalidate();
      setSelectedBatchCandidates([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao selecionar candidatos');
    },
  });

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

  const handleToggleCandidate = (presentationId: string, candidateId: string) => {
    setSelectedCandidates(prev => {
      const current = prev[presentationId] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [presentationId]: current.filter(id => id !== candidateId) };
      }
      return { ...prev, [presentationId]: [...current, candidateId] };
    });
  };

  const handleViewProfile = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setProfileModalOpen(true);
  };

  const handleConfirmSelection = (presentationId: string) => {
    const candidateIds = selectedCandidates[presentationId] || [];
    if (candidateIds.length === 0) {
      toast.error('Selecione pelo menos um candidato');
      return;
    }

    selectCandidatesMutation.mutate({ presentationId, candidateIds });
  };

  // Filter presentations that need selection (have candidates but not all selected yet)
  const pendingPresentations = presentations?.filter((p: any) =>
    p.candidates.length > 0 && p.candidates.some((c: any) => !c.selected)
  ) || [];

  const completedPresentations = presentations?.filter((p: any) =>
    p.candidates.length > 0 && p.candidates.every((c: any) => c.selected)
  ) || [];

  // Mini card component for empty state - BIGGER size
  const MiniCard = ({ className = "" }: { className?: string }) => (
    <div className={`w-20 h-28 border border-gray-200 rounded-xl bg-white flex flex-col items-center pt-3 gap-1.5 shadow-sm ${className}`}>
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="w-12 h-2 bg-gray-200 rounded" />
      <div className="w-14 h-2 bg-gray-100 rounded" />
    </div>
  );

  // Get current step from first job if exists (for progress display)
  const currentStep = 1; // Default to first step when no candidates

  // Empty state when no presentations and no batches
  const hasBatches = companyBatches && companyBatches.length > 0;
  const hasPresentations = presentations && presentations.length > 0;

  if (!isLoading && !batchesLoading && !hasBatches && !hasPresentations) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header - Centered */}
          <div className="text-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
            <p className="text-gray-500 mt-1">Selecione os candidatos que deseja entrevistar</p>
          </div>

          {/* Minimalist empty state */}
          <div className="flex flex-col items-center justify-center py-16">
            {/* Single profile card silhouette with subtle pulse */}
            <div className="relative mb-8">
              <style>{`
                @keyframes subtle-pulse {
                  0%, 100% { opacity: 0.6; transform: scale(1); }
                  50% { opacity: 0.8; transform: scale(1.02); }
                }
              `}</style>
              <div
                className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-3"
                style={{ animation: 'subtle-pulse 3s ease-in-out infinite' }}
              >
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 bg-gray-100" />
                {/* Name placeholder */}
                <div className="w-16 h-2 bg-gray-200 rounded" />
                {/* Details placeholder */}
                <div className="w-20 h-2 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                Estamos procurando seu candidato
              </h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Os candidatos aparecerão aqui após a visita de apresentação à sua empresa
              </p>
            </div>

            {/* Simple progress indicator */}
            <div className="mt-10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
              <span className="text-sm text-gray-500">Buscando candidatos...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered like other pages */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-500 mt-1">Selecione os candidatos que deseja entrevistar</p>
        </div>

        <ContentTransition
          isLoading={isLoading || batchesLoading}
          skeleton={<><PageHeaderSkeleton /><SearchBarSkeleton /><ListSkeleton count={4} /></>}
        >
          <>
            {/* BATCHES - Candidates sent by agency */}
            {companyBatches && companyBatches.length > 0 && (
              <div className="space-y-6">
                {companyBatches.map((batch: any) => (
                  <Card key={batch.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <CardTitle>{batch.job?.title}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{batch.job?.contract_type}</Badge>
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {batch.agency?.name}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        {batch.candidates?.length || 0} candidatos selecionados pela agência
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {batch.candidates?.map((candidate: any) => (
                        <Card key={candidate.id} className="hover:border-gray-400 transition-colors">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={selectedBatchCandidates.includes(candidate.id)}
                                onCheckedChange={() => {
                                  setSelectedBatchCandidates(prev =>
                                    prev.includes(candidate.id)
                                      ? prev.filter(id => id !== candidate.id)
                                      : [...prev, candidate.id]
                                  );
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold">{candidate.full_name}</h4>
                                    <p className="text-sm text-gray-500">{candidate.email}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidateId(candidate.id);
                                      setProfileModalOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Perfil
                                  </Button>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  {candidate.available_for_internship && (
                                    <Badge variant="secondary">Estágio</Badge>
                                  )}
                                  {candidate.available_for_clt && (
                                    <Badge variant="secondary">CLT</Badge>
                                  )}
                                  {candidate.available_for_apprentice && (
                                    <Badge variant="secondary">Jovem Aprendiz</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          {selectedBatchCandidates.length} candidatos selecionados
                        </div>
                        <Button
                          onClick={() => {
                            if (selectedBatchCandidates.length === 0) {
                              toast.error('Selecione pelo menos um candidato');
                              return;
                            }
                            selectBatchCandidatesMutation.mutate({
                              batchId: batch.id,
                              candidateIds: selectedBatchCandidates
                            });
                          }}
                          disabled={selectedBatchCandidates.length === 0 || selectBatchCandidatesMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Selecionar para Entrevista
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Contracts Modal */}
            <Dialog open={contractsModalOpen} onOpenChange={setContractsModalOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Modelos de Contrato</DialogTitle>
                  <DialogDescription>
                    Contratos disponíveis para os tipos de funcionários neste lote
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {contractsLoading ? (
                    <div className="space-y-4 py-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  ) : batchContracts?.contracts && batchContracts.contracts.length > 0 ? (
                    <div className="space-y-4">
                      {batchContracts.contracts.map((contract: any) => (
                        <Card key={contract.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {contract.employee_type === 'estagio' && 'Estágio'}
                              {contract.employee_type === 'clt' && 'CLT'}
                              {contract.employee_type === 'menor-aprendiz' && 'Jovem Aprendiz'}
                            </CardTitle>
                            <CardDescription>
                              Pagamento: {contract.payment_frequency === 'one_time' ? 'Único' : 'Recorrente'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {contract.contract_pdf_url ? (
                              <a
                                href={contract.contract_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                <FileText className="h-4 w-4 inline mr-2" />
                                Visualizar Contrato PDF
                              </a>
                            ) : contract.contract_html ? (
                              <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: contract.contract_html }}
                              />
                            ) : (
                              <p className="text-gray-500">Nenhum contrato disponível</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Nenhum contrato configurado
                    </p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Pending Selections */}
            {pendingPresentations.map((presentation: any) => (
              <Card key={presentation.presentationId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{presentation.jobTitle}</CardTitle>
                      <CardDescription>
                        Apresentados em {presentation.completedAt && format(new Date(presentation.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando seleção
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Selecione os candidatos que deseja entrevistar:
                  </p>
                  <div className="space-y-3">
                    {presentation.candidates.map((candidate: any) => {
                      const isSelected = (selectedCandidates[presentation.presentationId] || []).includes(candidate.id);
                      return (
                        <div
                          key={candidate.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleCandidate(presentation.presentationId, candidate.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {candidate.age && `${candidate.age} anos`} {candidate.city && `• ${candidate.city}`}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewProfile(candidate.id)}
                                >
                                  Ver Perfil
                                </Button>
                              </div>
                              {candidate.education && (
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                  <GraduationCap className="h-4 w-4" />
                                  {candidate.education}
                                </p>
                              )}
                              {candidate.skills && candidate.skills.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {candidate.skills.slice(0, 5).map((skill: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <span className="text-gray-600">
                      {(selectedCandidates[presentation.presentationId] || []).length} candidato{(selectedCandidates[presentation.presentationId] || []).length !== 1 ? 's' : ''} selecionado{(selectedCandidates[presentation.presentationId] || []).length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      onClick={() => handleConfirmSelection(presentation.presentationId)}
                      disabled={(selectedCandidates[presentation.presentationId] || []).length === 0 || selectCandidatesMutation.isPending}
                    >
                      {selectCandidatesMutation.isPending ? 'Confirmando...' : 'Confirmar Seleção e Agendar Entrevistas'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Completed Selections */}
            {completedPresentations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-600">Seleções Concluídas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {completedPresentations.map((presentation: any) => (
                    <div key={presentation.presentationId} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{presentation.jobTitle}</h4>
                      <p className="text-sm text-gray-500">
                        {presentation.candidates.filter((c: any) => c.selected).length} candidatos selecionados para entrevista
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        </ContentTransition>

        {/* Profile Modal */}
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{candidateProfile?.name || 'Perfil do Candidato'}</DialogTitle>
              <DialogDescription>
                {candidateProfile?.age && `${candidateProfile.age} anos`} {candidateProfile?.city && `• ${candidateProfile.city}`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {profileLoading ? (
                <div className="py-8 space-y-4 px-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-28" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : candidateProfile ? (
                <div className="space-y-4 py-4">
                  {candidateProfile.education && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Formação
                      </h4>
                      <p className="text-gray-600">{candidateProfile.education}</p>
                    </div>
                  )}
                  {candidateProfile.skills && candidateProfile.skills.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Habilidades</h4>
                      <div className="flex gap-2 flex-wrap">
                        {candidateProfile.skills.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {candidateProfile.experience && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Experiência</h4>
                      <p className="text-gray-600">{candidateProfile.experience}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">Perfil não encontrado</p>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
