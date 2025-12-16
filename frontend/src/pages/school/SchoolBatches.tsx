import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Users,
  Send,
  Eye,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { toast } from "sonner";

export default function SchoolBatches() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [unlockFee, setUnlockFee] = useState<number>(0);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");

  // Queries
  const { data: jobs, isLoading: jobsLoading } = trpc.job.getBySchool.useQuery();
  const { data: batches, isLoading: batchesLoading } =
    trpc.batch.getSchoolBatches.useQuery();
  const { data: stats } = trpc.batch.getSchoolBatchStats.useQuery();

  // Query for top candidates (only when a job is selected)
  const { data: topCandidates, isLoading: candidatesLoading } =
    trpc.batch.getTopCandidatesForJob.useQuery(
      {
        jobId: selectedJobId!,
        limit: 15,
        minScore: 50,
      },
      {
        enabled: !!selectedJobId,
      }
    );

  // Mutations
  const sendBatchMutation = trpc.batch.sendBatchToCompany.useMutation({
    onSuccess: () => {
      toast.success("Lote enviado para empresa com sucesso!");
      setShowSendDialog(false);
      setSelectedJobId(null);
      setSelectedCandidates([]);
      setUnlockFee(0);
      utils.batch.getSchoolBatches.invalidate();
      utils.batch.getSchoolBatchStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar lote: ${error.message}`);
    },
  });

  const scheduleMeetingMutation = trpc.batch.scheduleBatchMeeting.useMutation({
    onSuccess: () => {
      toast.success("Reunião agendada com sucesso!");
      utils.batch.getSchoolBatches.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao agendar reunião: ${error.message}`);
    },
  });

  // Handlers
  const handleToggleCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (!topCandidates?.matches) return;
    const allIds = topCandidates.matches.map((m: any) => m.candidate_id);
    setSelectedCandidates(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCandidates([]);
  };

  const handleSendBatch = async () => {
    if (selectedCandidates.length < 5) {
      toast.error("Selecione pelo menos 5 candidatos");
      return;
    }
    if (unlockFee <= 0) {
      toast.error("Defina uma taxa de desbloqueio válida");
      return;
    }
    if (!selectedJobId) return;

    await sendBatchMutation.mutateAsync({
      jobId: selectedJobId,
      candidateIds: selectedCandidates,
      unlockFee,
    });
  };

  // Render helpers
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      sent: { label: "Enviado", variant: "default" },
      unlocked: { label: "Desbloqueado", variant: "success" },
      meeting_scheduled: { label: "Reunião Agendada", variant: "info" },
      completed: { label: "Concluído", variant: "success" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      estagio: "Estágio",
      clt: "CLT",
      "menor-aprendiz": "Jovem Aprendiz",
    };
    return labels[type] || type;
  };

  if (!user || user.role !== "school") {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa ser uma escola para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vagas e Candidatos</h1>
            <p className="text-gray-500 mt-1">
              Gerencie candidatos e envie pré-seleções para empresas
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.draft}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviados</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desbloqueados</CardTitle>
                <Unlock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unlocked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {stats.totalRevenue?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="jobs">Criar Pré-Seleção</TabsTrigger>
            <TabsTrigger value="batches">Lotes Enviados</TabsTrigger>
          </TabsList>

          {/* Tab: Create Pre-Selection */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selecione uma Vaga</CardTitle>
                <CardDescription>
                  Escolha uma vaga para ver os candidatos mais qualificados pela IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex justify-center py-8">
                    <ClassicLoader />
                  </div>
                ) : jobs && jobs.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {jobs.map((job: any) => (
                      <Card
                        key={job.id}
                        className={`cursor-pointer transition-all ${
                          selectedJobId === job.id
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:border-blue-300"
                        }`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{job.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {getContractTypeLabel(job.contract_type)}
                              </CardDescription>
                            </div>
                            <Badge>{job.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.openings} vagas</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Nenhuma vaga encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 15 Candidates */}
            {selectedJobId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top 15 Candidatos (IA)</CardTitle>
                      <CardDescription>
                        Candidatos mais qualificados encontrados pela inteligência artificial
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                      >
                        Limpar Seleção
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {candidatesLoading ? (
                    <div className="flex justify-center py-8">
                      <ClassicLoader />
                    </div>
                  ) : topCandidates?.matches && topCandidates.matches.length > 0 ? (
                    <>
                      <div className="space-y-3 mb-4">
                        {topCandidates.matches.map((match: any, idx: number) => (
                          <div
                            key={match.candidate_id}
                            className={`border rounded-lg p-4 transition-all ${
                              selectedCandidates.includes(match.candidate_id)
                                ? "border-blue-500 bg-blue-50"
                                : "hover:border-gray-400"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <Checkbox
                                checked={selectedCandidates.includes(match.candidate_id)}
                                onCheckedChange={() =>
                                  handleToggleCandidate(match.candidate_id)
                                }
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <div className="font-semibold">
                                      #{idx + 1} - {match.candidate?.full_name || "Candidato"}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {match.candidate?.email}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                      Score: {Math.round(match.composite_score)}
                                    </Badge>
                                    <Badge
                                      variant={
                                        match.recommendation === "HIGHLY_RECOMMENDED"
                                          ? "success"
                                          : "default"
                                      }
                                    >
                                      {match.recommendation}
                                    </Badge>
                                  </div>
                                </div>
                                {match.match_reasoning && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {match.match_reasoning}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Send Button */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          {selectedCandidates.length} de {topCandidates.matches.length}{" "}
                          candidatos selecionados
                          {selectedCandidates.length < 5 && (
                            <span className="text-orange-600 ml-2">
                              (mínimo 5 candidatos)
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={() => setShowSendDialog(true)}
                          disabled={selectedCandidates.length < 5}
                          size="lg"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar para Empresa
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Nenhum candidato qualificado encontrado para esta vaga</p>
                      <p className="text-sm mt-1">
                        Tente ajustar os requisitos da vaga ou aguarde mais candidatos
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Sent Batches */}
          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lotes Enviados</CardTitle>
                <CardDescription>
                  Histórico de pré-seleções enviadas para empresas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <div className="flex justify-center py-8">
                    <ClassicLoader />
                  </div>
                ) : batches && batches.length > 0 ? (
                  <div className="space-y-3">
                    {batches.map((batch: any) => (
                      <Card key={batch.id} className="hover:border-gray-400">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{batch.job?.title}</h4>
                              <p className="text-sm text-gray-500">
                                {batch.company?.company_name || "Empresa"}
                              </p>
                            </div>
                            {getStatusBadge(batch.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Candidatos</div>
                              <div className="font-medium">{batch.batch_size}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Taxa</div>
                              <div className="font-medium">
                                R$ {batch.unlock_fee?.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Pagamento</div>
                              <div className="font-medium">
                                {batch.payment_status === "paid" ? (
                                  <span className="text-green-600">Pago</span>
                                ) : (
                                  <span className="text-orange-600">Pendente</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Enviado em</div>
                              <div className="font-medium">
                                {batch.sent_at
                                  ? new Date(batch.sent_at).toLocaleDateString("pt-BR")
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Send className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Nenhum lote enviado ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Send Batch Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Pré-Seleção para Empresa</DialogTitle>
              <DialogDescription>
                Defina a taxa de desbloqueio que a empresa deverá pagar para visualizar os
                candidatos selecionados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="unlock-fee">Taxa de Desbloqueio (R$)</Label>
                <Input
                  id="unlock-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unlockFee}
                  onChange={(e) => setUnlockFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A empresa pagará esta taxa para desbloquear a lista de{" "}
                  {selectedCandidates.length} candidatos
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendBatch}
                disabled={sendBatchMutation.isPending || unlockFee <= 0}
              >
                {sendBatchMutation.isPending ? "Enviando..." : "Enviar Lote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
