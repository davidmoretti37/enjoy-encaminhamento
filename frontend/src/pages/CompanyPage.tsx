import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Clock,
  Check,
  CheckCircle,
  Send,
  GraduationCap,
  FileText,
  Briefcase,
  Upload,
  Search,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import CompanyDetailModal from "@/components/CompanyDetailModal";
import CompanyDocumentsModal from "@/components/CompanyDocumentsModal";
import CompanyJobsModal from "@/components/CompanyJobsModal";
import ImportCompaniesModal from "@/components/ImportCompaniesModal";
import SendCompanyInviteButton from "@/components/SendCompanyInviteButton";

interface Meeting {
  id: string;
  company_name: string | null;
  company_email: string;
  contact_name: string | null;
  contact_phone: string | null;
  scheduled_at: string;
  status: string;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  contract_signer_name: string | null;
  agency_name?: string | null;
  _isDirectSignup?: boolean; // Flag for companies that registered directly
}

// Stepper progress indicator for batch workflow
function BatchProgressIndicator({ status }: { status: string }) {
  const steps = [
    { id: 'draft', label: 'Rascunho' },
    { id: 'sent', label: 'Enviado' },
    { id: 'unlocked', label: 'Andamento' },
    { id: 'completed', label: 'Concluído' },
  ];

  const statusMap: Record<string, number> = {
    draft: 0,
    sent: 1,
    unlocked: 2,
    meeting_scheduled: 2,
    completed: 3,
  };

  const currentIndex = statusMap[status] ?? 0;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-all
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              <span
                className={`
                  text-[10px] mt-1 whitespace-nowrap
                  ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`
                  w-8 h-0.5 mx-1 -mt-4 transition-colors
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [, setLocation] = useLocation();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [documentsMeeting, setDocumentsMeeting] = useState<Meeting | null>(null);
  const [jobsMeeting, setJobsMeeting] = useState<Meeting | null>(null);
  const [sendingMeetingId, setSendingMeetingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'empresas' | 'status'>('empresas');
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [smartSearchIds, setSmartSearchIds] = useState<Set<string> | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const smartSearchMutation = trpc.company.smartSearch.useMutation({
    onSuccess: (results) => {
      if (results.length === 0) {
        toast.info('Nenhuma empresa encontrada para essa busca');
        setSmartSearchIds(null);
      } else {
        setSmartSearchIds(new Set(results.map((r: any) => r.companyId)));
        toast.success(`${results.length} empresa(s) encontrada(s)`);
      }
    },
    onError: () => {
      toast.error('Erro ao realizar busca inteligente');
    },
  });

  const handleSearch = () => {
    if (searchTerm.trim().length >= 3) {
      smartSearchMutation.mutate({ query: searchTerm.trim() });
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSmartSearchIds(null);
  };

  // Detect role
  const isAffiliate = user?.role === 'admin';
  const isAgency = user?.role === 'agency';

  // Separate queries for each role (both called but only one enabled at a time)
  // Pass null explicitly for "All Agencies" mode (currentAgency is null)
  const affiliateMeetingsQuery = trpc.outreach.getMeetings.useQuery(
    { status: "completed", agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyMeetingsQuery = trpc.agency.getMeetings.useQuery(
    undefined,
    { enabled: isAgency }
  );

  // Also fetch companies that registered directly (not through outreach)
  // Use different queries for agency vs affiliate
  const agencyDirectCompaniesQuery = trpc.agency.getCompanies.useQuery(
    undefined,
    { enabled: isAgency }
  );
  const affiliateDirectCompaniesQuery = trpc.affiliate.getCompanies.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );

  // Combine results based on role
  const meetings = isAffiliate ? affiliateMeetingsQuery.data : agencyMeetingsQuery.data;
  const directCompanies = isAffiliate
    ? (affiliateDirectCompaniesQuery.data || [])
    : (agencyDirectCompaniesQuery.data || []);
  const isLoading = isAffiliate
    ? (affiliateMeetingsQuery.isLoading || affiliateDirectCompaniesQuery.isLoading)
    : (agencyMeetingsQuery.isLoading || agencyDirectCompaniesQuery.isLoading);
  const refetch = () => {
    if (isAffiliate) {
      affiliateMeetingsQuery.refetch();
      affiliateDirectCompaniesQuery.refetch();
    } else {
      agencyMeetingsQuery.refetch();
      agencyDirectCompaniesQuery.refetch();
    }
  };

  // Debug logging
  console.log('[CompanyPage] Role:', user?.role, 'isAgency:', isAgency, 'isAffiliate:', isAffiliate);
  console.log('[CompanyPage] Meetings:', meetings?.length, meetings);
  console.log('[CompanyPage] Direct companies:', directCompanies?.length, directCompanies);

  // Filter to only completed meetings for this page
  const completedMeetingsData = meetings?.filter((m: any) => m.status === 'completed') || meetings;

  // Query all forms for this admin to check form status - filtered by agency context
  const { data: forms } = trpc.outreach.getAllCompanyForms.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate || isAgency }
  );

  // Query batches for progress indicators
  const { data: allBatches } = trpc.batch.getAgencyBatches.useQuery(
    {},
    { enabled: isAffiliate || isAgency }
  );

  // Group batches by company_id for quick lookup
  const batchesByCompany = useMemo(() => {
    const map = new Map<string, any[]>();
    allBatches?.forEach((batch: any) => {
      const companyId = batch.company_id;
      if (!map.has(companyId)) {
        map.set(companyId, []);
      }
      map.get(companyId)!.push(batch);
    });
    return map;
  }, [allBatches]);

  // Create a map of email -> form for quick lookup
  const formsByEmail = useMemo(() => {
    const map = new Map<string, boolean>();
    forms?.forEach((form: any) => {
      map.set(form.email, true);
    });
    return map;
  }, [forms]);

  // Send contract mutation
  const sendMutation = trpc.outreach.acceptCompany.useMutation({
    onSuccess: (data) => {
      if (data.formFilled) {
        toast.success("Contrato enviado com sucesso!");
      } else {
        toast.success("Formulario + contrato enviado!");
      }
      refetch();
      setSendingMeetingId(null);
      setSelectedMeeting(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setSendingMeetingId(null);
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || !user.role || !['admin', 'agency'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSend = (meetingId: string) => {
    setSendingMeetingId(meetingId);
    sendMutation.mutate({ meetingId });
  };

  const handleCardClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  // Completed companies from outreach (form + contract signed)
  const completedFromOutreach = (meetings || []).filter((m: Meeting) => m.contract_signed_at);

  // Companies that registered directly (not through outreach)
  // Convert to Meeting-like format for consistent rendering
  const directCompaniesAsMeetings: Meeting[] = directCompanies
    .filter((c: any) => c.status === 'active' || c.status === 'pending') // Active or pending companies
    .filter((c: any) => {
      // Exclude companies that already have a meeting record
      const hasOutreachRecord = meetings?.some((m: Meeting) =>
        m.company_email === c.email || m.company_name === c.company_name
      );
      return !hasOutreachRecord;
    })
    .map((c: any) => ({
      id: c.id,
      company_name: c.company_name || c.business_name,
      company_email: c.email || '',
      contact_name: c.contact_name || null,
      contact_phone: c.phone || null,
      scheduled_at: c.created_at,
      status: 'completed',
      contract_sent_at: c.created_at, // Mark as completed since they signed up directly
      contract_signed_at: c.created_at, // Mark as completed
      contract_signer_name: c.contact_name || null,
      agency_name: null,
      _isDirectSignup: true, // Flag to identify direct signups
    }));

  // Merge outreach and direct signup companies
  const allCompletedCompanies = [...completedFromOutreach, ...directCompaniesAsMeetings];

  // Apply search filtering
  const completedCompanies = allCompletedCompanies.filter((meeting: Meeting) => {
    // AI search active: filter by matching IDs
    if (smartSearchIds) {
      return smartSearchIds.has(meeting.id);
    }
    // Text search
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      meeting.company_name?.toLowerCase().includes(s) ||
      meeting.contact_name?.toLowerCase().includes(s) ||
      meeting.company_email?.toLowerCase().includes(s)
    );
  });

  // Waiting on us - contract not sent yet
  const waitingOnUs = (meetings || []).filter((m: Meeting) =>
    !m.contract_sent_at && m.status === 'completed'
  );

  // Waiting on them - contract sent, waiting for completion
  const waitingOnThem = (meetings || []).filter((m: Meeting) =>
    m.contract_sent_at && !m.contract_signed_at
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie contratos das empresas parceiras
            </p>
          </div>
          {(isAffiliate || isAgency) && (
            <Button onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Empresas
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar empresas... (Enter para busca inteligente)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) {
                  setSmartSearchIds(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
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
            onClick={handleSearch}
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
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'empresas' | 'status')} className="space-y-4">
          <TabsList className="bg-gray-100/80 p-1">
            <TabsTrigger value="empresas" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Parceiras
              {completedCompanies.length > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  {completedCompanies.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Em Andamento
              {(waitingOnUs.length + waitingOnThem.length) > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  {waitingOnUs.length + waitingOnThem.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Empresas View - Completed Companies */}
          <TabsContent value="empresas">
            {completedCompanies.length > 0 ? (
              <div className="space-y-2">
                {completedCompanies.map((meeting: Meeting) => {
                  const companyBatches = batchesByCompany.get(meeting.id) || [];
                  const hasBatches = companyBatches.length > 0;
                  const isExpanded = expandedCompanyId === meeting.id;

                  return (
                    <div
                      key={meeting.id}
                      className="bg-white rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Arrow toggle for batch progress */}
                          {hasBatches ? (
                            <button
                              onClick={() => setExpandedCompanyId(isExpanded ? null : meeting.id)}
                              className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6" /> // Spacer for alignment
                          )}
                          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Building className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {meeting.company_name || "Empresa sem nome"}
                            </span>
                            {meeting.contact_name && (
                              <p className="text-sm text-gray-500">{meeting.contact_name}</p>
                            )}
                            {isAllAgenciesMode && meeting.agency_name && (
                              <p className="text-xs text-gray-400">{meeting.agency_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Show invite button for imported companies */}
                          {meeting._isDirectSignup && (
                            <SendCompanyInviteButton companyId={meeting.id} />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600 border-gray-300 hover:bg-gray-50"
                            onClick={() => setDocumentsMeeting(meeting)}
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            Documentos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600 border-gray-300 hover:bg-gray-50"
                            onClick={() => setLocation(`/agency/job-descriptions/${meeting.id}`)}
                          >
                            <Briefcase className="h-4 w-4 mr-1.5" />
                            Descrição da Vaga
                          </Button>
                        </div>
                      </div>

                      {/* Expanded batch progress section */}
                      {isExpanded && hasBatches && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                          <div className="ml-9 mt-3 space-y-3">
                            {companyBatches.map((batch: any) => (
                              <div
                                key={batch.id}
                                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700 truncate mb-2">
                                      {batch.job?.title || "Vaga sem título"}
                                    </p>
                                    <BatchProgressIndicator status={batch.status} />
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {batch.batch_size} candidato{batch.batch_size !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Building className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma empresa parceira ainda</p>
              </div>
            )}
          </TabsContent>

          {/* Status View - In Progress */}
          <TabsContent value="status">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Aguardando Nos */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  Aguardando envio
                  <span className="text-xs text-gray-400">{waitingOnUs.length}</span>
                </h3>
                {waitingOnUs.length > 0 ? (
                  <div className="space-y-2">
                    {waitingOnUs.map((meeting: Meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                        onClick={() => handleCardClick(meeting)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Send className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                {meeting.company_name || "Empresa sem nome"}
                              </span>
                              {meeting.contact_name && (
                                <p className="text-sm text-gray-500">{meeting.contact_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAllAgenciesMode && meeting.agency_name && (
                          <p className="text-xs text-gray-400 mt-2 ml-12">{meeting.agency_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">Nenhuma pendente</p>
                  </div>
                )}
              </div>

              {/* Aguardando Eles */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  Aguardando resposta
                  <span className="text-xs text-gray-400">{waitingOnThem.length}</span>
                </h3>
                {waitingOnThem.length > 0 ? (
                  <div className="space-y-2">
                    {waitingOnThem.map((meeting: Meeting) => (
                      <div
                        key={meeting.id}
                        className="p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                        onClick={() => handleCardClick(meeting)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                {meeting.company_name || "Empresa sem nome"}
                              </span>
                              {meeting.contact_name && (
                                <p className="text-sm text-gray-500">{meeting.contact_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAllAgenciesMode && meeting.agency_name && (
                          <p className="text-xs text-gray-400 mt-2 ml-12">{meeting.agency_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">Nenhuma pendente</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Company Detail Modal */}
        <CompanyDetailModal
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onSend={handleSend}
          isSending={sendingMeetingId === selectedMeeting?.id}
        />

        {/* Company Documents Modal */}
        <CompanyDocumentsModal
          meeting={documentsMeeting}
          open={!!documentsMeeting}
          onClose={() => setDocumentsMeeting(null)}
        />

        {/* Company Jobs Modal */}
        <CompanyJobsModal
          meeting={jobsMeeting}
          open={!!jobsMeeting}
          onClose={() => setJobsMeeting(null)}
        />

        {/* Import Companies Modal */}
        <ImportCompaniesModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
