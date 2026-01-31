// @ts-nocheck
// Type checking disabled: tRPC type inference issues with mutation input types
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import {
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Settings,
  Ban,
  ChevronDown,
  ChevronRight,
  Video,
  Loader2,
} from "lucide-react";
import { MeetingLoader } from "@/components/ui/MeetingLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import DashboardLayout from "@/components/DashboardLayout";
import EmailComposeModal from "@/components/EmailComposeModal";
import { useState, useEffect } from "react";
import { format, addDays, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function AdminCalendar() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [meetingToReschedule, setMeetingToReschedule] = useState<any>(null);

  // Cancel confirmation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [meetingToCancel, setMeetingToCancel] = useState<any>(null);

  // Settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(30);

  // Time blocking state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [slotToBlock, setSlotToBlock] = useState<{ start: string; end: string } | null>(null);
  const [blockType, setBlockType] = useState<'today' | 'recurring'>('today');

  // Blocker date state (for settings modal) - supports multiple days
  const [blockerSelectedDates, setBlockerSelectedDates] = useState<Date[]>([new Date()]);

  // View mode state
  const [viewMode, setViewMode] = useState<'calendar' | 'status'>('calendar');
  const [daysToShow, setDaysToShow] = useState(7);
  const [customRange, setCustomRange] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [daysPopoverOpen, setDaysPopoverOpen] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [confirmedExpanded, setConfirmedExpanded] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [noShowExpanded, setNoShowExpanded] = useState(false);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // Button loading states
  const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);

  // Full-screen meeting loader state
  const [meetingLoaderState, setMeetingLoaderState] = useState<{
    isLoading: boolean;
    platform: 'zoom' | 'google_meet' | null;
    message: string;
  }>({ isLoading: false, platform: null, message: '' });

  const { data: availability, isLoading: loadingAvailability, refetch: refetchAvailability } =
    trpc.outreach.getAvailability.useQuery();

  // Admin settings
  const { data: adminSettings, refetch: refetchSettings } = trpc.outreach.getAdminSettings.useQuery();

  // Sync meeting duration from admin settings
  useEffect(() => {
    if (adminSettings?.meeting_duration_minutes) {
      setMeetingDuration(adminSettings.meeting_duration_minutes);
    }
  }, [adminSettings]);

  // Get ALL slots for the selected date (for blocking UI - includes past times)
  const { data: daySlots, refetch: refetchDaySlots } = trpc.outreach.getAllSlotsForDate.useQuery(
    { date: format(selectedDate, 'yyyy-MM-dd') },
    {
      enabled: !!user?.id,
      staleTime: 0, // Always consider stale to get fresh data
      refetchOnMount: true,
    }
  );

  // Get slots for the blocker section in settings modal (shows first selected date)
  const { data: blockerSlots, refetch: refetchBlockerSlots } = trpc.outreach.getAllSlotsForDate.useQuery(
    { date: format(blockerSelectedDates[0] || new Date(), 'yyyy-MM-dd') },
    {
      enabled: !!user?.id && settingsModalOpen && blockerSelectedDates.length > 0,
      staleTime: 0, // Always fetch fresh data when modal opens
      refetchOnMount: true,
    }
  );

  const { data: meetings, isLoading: loadingMeetings, refetch: refetchMeetings } =
    trpc.outreach.getMeetings.useQuery({});

  const saveAvailabilityMutation = trpc.outreach.saveAvailability.useMutation({
    onSuccess: () => {
      toast.success("Horário adicionado!");
      refetchAvailability();
      refetchBlockerSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const deleteAvailabilityMutation = trpc.outreach.deleteAvailability.useMutation({
    onSuccess: () => {
      toast.success("Horário removido!");
      refetchAvailability();
      refetchBlockerSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

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

  const rescheduleMeetingMutation = trpc.outreach.rescheduleMeeting.useMutation({
    onSuccess: () => {
      toast.success("Reunião reagendada! Email enviado.");
      refetchMeetings();
      setRescheduleModalOpen(false);
      setMeetingToReschedule(null);
      setRescheduleSlot(null);
    },
    onError: (error) => {
      toast.error(`Erro ao reagendar: ${error.message}`);
    },
  });

  const saveSettingsMutation = trpc.outreach.saveAdminSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      refetchSettings();
      refetchDaySlots();
      refetchBlockerSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const blockSlotMutation = trpc.outreach.blockTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Horário bloqueado!");
      refetchDaySlots();
      refetchBlockerSlots();
      refetchAvailability();
      setBlockModalOpen(false);
      setSlotToBlock(null);
    },
    onError: (error) => {
      toast.error(`Erro ao bloquear: ${error.message}`);
    },
  });

  const unblockSlotMutation = trpc.outreach.unblockTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Horário desbloqueado!");
      refetchDaySlots();
      refetchBlockerSlots();
      refetchAvailability();
    },
    onError: (error) => {
      toast.error(`Erro ao desbloquear: ${error.message}`);
    },
  });

  // Zoom/Google Meet integration mutations
  const createZoomMeetingMutation = trpc.outreach.createZoomMeeting.useMutation({
    onSuccess: (data) => {
      console.log('[Zoom] Success data:', data);
      setMeetingLoaderState({
        isLoading: true,
        platform: 'zoom',
        message: 'Entrando na reunião...',
      });
      toast.success("Reunião Zoom criada! Redirecionando...");
      refetchMeetings();
      // Redirect to Zoom meeting
      if (data?.meetingUrl) {
        console.log('[Zoom] Redirecting to:', data.meetingUrl);
        window.location.href = data.meetingUrl;
      } else {
        console.warn('[Zoom] No meetingUrl in response');
        setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
        toast.error("Link da reunião não foi gerado. Verifique o console.");
      }
    },
    onError: (error) => {
      setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error("Zoom não está configurado. Configure as credenciais no .env");
      } else if (error.data?.code === 'NOT_IMPLEMENTED') {
        toast.info("Integração Zoom em desenvolvimento. Configure as credenciais OAuth primeiro.");
      } else {
        toast.error(`Erro ao criar reunião Zoom: ${error.message}`);
      }
    },
  });

  const createGoogleMeetingMutation = trpc.outreach.createGoogleMeeting.useMutation({
    onSuccess: (data) => {
      console.log('[Google] Success data:', data);
      setMeetingLoaderState({
        isLoading: true,
        platform: 'google_meet',
        message: 'Entrando na reunião...',
      });
      toast.success("Google Meet criado! Redirecionando...");
      refetchMeetings();
      // Redirect to Google Meet
      if (data?.meetingUrl) {
        console.log('[Google] Redirecting to:', data.meetingUrl);
        window.location.href = data.meetingUrl;
      } else {
        console.warn('[Google] No meetingUrl in response');
        setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
        toast.error("Link da reunião não foi gerado. Verifique o console.");
      }
    },
    onError: (error) => {
      setMeetingLoaderState({ isLoading: false, platform: null, message: '' });
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error("Google não está configurado. Configure as credenciais no .env");
      } else if (error.data?.code === 'NOT_IMPLEMENTED') {
        toast.info("Integração Google Meet em desenvolvimento. Configure as credenciais OAuth primeiro.");
      } else {
        toast.error(`Erro ao criar Google Meet: ${error.message}`);
      }
    },
  });

  // Get available slots for reschedule
  const { data: rescheduleSlots } = trpc.outreach.getAvailableSlots.useQuery(
    { adminId: user?.id || '', date: format(rescheduleDate, 'yyyy-MM-dd') },
    { enabled: rescheduleModalOpen && !!user?.id }
  );

  if (authLoading || loadingAvailability || loadingMeetings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
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

  const handleOpenReschedule = (meeting: any) => {
    setMeetingToReschedule(meeting);
    setRescheduleDate(new Date());
    setRescheduleSlot(null);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = () => {
    if (meetingToReschedule && rescheduleSlot) {
      rescheduleMeetingMutation.mutate({
        id: meetingToReschedule.id,
        newScheduledAt: rescheduleSlot,
        sendEmail: true,
      });
    }
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({ meeting_duration_minutes: meetingDuration });
  };

  const handleOpenBlockModal = (slot: { start: string; end: string }) => {
    setSlotToBlock(slot);
    setBlockType('today');
    setBlockModalOpen(true);
  };

  const handleConfirmBlock = () => {
    if (!slotToBlock) return;

    const slotDate = new Date(slotToBlock.start);
    const startTime = format(slotDate, 'HH:mm:ss');
    const endTime = format(new Date(slotToBlock.end), 'HH:mm:ss');

    if (blockType === 'today') {
      blockSlotMutation.mutate({
        startTime,
        endTime,
        specificDate: format(selectedDate, 'yyyy-MM-dd'),
      });
    } else {
      blockSlotMutation.mutate({
        startTime,
        endTime,
        dayOfWeek: selectedDate.getDay(),
      });
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500">Fazer Reunião</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelada</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Aceitou</Badge>;
      case 'no_show':
        return <Badge className="bg-orange-500">Não Aceitou</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get meetings for selected date
  const meetingsForDate = meetings?.filter((m: any) =>
    isSameDay(new Date(m.scheduled_at), selectedDate)
  ) || [];

  // Get upcoming meetings (next 7 days, excluding today)
  const upcomingMeetings = meetings?.filter((m: any) => {
    const meetingDate = new Date(m.scheduled_at);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const nextWeek = addDays(today, 7);
    return meetingDate >= tomorrow && meetingDate <= nextWeek && m.status !== 'cancelled';
  }) || [];

  // Group meetings by status for Status View
  const pendingMeetings = meetings?.filter((m: any) => m.status === 'pending') || [];
  const confirmedMeetings = meetings?.filter((m: any) => m.status === 'confirmed') || [];
  const completedMeetings = meetings?.filter((m: any) => m.status === 'completed') || [];
  const noShowMeetings = meetings?.filter((m: any) => m.status === 'no_show') || [];
  const cancelledMeetings = meetings?.filter((m: any) => m.status === 'cancelled') || [];

  // Helper to render meeting card with actions
  const renderMeetingCard = (meeting: any, showDate: boolean = true) => (
    <div
      key={meeting.id}
      className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
    >
      <div className="space-y-1">
        {showDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(meeting.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {format(new Date(meeting.scheduled_at), "HH:mm")}
          </span>
          {getStatusBadge(meeting.status)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {meeting.company_name || meeting.contact_name || "Empresa"}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          {meeting.company_email}
        </div>
        {meeting.contact_phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            {meeting.contact_phone}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {/* Pending: Show Fazer Reunião and Reagendar */}
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
              onClick={() => handleOpenReschedule(meeting)}
            >
              Reagendar
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
        {/* After meeting link created: Show Aceitou/Nao Aceitou */}
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-blue-600" />
            Agenda
          </h1>
          <Button
            variant="outline"
            onClick={() => setSettingsModalOpen(true)}
            className="gap-2 bg-white hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Button>
        </div>

        {/* Tabs for different views */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'status')} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendário
                </TabsTrigger>
                <TabsTrigger value="status" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Status
                </TabsTrigger>
              </TabsList>
              <Button
                onClick={() => setEmailModalOpen(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" />
                Enviar Email
              </Button>
            </div>

            {viewMode === 'calendar' && (
              <div className="flex items-center gap-2">
                <Popover open={daysPopoverOpen} onOpenChange={setDaysPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {customRange
                        ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}`
                        : `${daysToShow} dias`
                      }
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="space-y-1">
                      {[3, 5, 7, 14, 30].map((days) => (
                        <Button
                          key={days}
                          variant={!customRange && daysToShow === days ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            setDaysToShow(days);
                            setCustomRange(false);
                            setStartDate(new Date());
                            setDaysPopoverOpen(false);
                          }}
                        >
                          {days} dias
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className={customRange ? "border-blue-500 bg-blue-50" : ""}>
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Selecionar período</div>
                      <Calendar
                        mode="range"
                        selected={{ from: startDate, to: endDate }}
                        onSelect={(range) => {
                          if (range?.from) {
                            setStartDate(range.from);
                            setCustomRange(true);
                          }
                          if (range?.to) {
                            setEndDate(range.to);
                          }
                        }}
                        locale={ptBR}
                        className="rounded-md border"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Calendar View - Multiple Days */}
          <TabsContent value="calendar" className="space-y-4">
            {Array.from({ length: customRange ? differenceInDays(endDate, startDate) + 1 : daysToShow }, (_, i) => {
              const date = addDays(customRange ? startDate : new Date(), i);
              const dayMeetings = meetings?.filter((m: any) =>
                isSameDay(new Date(m.scheduled_at), date)
              ) || [];

              return (
                <Card key={i} className="shadow-lg">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl font-bold">{format(date, "dd")}</span>
                        <div>
                          <div className="text-base font-medium">
                            {format(date, "EEEE", { locale: ptBR })}
                          </div>
                          <div className="text-sm text-muted-foreground font-normal">
                            {format(date, "MMMM yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </CardTitle>
                      <Badge variant="outline">
                        {dayMeetings.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  {dayMeetings.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {dayMeetings.map((meeting: any) => renderMeetingCard(meeting, false))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* Status View */}
          <TabsContent value="status" className="space-y-4">
            {/* Pendentes */}
            <Card className="shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setPendingExpanded(!pendingExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    {pendingExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <Clock className="h-5 w-5" />
                    Pendentes
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 ml-2">
                      {pendingMeetings.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              {pendingExpanded && (
                <CardContent className="pt-4">
                  {pendingMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {pendingMeetings.map((meeting: any) => renderMeetingCard(meeting))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Nenhuma reunião pendente</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Fazer Reunião */}
            <Card className="shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setConfirmedExpanded(!confirmedExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    {confirmedExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <Video className="h-5 w-5" />
                    Fazer Reunião
                    <Badge variant="outline" className="bg-green-100 text-green-700 ml-2">
                      {confirmedMeetings.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              {confirmedExpanded && (
                <CardContent className="pt-4">
                  {confirmedMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {confirmedMeetings.map((meeting: any) => renderMeetingCard(meeting))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Nenhuma reunião para fazer</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Aceitaram */}
            <Card className="shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setCompletedExpanded(!completedExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    {completedExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <CheckCircle className="h-5 w-5" />
                    Aceitaram
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 ml-2">
                      {completedMeetings.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              {completedExpanded && (
                <CardContent className="pt-4">
                  {completedMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {completedMeetings.map((meeting: any) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(meeting.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(meeting.scheduled_at), "HH:mm")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              {meeting.company_name || meeting.contact_name || "Empresa"}
                            </div>
                          </div>
                          <Badge className="bg-blue-500">Aceitou</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Nenhuma empresa aceitou ainda</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Não Aceitou */}
            <Card className="shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setNoShowExpanded(!noShowExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    {noShowExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <XCircle className="h-5 w-5" />
                    Não Aceitou
                    <Badge variant="outline" className="bg-orange-100 text-orange-600 ml-2">
                      {noShowMeetings.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              {noShowExpanded && (
                <CardContent className="pt-4">
                  {noShowMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {noShowMeetings.map((meeting: any) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white opacity-75"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(meeting.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(meeting.scheduled_at), "HH:mm")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              {meeting.company_name || meeting.contact_name || "Empresa"}
                            </div>
                          </div>
                          <Badge className="bg-orange-500">Não Aceitou</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Nenhuma empresa recusou</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Canceladas */}
            <Card className="shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => setCancelledExpanded(!cancelledExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-gray-600">
                    {cancelledExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <XCircle className="h-5 w-5" />
                    Canceladas
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 ml-2">
                      {cancelledMeetings.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              {cancelledExpanded && (
                <CardContent className="pt-4">
                  {cancelledMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {cancelledMeetings.map((meeting: any) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white opacity-60"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(meeting.scheduled_at), "dd 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(meeting.scheduled_at), "HH:mm")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              {meeting.company_name || meeting.contact_name || "Empresa"}
                            </div>
                          </div>
                          <Badge variant="destructive">Cancelada</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">Nenhuma reunião cancelada</p>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Reunião</DialogTitle>
            <DialogDescription>
              {meetingToReschedule && (
                <>Reagendar reunião com {meetingToReschedule.company_name || meetingToReschedule.contact_name || 'Empresa'}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Selecione a nova data</Label>
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={(date) => {
                  if (date) {
                    setRescheduleDate(date);
                    setRescheduleSlot(null);
                  }
                }}
                locale={ptBR}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div>
              <Label className="mb-2 block">Selecione o horário</Label>
              {rescheduleSlots && rescheduleSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {rescheduleSlots.map((slot: any) => (
                    <Button
                      key={slot.start}
                      variant={rescheduleSlot === slot.start ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRescheduleSlot(slot.start)}
                    >
                      {format(new Date(slot.start), "HH:mm")}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum horário disponível nesta data
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!rescheduleSlot || rescheduleMeetingMutation.isPending}
            >
              {rescheduleMeetingMutation.isPending ? "Reagendando..." : "Confirmar Reagendamento"}
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
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
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
                      <span className={`w-24 font-medium text-sm ${!isEnabled ? 'text-muted-foreground' : ''}`}>
                        {day.label}
                      </span>
                      <Input
                        type="time"
                        value={dayAvailability?.start_time?.slice(0, 5) || "09:00"}
                        disabled={!isEnabled}
                        onChange={async (e) => {
                          if (dayAvailability) {
                            await deleteAvailabilityMutation.mutateAsync({ id: dayAvailability.id });
                            saveAvailabilityMutation.mutate({
                              dayOfWeek: day.value,
                              startTime: e.target.value,
                              endTime: dayAvailability.end_time?.slice(0, 5) || "17:00",
                              isBlocked: false,
                            });
                          }
                        }}
                        className={`w-28 h-9 ${!isEnabled ? 'opacity-50' : ''}`}
                      />
                      <span className={`text-sm ${!isEnabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>até</span>
                      <Input
                        type="time"
                        value={dayAvailability?.end_time?.slice(0, 5) || "17:00"}
                        disabled={!isEnabled}
                        onChange={async (e) => {
                          if (dayAvailability) {
                            await deleteAvailabilityMutation.mutateAsync({ id: dayAvailability.id });
                            saveAvailabilityMutation.mutate({
                              dayOfWeek: day.value,
                              startTime: dayAvailability.start_time?.slice(0, 5) || "09:00",
                              endTime: e.target.value,
                              isBlocked: false,
                            });
                          }
                        }}
                        className={`w-28 h-9 ${!isEnabled ? 'opacity-50' : ''}`}
                      />
                      {isEnabled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 ml-auto"
                          onClick={() => deleteAvailabilityMutation.mutate({ id: dayAvailability.id })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Block Time Slot Confirmation Modal (for calendar page blocking) */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear Horário</DialogTitle>
            <DialogDescription>
              {slotToBlock && (
                <>Bloquear {format(new Date(slotToBlock.start), "HH:mm")} - {format(new Date(slotToBlock.end), "HH:mm")}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={blockType} onValueChange={(v) => setBlockType(v as 'today' | 'recurring')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="today" />
                <Label htmlFor="today">
                  Apenas hoje ({format(selectedDate, "dd/MM/yyyy")})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="recurring" />
                <Label htmlFor="recurring">
                  Toda {DAYS_OF_WEEK.find(d => d.value === selectedDate.getDay())?.label}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmBlock} disabled={blockSlotMutation.isPending}>
              {blockSlotMutation.isPending ? "Bloqueando..." : "Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Compose Modal */}
      <EmailComposeModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
      />

      {/* Full-screen Meeting Loader */}
      {meetingLoaderState.isLoading && (
        <MeetingLoader
          message={meetingLoaderState.message}
          platform={meetingLoaderState.platform || undefined}
        />
      )}
    </DashboardLayout>
  );
}
