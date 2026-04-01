import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Loader2, Clock, Video, MapPin, Users, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AgencyScheduleModalProps {
  open: boolean;
  onClose: () => void;
  batchId: string;
  candidateIds: string[];
  candidateNames: string[];
  onSuccess: () => void;
}

const ALL_TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00"
];

function getAvailableTimeOptions(selectedDate: Date | undefined): string[] {
  if (!selectedDate) return ALL_TIME_OPTIONS;

  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();

  if (!isToday) return ALL_TIME_OPTIONS;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return ALL_TIME_OPTIONS.filter((timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    if (hour > currentHour) return true;
    if (hour === currentHour && minute > currentMinute + 30) return true;
    return false;
  });
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  if (newH >= 24) return "23:30";
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
];

export function AgencyScheduleModal({
  open,
  onClose,
  batchId,
  candidateIds,
  candidateNames,
  onSuccess,
}: AgencyScheduleModalProps) {
  const [interviewType, setInterviewType] = useState<"online" | "in_person">("online");
  const [sessionFormat, setSessionFormat] = useState<"group" | "individual">("group");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [candidateTimes, setCandidateTimes] = useState<Record<string, string>>({});

  const candidateCount = candidateIds.length;
  const showPerCandidate = sessionFormat === "individual" && candidateCount > 1;

  // Auto-stagger candidate times when start time or duration changes
  useEffect(() => {
    if (showPerCandidate) {
      const durationMin = parseInt(duration);
      const newTimes: Record<string, string> = {};
      candidateIds.forEach((id, i) => {
        newTimes[id] = addMinutesToTime(time, durationMin * i);
      });
      setCandidateTimes(newTimes);
    }
  }, [time, duration, sessionFormat, candidateIds.join(",")]);

  const scheduleMutation = trpc.batch.schedulePreSelectionSessions.useMutation({
    onSuccess: () => {
      toast.success("Reuniao agendada! Os candidatos foram notificados.");
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao agendar reuniao");
    },
  });

  const resetForm = () => {
    setInterviewType("online");
    setSessionFormat("group");
    setSelectedDate(undefined);
    setTime("10:00");
    setDuration("30");
    setLocationAddress("");
    setLocationCity("");
    setLocationState("");
    setMeetingLink("");
    setNotes("");
    setCandidateTimes({});
  };

  const handleSubmit = () => {
    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    if (interviewType === "in_person" && !locationAddress.trim()) {
      toast.error("Informe o endereco para reuniao presencial");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    // Build per-candidate schedules for individual format
    let candidateSchedules: { candidateId: string; scheduledAt: string }[] | undefined;
    if (showPerCandidate) {
      candidateSchedules = candidateIds.map((id) => {
        const t = candidateTimes[id] || time;
        const [h, m] = t.split(":").map(Number);
        const dt = new Date(selectedDate);
        dt.setHours(h, m, 0, 0);
        return { candidateId: id, scheduledAt: dt.toISOString() };
      });
    }

    scheduleMutation.mutate({
      batchId,
      candidateIds,
      interviewType,
      sessionFormat,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: parseInt(duration),
      locationAddress: interviewType === "in_person" ? locationAddress : undefined,
      locationCity: interviewType === "in_person" ? locationCity : undefined,
      locationState: interviewType === "in_person" ? locationState : undefined,
      meetingLink: interviewType === "online" && meetingLink.trim() ? meetingLink.trim() : undefined,
      notes: notes || undefined,
      candidateSchedules,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Reuniao</DialogTitle>
          <DialogDescription>
            {candidateCount} candidato{candidateCount > 1 ? "s" : ""} selecionado{candidateCount > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate names preview */}
          {candidateNames.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Candidatos:</p>
              <div className="flex flex-wrap gap-1">
                {candidateNames.slice(0, 5).map((name, i) => (
                  <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {name}
                  </span>
                ))}
                {candidateNames.length > 5 && (
                  <span className="text-xs text-slate-500 px-1 py-0.5">
                    +{candidateNames.length - 5} mais
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Meeting Type: Online / Presencial */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo de Reuniao</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInterviewType("online")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  interviewType === "online"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Video className="w-4 h-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => setInterviewType("in_person")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  interviewType === "in_person"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <MapPin className="w-4 h-4" />
                Presencial
              </button>
            </div>
          </div>

          {/* Session Format: Grupo / Individual */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Formato</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSessionFormat("group")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  sessionFormat === "group"
                    ? "border-[#0A2342] bg-[#0A2342]/5 text-[#0A2342]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Users className="w-4 h-4" />
                Grupo
              </button>
              <button
                type="button"
                onClick={() => setSessionFormat("individual")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  sessionFormat === "individual"
                    ? "border-[#0A2342] bg-[#0A2342]/5 text-[#0A2342]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <User className="w-4 h-4" />
                Individual
              </button>
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div className={showPerCandidate ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal h-9",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) {
                      const availableTimes = getAvailableTimeOptions(date);
                      if (!availableTimes.includes(time) && availableTimes.length > 0) {
                        setTime(availableTimes[0]);
                      }
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {!showPerCandidate && (
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-9">
                  <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTimeOptions(selectedDate).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Per-candidate time slots for individual + multiple candidates */}
          {showPerCandidate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Horarios individuais</label>
                <span className="text-xs text-slate-400">Inicio: </span>
              </div>
              {/* Start time selector */}
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-8 text-xs">
                  <Clock className="mr-1.5 h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground mr-1">Inicio:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTimeOptions(selectedDate).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                {candidateIds.map((id, i) => (
                  <div key={id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-slate-700 truncate max-w-[200px]">
                      {candidateNames[i] || `Candidato ${i + 1}`}
                    </span>
                    <Select
                      value={candidateTimes[id] || time}
                      onValueChange={(val) =>
                        setCandidateTimes((prev) => ({ ...prev, [id]: val }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location fields for in-person */}
          {interviewType === "in_person" && (
            <div className="space-y-2">
              <Input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Endereco *"
                className="h-9 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="Cidade"
                  className="h-9 text-sm"
                />
                <Input
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                  placeholder="Estado (UF)"
                  maxLength={2}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Meeting link for online */}
          {interviewType === "online" && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Link da Reunião</label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... ou zoom.us/..."
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observacoes (opcional)"
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={scheduleMutation.isPending || !selectedDate}
          >
            {scheduleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Agendar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
