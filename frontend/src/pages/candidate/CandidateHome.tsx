// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  FileText,
  Calendar,
  CheckCircle,
  PartyPopper,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";

export default function CandidateHome() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch candidate profile
  const profileQuery = trpc.candidate.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch candidate applications
  const applicationsQuery = trpc.application.getByCandidate.useQuery(undefined, {
    enabled: !!user,
  });

  const isLoading = authLoading || profileQuery.isLoading;
  const profile = profileQuery.data;
  const applications = applicationsQuery.data || [];

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 10;

    if (profile.full_name) completed++;
    if (profile.cpf) completed++;
    if (profile.email) completed++;
    if (profile.phone) completed++;
    if (profile.city) completed++;
    if (profile.state) completed++;
    if (profile.education_level) completed++;
    if (profile.skills && (profile.skills as string[]).length > 0) completed++;
    if (profile.experience && (profile.experience as any[]).length > 0) completed++;
    if (profile.photo_url) completed++;

    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  // Application stats
  const stats = {
    total: applications.length,
    interviews: applications.filter((a: any) => a.status === 'interview-scheduled').length,
    selected: applications.filter((a: any) => a.status === 'selected').length,
  };

  // Determine home state
  const hasPreSelected = applications.some((a: any) => a.status === 'screening');
  const hasInterviewScheduled = applications.some((a: any) => a.status === 'interview-scheduled');
  const isHired = applications.some((a: any) => a.status === 'selected');

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
        {/* Welcome Header - Centered */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {profile?.full_name?.split(' ')[0] || 'Candidato'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Acompanhe suas candidaturas e oportunidades
          </p>
        </div>

        {/* State: Hired - Show celebration */}
        {isHired && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <PartyPopper className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 text-lg">Parabéns! Você foi contratado!</h3>
                  <p className="text-green-700 text-sm">
                    Confira os detalhes em suas candidaturas
                  </p>
                </div>
                <Button onClick={() => setLocation('/candidate/candidaturas')}>
                  Ver Detalhes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* State: Interview Scheduled */}
        {hasInterviewScheduled && !isHired && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900">Você tem entrevista agendada!</h3>
                  <p className="text-blue-700 text-sm">
                    Confira os detalhes e prepare-se para o grande dia
                  </p>
                </div>
                <Button variant="outline" onClick={() => setLocation('/candidate/candidaturas')}>
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* State: Pre-selected */}
        {hasPreSelected && !hasInterviewScheduled && !isHired && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900">Você foi pré-selecionado!</h3>
                  <p className="text-yellow-700 text-sm">
                    Aguarde nosso contato para os próximos passos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {applications.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Candidaturas</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrevistas</p>
                    <p className="text-2xl font-bold">{stats.interviews}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ofertas</p>
                    <p className="text-2xl font-bold">{stats.selected}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty state - no applications yet */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
              <Briefcase className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-1">Nenhuma candidatura ainda</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
              Suas candidaturas e o progresso delas aparecerão aqui
            </p>
            <Button onClick={() => setLocation('/candidate/vagas')}>
              Explorar vagas
            </Button>
          </div>
        )}

        {/* Profile Completion Card - only show if incomplete */}
        {profileCompletion < 100 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seu perfil está {profileCompletion}% completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={profileCompletion} className="h-2 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Falta adicionar:</p>
                <ul className="text-sm space-y-1">
                  {!profile?.full_name && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Nome completo</li>}
                  {!profile?.cpf && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> CPF</li>}
                  {!profile?.email && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Email</li>}
                  {!profile?.phone && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Telefone</li>}
                  {!profile?.city && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Cidade</li>}
                  {!profile?.state && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Estado</li>}
                  {!profile?.education_level && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Escolaridade</li>}
                  {(!profile?.skills || (profile.skills as string[]).length === 0) && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Habilidades</li>}
                  {(!profile?.experience || (profile.experience as any[]).length === 0) && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Experiência profissional</li>}
                  {!profile?.photo_url && <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Foto</li>}
                </ul>
                <Button variant="outline" className="mt-4" onClick={() => setLocation('/candidate/perfil')}>
                  Completar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Applications */}
        {applications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status das suas candidaturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.slice(0, 3).map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{app.jobs?.title || 'Vaga'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {app.jobs?.contract_type} • {app.jobs?.location || 'Local não informado'}
                      </p>
                    </div>
                    <Badge variant={
                      app.status === 'selected' ? 'default' :
                      app.status === 'rejected' ? 'destructive' :
                      'secondary'
                    }>
                      {app.status === 'applied' && 'Em análise'}
                      {app.status === 'screening' && 'Pré-selecionado'}
                      {app.status === 'interview-scheduled' && 'Entrevista agendada'}
                      {app.status === 'interviewed' && 'Entrevista realizada'}
                      {app.status === 'selected' && 'Contratado'}
                      {app.status === 'rejected' && 'Não selecionado'}
                    </Badge>
                  </div>
                ))}
              </div>
              {applications.length > 3 && (
                <Button variant="ghost" className="w-full mt-4" onClick={() => setLocation('/candidate/candidaturas')}>
                  Ver todas as candidaturas
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
