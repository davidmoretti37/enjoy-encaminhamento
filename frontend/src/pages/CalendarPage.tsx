// @ts-nocheck
// Type checking disabled: tRPC type inference issues with useQuery options
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Video,
  CheckCircle,
  XCircle,
  Send,
  Settings,
  Ban,
  Trash2,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { MeetingLoader } from "@/components/ui/MeetingLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import EmailComposeModal from "@/components/EmailComposeModal";
import { useState } from "react";
import { format, addDays, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentAgency, isAllAgenciesMode } = useAgencyContext();
  const [viewMode, setViewMode] = useState<'calendar' | 'status'>('calendar');
  const [daysToShow] = useState(7);
  const [customRange] = useState(false);
  const [startDate] = useState<Date>(new Date());
  const [endDate] = useState<Date>(addDays(new Date(), 7));
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [confirmedExpanded, setConfirmedExpanded] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [noShowExpanded, setNoShowExpanded] = useState(false);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [blockerSelectedDates, setBlockerSelectedDates] = useState<Date[]>([new Date()]);
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  // Meeting action states
  const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [meetingToCancel, setMeetingToCancel] = useState<any>(null);
  const [meetingLoaderState, setMeetingLoaderState] = useState<{
    isLoading: boolean;
    platform: 'zoom' | 'google_meet' | null;
    message: string;
  }>({ isLoading: false, platform: null, message: '' });

  // Detect role
  const isAffiliate = user?.role === 'admin';
  const isAgency = user?.role === 'agency';

  // Separate queries for each role (both called but only one enabled at a time)
  // Pass null explicitly for "All Agencies" mode (currentAgency is null)
  const affiliateMeetingsQuery = trpc.outreach.getMeetings.useQuery(
    { agencyId: currentAgency?.id ?? null },
    { enabled: isAffiliate }
  );
  const agencyMeetingsQuery = trpc.agency.getMeetings.useQuery(
    undefined,
    { enabled: isAgency }
  );

  // Combine results based on role
  const meetings = isAffiliate ? affiliateMeetingsQuery.data : agencyMeetingsQuery.data;
  const loadingMeetings = isAffiliate ? affiliateMeetingsQuery.isLoading : agencyMeetingsQuery.isLoading;
  const refetchMeetings = isAffiliate ? affiliateMeetingsQuery.refetch : agencyMeetingsQuery.refetch;

  // Settings queries
  const { data: availability, refetch: refetchAvailability } = trpc.outreach.getAvailability.useQuery(undefined, {
    enabled: !!user?.id,
  });
  const { data: adminSettings, refetch: refetchSettings } = trpc.outreach.getAdminSettings.useQuery(undefined, {
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (data?.meeting_duration_minutes) {
        setMeetingDuration(data.meeting_duration_minutes);
      }
    },
  });

  // Get slots for the blocker section in settings modal
  const { data: blockerSlots, refetch: refetchBlockerSlots } = trpc.outreach.getAllSlotsForDate.useQuery(
    { date: format(blockerSelectedDates[0] || new Date(), 'yyyy-MM-dd') },
    {
      enabled: !!user?.id && settingsModalOpen && blockerSelectedDates.length > 0,
      staleTime: 0,
      refetchOnMount: true,
    }
  );

  // Settings mutations
  const saveAvailabilityMutation = trpc.outreach.saveAvailability.useMutation({
    onSuccess: () => {
      toast.success("Horário adicionado!");
      refetchAvailability();
      refetchBlockerSlots();
      setSavingDay(null);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
      setSavingDay(null);
    },
  });

  const deleteAvailabilityMutation = trpc.outreach.deleteAvailability.useMutation({
    onSuccess: () => {
      toast.success("Horário removido!");
      refetchAvailability();
      refetchBlockerSlots();
      setSavingDay(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
      setSavingDay(null);
    },
  });

  const saveSettingsMutation = trpc.outreach.saveAdminSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      refetchSettings();
      refetchBlockerSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const blockSlotMutation = trpc.outreach.blockTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Horário bloqueado!");
      refetchBlockerSlots();
      refetchAvailability();
    },
    onError: (error) => {
      toast.error(`Erro ao bloquear: ${error.message}`);
    },
  });

  const unblockSlotMutation = trpc.outreach.unblockTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Horário desbloqueado!");
      refetchBlockerSlots();
      refetchAvailability();
    },
    onError: (error) => {
      toast.error(`Erro ao desbloquear: ${error.message}`);
    },
  });

  // Meeting action mutations
  const updateMeetingStatusMutation = trpc.outreach.updateMeetingStatus.useMutation({
    onSuccess: (_, variables) => {
      setLoadingMeetingId(null);
      setLoadingAction(null);
      if (variables.status === 'confirmed') {
        toast.success("Reunião aceita! Email enviado.");
      } else if (variables.status === 'cancelled') {
        toast.success("Reunião cancelada. Email enviado.");
        setCancelDialogOpen(false);
        setMeetingToCancel(null);
      } else {
        toast.success("Status da reunião atualizado!");
      }
      refetchMeetings();
    },
    onError: (error) => {
      setLoadingMeetingId(null);
      setLoadingAction(null);
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const createZoomMeetingMutation = trpc.outreach.createZoomMeeting.useMutation({
    onSuccess: (data) => {
      setMeetingLoaderState({
        isLoading: true,
        platform: 'zoom',
        message: 'Entrando na reunião...',
      });
      toast.success("Reunião Zoom criada! Redirecionando...");
      refetchMeetings();
      if (data?.meetingUrl) {
        window.location.href = data.meetingUrl;
      } else {
        setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
        toast.error("Link da reunião não foi gerado.");
      }
    },
    onError: (error) => {
      setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error("Zoom não está configurado. Configure as credenciais no .env");
      } else {
        toast.error(`Erro ao criar reunião Zoom: ${error.message}`);
      }
    },
  });

  const createGoogleMeetingMutation = trpc.outreach.createGoogleMeeting.useMutation({
    onSuccess: (data) => {
      setMeetingLoaderState({
        isLoading: true,
        platform: 'google_meet',
        message: 'Entrando na reunião...',
      });
      toast.success("Google Meet criado! Redirecionando...");
      refetchMeetings();
      if (data?.meetingUrl) {
        window.location.href = data.meetingUrl;
      } else {
        setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
        toast.error("Link da reunião não foi gerado.");
      }
    },
    onError: (error) => {
      setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error("Google não está configurado. Configure as credenciais no .env");
      } else {
        toast.error(`Erro ao criar Google Meet: ${error.message}`);
      }
    },
  });

  // Meeting action handlers
  const handleConfirmMeeting = (id: string) => {
    updateMeetingStatusMutation.mutate({ id, status: 'confirmed', sendEmail: true });
  };

  const handleOpenCancelDialog = (meeting: any) => {
    setMeetingToCancel(meeting);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (meetingToCancel) {
      updateMeetingStatusMutation.mutate({
        id: meetingToCancel.id,
        status: 'cancelled',
        cancellationReason: 'Cancelado pelo administrador',
        sendEmail: true,
      });
    }
  };

  const handleCompleteMeeting = (id: string) => {
    updateMeetingStatusMutation.mutate({ id, status: 'completed', sendEmail: false });
  };

  const isLoading = authLoading || loadingMeetings;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'agency')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa ser um administrador ou agência para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', className: 'text-amber-600', bgClassName: 'bg-amber-50' };
      case 'confirmed':
        return { label: 'Fazer Reunião', className: 'text-blue-600', bgClassName: 'bg-blue-50' };
      case 'cancelled':
        return { label: 'Cancelada', className: 'text-gray-500', bgClassName: 'bg-gray-50' };
      case 'completed':
        return { label: 'Concluída', className: 'text-green-600', bgClassName: 'bg-green-50' };
      case 'no_show':
        return { label: 'Não Compareceu', className: 'text-red-600', bgClassName: 'bg-red-50' };
      default:
        return { label: status, className: 'text-gray-600', bgClassName: 'bg-gray-50' };
    }
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({ meeting_duration_minutes: meetingDuration });
  };

  // Handler for blocking/unblocking from blocker modal - applies to ALL selected dates
  const handleBlockerSlotSelect = async (slot: { start: string; end: string; blocked?: boolean }) => {
    const slotDate = new Date(slot.start);
    const startTime = format(slotDate, 'HH:mm:ss');
    const endTime = format(new Date(slot.end), 'HH:mm:ss');

    setBlockingSlot(slot.start);

    try {
      // Block/unblock for all selected dates
      for (const date of blockerSelectedDates) {
        if (slot.blocked) {
          // Unblock the slot
          await unblockSlotMutation.mutateAsync({
            startTime,
            endTime,
            specificDate: format(date, 'yyyy-MM-dd'),
          });
        } else {
          // Block the slot
          await blockSlotMutation.mutateAsync({
            startTime,
            endTime,
            specificDate: format(date, 'yyyy-MM-dd'),
          });
        }
      }
      refetchBlockerSlots();
    } finally {
      setBlockingSlot(null);
    }
  };

  // Group meetings by status for Status View
  const pendingMeetings = meetings?.filter((m: any) => m.status === 'pending') || [];
  const confirmedMeetings = meetings?.filter((m: any) => m.status === 'confirmed') || [];
  const completedMeetings = meetings?.filter((m: any) => m.status === 'completed') || [];
  const noShowMeetings = meetings?.filter((m: any) => m.status === 'no_show') || [];
  const cancelledMeetings = meetings?.filter((m: any) => m.status === 'cancelled') || [];

  // Helper to render meeting card with actions
  const renderMeetingCard = (meeting: any, showDate: boolean = true) => {
    const statusInfo = getStatusInfo(meeting.status);

    return (
    <div
      key={meeting.id}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg ${statusInfo.bgClassName} flex items-center justify-center`}>
          <Clock className={`h-4 w-4 ${statusInfo.className}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {format(new Date(meeting.scheduled_at), "HH:mm")}
            </span>
            <span className={`text-xs ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {meeting.company_name || meeting.contact_name || "Empresa"}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span>{meeting.company_email}</span>
            {meeting.contact_phone && <span>{meeting.contact_phone}</span>}
            {isAllAgenciesMode && meeting.agency_name && (
              <span>{meeting.agency_name}</span>
            )}
          </div>
          {showDate && (
            <div className="text-xs text-gray-400 mt-1">
              {format(new Date(meeting.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {/* Pending: Show Fazer Reunião and Cancelar */}
        {meeting.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="default"
              disabled={loadingMeetingId === meeting.id && loadingAction === 'confirm'}
              onClick={() => {
                setLoadingMeetingId(meeting.id);
                setLoadingAction('confirm');
                handleConfirmMeeting(meeting.id);
              }}
            >
              {loadingMeetingId === meeting.id && loadingAction === 'confirm' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Video className="h-4 w-4 mr-1" />
                  Fazer Reunião
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleOpenCancelDialog(meeting)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </>
        )}
        {/* Confirmed: Show Zoom/Google Meet buttons if no link yet */}
        {meeting.status === 'confirmed' && !meeting.meeting_link && (
          <>
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createZoomMeetingMutation.isPending || createGoogleMeetingMutation.isPending}
              onClick={() => {
                setMeetingLoaderState({
                  isLoading: true,
                  platform: 'zoom',
                  message: 'Criando reunião Zoom...',
                });
                createZoomMeetingMutation.mutate({ meetingId: meeting.id });
              }}
            >
              <Video className="h-4 w-4 mr-1" />
              Zoom
            </Button>
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              disabled={createZoomMeetingMutation.isPending || createGoogleMeetingMutation.isPending}
              onClick={() => {
                setMeetingLoaderState({
                  isLoading: true,
                  platform: 'google_meet',
                  message: 'Criando Google Meet...',
                });
                createGoogleMeetingMutation.mutate({ meetingId: meeting.id });
              }}
            >
              <Video className="h-4 w-4 mr-1" />
              Google Meet
            </Button>
          </>
        )}
        {/* After meeting link created: Show Aceitou/Não Aceitou */}
        {meeting.status === 'confirmed' && meeting.meeting_link && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              disabled={loadingMeetingId === meeting.id && loadingAction === 'complete'}
              onClick={() => {
                setLoadingMeetingId(meeting.id);
                setLoadingAction('complete');
                handleCompleteMeeting(meeting.id);
              }}
            >
              {loadingMeetingId === meeting.id && loadingAction === 'complete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aceitou
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={loadingMeetingId === meeting.id && loadingAction === 'no_show'}
              onClick={() => {
                setLoadingMeetingId(meeting.id);
                setLoadingAction('no_show');
                updateMeetingStatusMutation.mutate({ id: meeting.id, status: 'no_show', sendEmail: false });
              }}
            >
              {loadingMeetingId === meeting.id && loadingAction === 'no_show' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Não Aceitou
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie suas reuniões e horários
            </p>
          </div>
          <div className="flex gap-2">
            {(isAffiliate || isAgency) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setSettingsModalOpen(true)} className="gap-2 text-gray-600">
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
                <Button size="sm" onClick={() => setEmailModalOpen(true)} className="gap-2">
                  <Send className="h-4 w-4" />
                  Novo Email
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'status')} className="space-y-4">
          <TabsList className="bg-gray-100/80 p-1">
            <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Calendário
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Por Status
            </TabsTrigger>
          </TabsList>

          {/* Calendar View - Multiple Days */}
          <TabsContent value="calendar" className="space-y-3">
            {Array.from({ length: customRange ? differenceInDays(endDate, startDate) + 1 : daysToShow }, (_, i) => {
              const date = addDays(customRange ? startDate : new Date(), i);
              const dayMeetings = meetings?.filter((m: any) =>
                isSameDay(new Date(m.scheduled_at), date)
              ) || [];

              return (
                <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-700">{format(date, "dd")}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {format(date, "EEEE", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {format(date, "MMMM yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    {dayMeetings.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {dayMeetings.length} reunião{dayMeetings.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                  {dayMeetings.length > 0 ? (
                    <div className="p-3 space-y-2">
                      {dayMeetings.map((meeting: any) => renderMeetingCard(meeting, false))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Nenhuma reunião
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* Status View */}
          <TabsContent value="status" className="space-y-3">
            {/* Pendentes */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setPendingExpanded(!pendingExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-900">Pendentes</span>
                  <span className="text-sm text-gray-500">{pendingMeetings.length}</span>
                </div>
                {pendingExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {pendingExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-2">
                  {pendingMeetings.length > 0 ? (
                    pendingMeetings.map((meeting: any) => renderMeetingCard(meeting))
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">Nenhuma reunião pendente</p>
                  )}
                </div>
              )}
            </div>

            {/* Fazer Reunião */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setConfirmedExpanded(!confirmedExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Video className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Fazer Reunião</span>
                  <span className="text-sm text-gray-500">{confirmedMeetings.length}</span>
                </div>
                {confirmedExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {confirmedExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-2">
                  {confirmedMeetings.length > 0 ? (
                    confirmedMeetings.map((meeting: any) => renderMeetingCard(meeting))
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">Nenhuma reunião para fazer</p>
                  )}
                </div>
              )}
            </div>

            {/* Concluídas */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setCompletedExpanded(!completedExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">Concluídas</span>
                  <span className="text-sm text-gray-500">{completedMeetings.length}</span>
                </div>
                {completedExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {completedExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-2">
                  {completedMeetings.length > 0 ? (
                    completedMeetings.map((meeting: any) => renderMeetingCard(meeting))
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">Nenhuma empresa aceitou ainda</p>
                  )}
                </div>
              )}
            </div>

            {/* Não Compareceu */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setNoShowExpanded(!noShowExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="font-medium text-gray-900">Não Compareceu</span>
                  <span className="text-sm text-gray-500">{noShowMeetings.length}</span>
                </div>
                {noShowExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {noShowExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-2">
                  {noShowMeetings.length > 0 ? (
                    noShowMeetings.map((meeting: any) => renderMeetingCard(meeting))
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">Nenhuma empresa recusou</p>
                  )}
                </div>
              )}
            </div>

            {/* Canceladas */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setCancelledExpanded(!cancelledExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="font-medium text-gray-900">Canceladas</span>
                  <span className="text-sm text-gray-500">{cancelledMeetings.length}</span>
                </div>
                {cancelledExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {cancelledExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-2">
                  {cancelledMeetings.length > 0 ? (
                    cancelledMeetings.map((meeting: any) => renderMeetingCard(meeting))
                  ) : (
                    <p className="text-center py-6 text-sm text-gray-400">Nenhuma reunião cancelada</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Email Compose Modal for initial company outreach */}
        <EmailComposeModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
        />

        {/* Combined Settings Modal */}
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
          <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[80vh] mt-16 overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Configurações da Agenda</DialogTitle>
              <DialogDescription>
                Gerencie suas preferências, horários e bloqueios
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
              {/* Section 1: Time Blocking */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b pb-2">
                  <Ban className="h-4 w-4" />
                  Bloquear Horários
                </div>
                <div className="flex justify-center">
                  <div className="grid grid-cols-2 gap-12 max-w-3xl w-full">
                    <div className="flex flex-col items-center">
                      <Label className="mb-2 block text-xs font-medium text-slate-600 self-start">Selecione as datas</Label>
                      <Calendar
                        mode="multiple"
                        selected={blockerSelectedDates}
                        onSelect={(dates) => dates && dates.length > 0 && setBlockerSelectedDates(dates)}
                        locale={ptBR}
                        className="rounded-md border"
                      />
                      {blockerSelectedDates.length > 1 && (
                        <p className="text-xs text-blue-600 mt-2">
                          {blockerSelectedDates.length} dias selecionados
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block text-xs font-medium text-slate-600">
                        Horários - {blockerSelectedDates.length === 1
                          ? format(blockerSelectedDates[0], "dd/MM", { locale: ptBR })
                          : `${blockerSelectedDates.length} dias`}
                      </Label>
                      {blockerSlots && blockerSlots.length > 0 ? (
                        <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
                          {blockerSlots.map((slot: any) => {
                            const isLoading = blockingSlot === slot.start;
                            return (
                              <button
                                key={slot.start}
                                onClick={() => handleBlockerSlotSelect(slot)}
                                disabled={isLoading || !!blockingSlot}
                                className={`w-full flex items-center justify-between p-2.5 rounded text-sm transition-colors ${
                                  isLoading
                                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                                    : slot.blocked
                                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                                } ${blockingSlot && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span>
                                  {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                                </span>
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                ) : slot.blocked ? (
                                  <Ban className="h-4 w-4 text-red-500" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground text-sm border rounded-md bg-slate-50">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Configure horários de trabalho primeiro</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Working Hours - Weekly Schedule */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b pb-2">
                  <Clock className="h-4 w-4" />
                  Horários de Trabalho
                </div>
                <div className="space-y-2 pl-6">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvailability = availability?.find(
                      (a: any) => a.day_of_week === day.value && !a.is_blocked
                    );
                    const isEnabled = !!dayAvailability;

                    return (
                      <div
                        key={day.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isEnabled
                            ? 'bg-green-50 border-green-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {savingDay === day.value ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Checkbox
                            checked={isEnabled}
                            disabled={savingDay !== null}
                            onCheckedChange={(checked) => {
                              setSavingDay(day.value);
                              if (checked) {
                                saveAvailabilityMutation.mutate({
                                  dayOfWeek: day.value,
                                  startTime: "09:00",
                                  endTime: "17:00",
                                  isBlocked: false,
                                });
                              } else if (dayAvailability) {
                                deleteAvailabilityMutation.mutate({ id: dayAvailability.id });
                              }
                            }}
                          />
                        )}
                        <span className={`w-24 font-medium text-sm ${!isEnabled ? 'text-muted-foreground' : ''}`}>
                          {day.label}
                        </span>
                        <Input
                          type="time"
                          value={dayAvailability?.start_time?.slice(0, 5) || "09:00"}
                          disabled={!isEnabled || savingDay !== null}
                          onChange={async (e) => {
                            if (dayAvailability) {
                              setSavingDay(day.value);
                              await deleteAvailabilityMutation.mutateAsync({ id: dayAvailability.id });
                              saveAvailabilityMutation.mutate({
                                dayOfWeek: day.value,
                                startTime: e.target.value,
                                endTime: dayAvailability.end_time?.slice(0, 5) || "17:00",
                                isBlocked: false,
                              });
                            }
                          }}
                          className={`w-28 h-9 ${!isEnabled || savingDay === day.value ? 'opacity-50' : ''}`}
                        />
                        <span className={`text-sm ${!isEnabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>até</span>
                        <Input
                          type="time"
                          value={dayAvailability?.end_time?.slice(0, 5) || "17:00"}
                          disabled={!isEnabled || savingDay !== null}
                          onChange={async (e) => {
                            if (dayAvailability) {
                              setSavingDay(day.value);
                              await deleteAvailabilityMutation.mutateAsync({ id: dayAvailability.id });
                              saveAvailabilityMutation.mutate({
                                dayOfWeek: day.value,
                                startTime: dayAvailability.start_time?.slice(0, 5) || "09:00",
                                endTime: e.target.value,
                                isBlocked: false,
                              });
                            }
                          }}
                          className={`w-28 h-9 ${!isEnabled || savingDay === day.value ? 'opacity-50' : ''}`}
                        />
                        {isEnabled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 ml-auto"
                            disabled={savingDay !== null}
                            onClick={() => {
                              setSavingDay(day.value);
                              deleteAvailabilityMutation.mutate({ id: dayAvailability.id });
                            }}
                          >
                            {savingDay === day.value ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Meeting Duration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b pb-2">
                  <Settings className="h-4 w-4" />
                  Duração da Reunião
                </div>
                <div className="space-y-2 pl-6">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="duration"
                      type="number"
                      min={5}
                      max={180}
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(parseInt(e.target.value) || 30)}
                      className="w-28"
                    />
                    <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
                      {saveSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define o intervalo dos horários mostrados para agendamento
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancelar Reunião</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar esta reunião? A empresa será notificada por email.
              </DialogDescription>
            </DialogHeader>

            {meetingToCancel && (
              <div className="py-4 space-y-2 text-sm">
                <p><strong>Empresa:</strong> {meetingToCancel.company_name || 'N/A'}</p>
                <p><strong>Contato:</strong> {meetingToCancel.contact_name || 'N/A'}</p>
                <p><strong>Data:</strong> {format(new Date(meetingToCancel.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Não
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={updateMeetingStatusMutation.isPending}
              >
                {updateMeetingStatusMutation.isPending ? "Cancelando..." : "Sim, Cancelar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Full-screen Meeting Loader */}
        {meetingLoaderState.isLoading && (
          <MeetingLoader
            message={meetingLoaderState.message}
            platform={meetingLoaderState.platform || undefined}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
