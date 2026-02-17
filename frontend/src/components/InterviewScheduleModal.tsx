import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Video, Building2, Loader2, Clock } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface InterviewScheduleModalProps {
  open: boolean;
  onClose: () => void;
  batchId: string;
  jobId: string;
  candidateIds: string[];
  companyAddress?: {
    address: string | null;
    city: string | null;
    state: string | null;
  };
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

  // Filter out past times for today
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return ALL_TIME_OPTIONS.filter((timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    // Add 30 min buffer - can't schedule for right now
    if (hour > currentHour) return true;
    if (hour === currentHour && minute > currentMinute + 30) return true;
    return false;
  });
}

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
];

export function InterviewScheduleModal({
  open,
  onClose,
  batchId,
  jobId,
  candidateIds,
  companyAddress,
  onSuccess,
}: InterviewScheduleModalProps) {
  const [interviewType, setInterviewType] = useState<"online" | "in_person">("online");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [locationStreet, setLocationStreet] = useState(companyAddress?.address || "");
  const [locationNumber, setLocationNumber] = useState("");
  const [locationComplement, setLocationComplement] = useState("");
  const [locationNeighborhood, setLocationNeighborhood] = useState("");
  const [locationCity, setLocationCity] = useState(companyAddress?.city || "");
  const [locationState, setLocationState] = useState(companyAddress?.state || "");
  const [locationZip, setLocationZip] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const scheduleInterviewMutation = trpc.interview.scheduleInterview.useMutation({
    onSuccess: async () => {
      toast.success(`Entrevista agendada!`);
      // Wait for data to refresh before closing so the next step has fresh data
      await Promise.all([
        utils.interview.getCompanyInterviews.invalidate(),
        utils.batch.getUnlockedBatches.invalidate(),
        utils.company.getJobs.invalidate(),
      ]);
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao agendar entrevista");
    },
  });

  const resetForm = () => {
    setInterviewType("online");
    setSelectedDate(undefined);
    setTime("10:00");
    setDuration("30");
    setLocationStreet(companyAddress?.address || "");
    setLocationNumber("");
    setLocationComplement("");
    setLocationNeighborhood("");
    setLocationCity(companyAddress?.city || "");
    setLocationState(companyAddress?.state || "");
    setLocationZip("");
    setLocationNotes("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    if (interviewType === "in_person" && !locationStreet) {
      toast.error("Informe o endereço");
      return;
    }

    // Build full address string
    let fullAddress = locationStreet;
    if (locationNumber) fullAddress += `, ${locationNumber}`;
    if (locationComplement) fullAddress += ` - ${locationComplement}`;
    if (locationNeighborhood) fullAddress += `, ${locationNeighborhood}`;
    if (locationZip) fullAddress += ` - CEP ${locationZip}`;

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    scheduleInterviewMutation.mutate({
      batchId,
      jobId,
      candidateIds,
      interviewType,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: parseInt(duration),
      locationAddress: interviewType === "in_person" ? fullAddress : undefined,
      locationCity: interviewType === "in_person" ? locationCity : undefined,
      locationState: interviewType === "in_person" ? locationState : undefined,
      locationNotes: interviewType === "in_person" ? locationNotes : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Entrevista</DialogTitle>
          <DialogDescription>
            {candidateIds.length} candidato{candidateIds.length > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Interview Type - Compact Toggle */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                interviewType === "online"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => setInterviewType("online")}
            >
              <Video className="h-4 w-4" />
              Online
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                interviewType === "in_person"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => setInterviewType("in_person")}
            >
              <Building2 className="h-4 w-4" />
              Presencial
            </button>
          </div>

          {/* Date, Time, Duration - Same Row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Date */}
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
                    // Reset time if current selection is no longer valid
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

            {/* Time */}
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

            {/* Duration */}
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

          {/* Online Info */}
          {interviewType === "online" && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Video className="h-3.5 w-3.5 inline mr-1.5" />
              Link Jitsi Meet será gerado automaticamente
            </div>
          )}

          {/* In-Person Location */}
          {interviewType === "in_person" && (
            <div className="space-y-2">
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={locationStreet}
                  onChange={(e) => setLocationStreet(e.target.value)}
                  placeholder="Rua / Avenida"
                  className="pl-8 h-9"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={locationNumber}
                  onChange={(e) => setLocationNumber(e.target.value)}
                  placeholder="Número"
                  className="h-9"
                />
                <Input
                  value={locationComplement}
                  onChange={(e) => setLocationComplement(e.target.value)}
                  placeholder="Complemento"
                  className="col-span-2 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={locationNeighborhood}
                  onChange={(e) => setLocationNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="h-9"
                />
                <Input
                  value={locationZip}
                  onChange={(e) => setLocationZip(e.target.value)}
                  placeholder="CEP"
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="Cidade"
                  className="col-span-2 h-9"
                />
                <Input
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* Notes - Collapsible/Optional */}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
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
            disabled={scheduleInterviewMutation.isPending || !selectedDate}
          >
            {scheduleInterviewMutation.isPending ? (
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
