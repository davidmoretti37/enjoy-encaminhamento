import { useState, useEffect } from "react";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  Video,
  Calendar,
  Check,
  Loader2,
  Save,
  Building2,
  MapPin,
  Clock,
  MessageSquare,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion } from "framer-motion";

const DAYS = [
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const TIME_OPTIONS = (() => {
  const times: string[] = [];
  for (let h = 7; h <= 21; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21) times.push(`${String(h).padStart(2, "0")}:30`);
  }
  return times;
})();

export default function StepPreferencia() {
  const { selectedJob, selectedJobId, refreshData } = useCompanyFunnel();

  if (!selectedJob) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma vaga selecionada</h3>
        <p className="text-slate-500 max-w-sm">Selecione uma vaga para configurar a preferência de entrevista</p>
      </div>
    );
  }

  return <PreferenceForm selectedJob={selectedJob} selectedJobId={selectedJobId!} refreshData={refreshData} />;
}

function PreferenceForm({
  selectedJob,
  selectedJobId,
  refreshData,
}: {
  selectedJob: any;
  selectedJobId: string;
  refreshData: () => void;
}) {
  const { companyProfile } = useCompanyFunnel();

  // Fall back to company profile address when job-specific fields are empty
  const fallback = (jobField: string | undefined | null, companyField: string | undefined | null) =>
    jobField || companyField || "";

  const [preferenceType, setPreferenceType] = useState<"online" | "in_person">(
    selectedJob.preferred_interview_type || "in_person"
  );
  const [cep, setCep] = useState(fallback(selectedJob.interview_location_cep, companyProfile?.postal_code));
  const [address, setAddress] = useState(fallback(selectedJob.interview_location_address, companyProfile?.address));
  const [number, setNumber] = useState(fallback(selectedJob.interview_location_number, companyProfile?.number));
  const [complement, setComplement] = useState(fallback(selectedJob.interview_location_complement, companyProfile?.complement));
  const [neighborhood, setNeighborhood] = useState(fallback(selectedJob.interview_location_neighborhood, companyProfile?.neighborhood));
  const [city, setCity] = useState(fallback(selectedJob.interview_location_city, companyProfile?.city));
  const [state, setState] = useState(fallback(selectedJob.interview_location_state, companyProfile?.state));
  const [preferredDays, setPreferredDays] = useState<string[]>(selectedJob.preferred_days || []);
  const [timeStart, setTimeStart] = useState(selectedJob.preferred_time_start || "");
  const [timeEnd, setTimeEnd] = useState(selectedJob.preferred_time_end || "");
  const [schedulingNotes, setSchedulingNotes] = useState(selectedJob.scheduling_notes || "");
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Reset form when job changes — fall back to company profile for address
  useEffect(() => {
    setPreferenceType(selectedJob.preferred_interview_type || "in_person");
    setCep(fallback(selectedJob.interview_location_cep, companyProfile?.postal_code));
    setAddress(fallback(selectedJob.interview_location_address, companyProfile?.address));
    setNumber(fallback(selectedJob.interview_location_number, companyProfile?.number));
    setComplement(fallback(selectedJob.interview_location_complement, companyProfile?.complement));
    setNeighborhood(fallback(selectedJob.interview_location_neighborhood, companyProfile?.neighborhood));
    setCity(fallback(selectedJob.interview_location_city, companyProfile?.city));
    setState(fallback(selectedJob.interview_location_state, companyProfile?.state));
    setPreferredDays(selectedJob.preferred_days || []);
    setTimeStart(selectedJob.preferred_time_start || "");
    setTimeEnd(selectedJob.preferred_time_end || "");
    setSchedulingNotes(selectedJob.scheduling_notes || "");
    setSaved(false);
  }, [selectedJob, companyProfile]);

  // CEP auto-fill via ViaCEP
  const handleCepChange = async (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
        }
      } catch {
        // Silently fail — user can fill manually
      } finally {
        setCepLoading(false);
      }
    }
  };

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const setPreferenceMutation = trpc.job.setInterviewPreference.useMutation({
    onSuccess: () => {
      toast.success("Preferência salva! Avançando para a próxima etapa...");
      setSaved(true);
      refreshData();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar preferência");
    },
  });

  const handleSave = () => {
    setPreferenceMutation.mutate({
      jobId: selectedJobId,
      preferredInterviewType: preferenceType,
      ...(preferenceType === "in_person" && {
        locationCep: cep || undefined,
        locationAddress: address || undefined,
        locationNumber: number || undefined,
        locationComplement: complement || undefined,
        locationNeighborhood: neighborhood || undefined,
        locationCity: city || undefined,
        locationState: state || undefined,
      }),
      preferredDays: preferredDays.length > 0 ? preferredDays : undefined,
      preferredTimeStart: timeStart || undefined,
      preferredTimeEnd: timeEnd || undefined,
      schedulingNotes: schedulingNotes || undefined,
    });
  };

  const alreadySaved = !!selectedJob.preferred_interview_type;

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 focus:border-[#0A2342]";

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <CardEntrance>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-[#0A2342]">
                Como você quer entrevistar os candidatos?
              </h4>
              <p className="text-slate-500 text-sm">
                Vaga: <span className="font-medium text-[#0A2342]">{selectedJob.title}</span>
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Nossa agência vai buscar, pré-selecionar e agendar as entrevistas com os
            melhores candidatos para você. Informe suas preferências de formato,
            disponibilidade e horários para que possamos organizar tudo da melhor forma.
          </p>
        </div>
      </CardEntrance>

      {/* Preference form */}
      <CardEntrance delay={0.05}>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Type toggle */}
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">
            Formato da Entrevista
          </label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setPreferenceType("online")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                preferenceType === "online"
                  ? "border-[#0A2342] bg-[#0A2342]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Video
                className={`w-5 h-5 ${
                  preferenceType === "online" ? "text-[#0A2342]" : "text-slate-400"
                }`}
              />
              <div className="text-left">
                <p
                  className={`font-medium text-sm ${
                    preferenceType === "online" ? "text-[#0A2342]" : "text-slate-600"
                  }`}
                >
                  Online
                </p>
                <p className="text-xs text-slate-400">Videoconferência</p>
              </div>
              {preferenceType === "online" && (
                <Check className="w-4 h-4 text-[#0A2342] ml-auto" />
              )}
            </button>

            <button
              onClick={() => setPreferenceType("in_person")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                preferenceType === "in_person"
                  ? "border-[#0A2342] bg-[#0A2342]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Building2
                className={`w-5 h-5 ${
                  preferenceType === "in_person" ? "text-[#0A2342]" : "text-slate-400"
                }`}
              />
              <div className="text-left">
                <p
                  className={`font-medium text-sm ${
                    preferenceType === "in_person" ? "text-[#0A2342]" : "text-slate-600"
                  }`}
                >
                  Presencial
                </p>
                <p className="text-xs text-slate-400">No local da empresa</p>
              </div>
              {preferenceType === "in_person" && (
                <Check className="w-4 h-4 text-[#0A2342] ml-auto" />
              )}
            </button>
          </div>

          {/* Full address fields (only for in_person) */}
          {preferenceType === "in_person" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 mb-6"
            >
              {/* CEP */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className={inputClass}
                  />
                  {cepLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Rua */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Rua / Logradouro</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Avenida, etc."
                  className={inputClass}
                />
              </div>

              {/* Número + Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="123"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Complemento</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Sala, andar, bloco"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className={inputClass}
                />
              </div>

              {/* Cidade + Estado */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 my-6" />

          {/* Scheduling preferences */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#FF6B35]" />
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Disponibilidade para Entrevistas
              </label>
            </div>

            {/* Day picker */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                Dias da semana disponíveis
              </label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day) => {
                  const isSelected = preferredDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      onClick={() => toggleDay(day.key)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-[#0A2342] bg-[#0A2342] text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time range */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                Horário preferido
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className={`${inputClass} w-auto min-w-[110px]`}
                >
                  <option value="">Das</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-slate-400 text-sm font-medium">até</span>
                <select
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className={`${inputClass} w-auto min-w-[110px]`}
                >
                  <option value="">Até</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <label className="text-xs font-medium text-slate-500">
                  Observações adicionais
                </label>
              </div>
              <textarea
                value={schedulingNotes}
                onChange={(e) => setSchedulingNotes(e.target.value)}
                placeholder="Ex: Evitar segundas-feiras, preferência por horários da manhã, disponível apenas nas semanas pares..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-6" />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={setPreferenceMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2342] text-white font-medium text-sm hover:bg-[#0A2342]/90 transition-colors w-full justify-center disabled:opacity-60"
          >
            {setPreferenceMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {setPreferenceMutation.isPending
              ? "Salvando..."
              : saved
              ? "Salvo!"
              : alreadySaved
              ? "Atualizar Preferência"
              : "Salvar e Continuar"}
          </button>
        </div>
      </CardEntrance>
    </div>
  );
}
