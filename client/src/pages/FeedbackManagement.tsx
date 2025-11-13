import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgentContext } from "@/hooks/useAgentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import {
  MessageSquare,
  Loader2,
  CheckCircle,
  Star,
  Search,
  ArrowLeft,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useLocation } from "wouter";

export default function FeedbackManagement() {
  useAgentContext('feedbacks');
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: feedbacks, isLoading, refetch } = trpc.admin.getAllFeedback.useQuery();
  const updateStatusMutation = trpc.admin.updateFeedbackStatus.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleMarkSubmitted = async (feedbackId: string) => {
    await updateStatusMutation.mutateAsync({ id: feedbackId, status: 'submitted' });
  };

  const handleMarkReviewed = async (feedbackId: string) => {
    await updateStatusMutation.mutateAsync({ id: feedbackId, status: 'reviewed' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reviewed':
        return <Badge className="bg-green-500">Revisado</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500">Submetido</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderStarRating = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  const calculateAverageRating = (feedback: any) => {
    const ratings = [
      feedback.performance_rating,
      feedback.punctuality_rating,
      feedback.communication_rating,
      feedback.teamwork_rating,
      feedback.technical_skills_rating,
    ].filter(r => r !== null);

    if (ratings.length === 0) return null;
    return Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10;
  };

  // Calculate summary statistics
  const totalFeedbacks = feedbacks?.length || 0;
  const pendingFeedbacks = feedbacks?.filter((f: any) => f.status === 'pending').length || 0;
  const submittedFeedbacks = feedbacks?.filter((f: any) => f.status === 'submitted').length || 0;
  const reviewedFeedbacks = feedbacks?.filter((f: any) => f.status === 'reviewed').length || 0;
  const requiresReplacement = feedbacks?.filter((f: any) => f.requires_replacement === true).length || 0;

  // Filter feedbacks based on search term
  const filteredFeedbacks = feedbacks?.filter((feedback: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      feedback.contracts?.companies?.company_name?.toLowerCase().includes(searchLower) ||
      feedback.candidates?.full_name?.toLowerCase().includes(searchLower) ||
      feedback.contracts?.contract_number?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white shadow-lg border border-slate-800">
          <div className="relative">
            <h1 className="text-4xl font-semibold flex items-center gap-3 mb-2">
              <MessageSquare className="h-10 w-10" />
              Gerenciamento de Feedback
            </h1>
            <p className="text-slate-300 text-lg">
              Monitorar avaliações de desempenho e feedback de candidatos
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-amber-200 bg-amber-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-amber-900">{pendingFeedbacks}</div>
              <p className="text-xs text-amber-600">Aguardando submissão</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Submetidos</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-blue-900">{submittedFeedbacks}</div>
              <p className="text-xs text-blue-600">Aguardando revisão</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Requerem Substituição</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1 text-red-900">{requiresReplacement}</div>
              <p className="text-xs text-red-600">Atenção necessária</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-600" />
              <CardTitle>Buscar Feedbacks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa, candidato ou contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feedbacks Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle>Todos os Feedbacks</CardTitle>
                <CardDescription>Lista completa de avaliações de desempenho</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFeedbacks && filteredFeedbacks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Avaliação Média</TableHead>
                    <TableHead>Recomendação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback: any) => {
                    const avgRating = calculateAverageRating(feedback);
                    return (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">{feedback.contracts?.companies?.company_name || 'N/A'}</TableCell>
                        <TableCell>{feedback.candidates?.full_name || 'N/A'}</TableCell>
                        <TableCell>{feedback.contracts?.contract_number || 'N/A'}</TableCell>
                        <TableCell>
                          {feedback.review_month && feedback.review_year
                            ? `${feedback.review_month}/${feedback.review_year}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {avgRating ? renderStarRating(Math.round(avgRating)) : '-'}
                        </TableCell>
                        <TableCell>
                          {feedback.recommend_continuation === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : feedback.recommend_continuation ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-sm">Continuar</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-sm">Não Continuar</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {feedback.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleMarkSubmitted(feedback.id)}
                                disabled={updateStatusMutation.isLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marcar Submetido
                              </Button>
                            )}
                            {feedback.status === 'submitted' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleMarkReviewed(feedback.id)}
                                disabled={updateStatusMutation.isLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marcar Revisado
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum feedback encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Feedbacks aparecerão aqui quando forem criados'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
