import { useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useCompanyFunnel } from "@/contexts/CompanyFunnelContext";
import {
  Users,
  MapPin,
  GraduationCap,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Briefcase,
  Globe,
  ChevronDown,
  Phone,
} from "lucide-react";
import { CardEntrance } from "@/components/funnel";

const InterviewScheduleModal = lazy(() =>
  import("@/components/InterviewScheduleModal").then((m) => ({ default: m.InterviewScheduleModal }))
);

export default function StepCandidatos() {
  const { selectedJob, selectedJobId, batches, refreshData } = useCompanyFunnel();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [viewingCandidate, setViewingCandidate] = useState<any>(null);

  // Filter batches for selected job
  const jobBatches = batches.filter((b: any) => b.job?.id === selectedJobId);
  const allCandidates = jobBatches.flatMap((b: any) => b.candidates || []);

  const [interviewModalOpen, setInterviewModalOpen] = useState(false);

  const handleOpenScheduleModal = () => {
    if (selectedCandidates.size === 0 || jobBatches.length === 0) return;
    setInterviewModalOpen(true);
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCandidates.size === allCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(allCandidates.map((c: any) => c.id)));
    }
  };

  if (!selectedJob) {
    return <EmptyState />;
  }

  if (allCandidates.length === 0) {
    return (
      <CardEntrance>
        <div className="relative">
          {/* Floating decorative element */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl blur-xl opacity-30" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 border-4 border-white">
                <Users className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            <h3 className="text-2xl font-bold text-[#0A2342] mb-3 tracking-tight">
              Aguardando Candidatos
            </h3>
            <p className="text-slate-600 max-w-sm text-lg">
              Nossa equipe está buscando os melhores candidatos para esta vaga
            </p>

            <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                />
              </div>
              <span className="text-sm font-medium text-blue-600">Busca em andamento</span>
            </div>
          </div>
        </div>
      </CardEntrance>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#0A2342]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-32 w-80 h-80 bg-[#0A2342]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Animated guidance banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-[#0A2342]/10 border border-[#FF6B35]/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
        <div className="relative p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A2342] flex items-center justify-center shadow-lg shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#0A2342] font-medium">Candidatos Pré-Selecionados</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Selecione candidatos para agendar entrevistas em grupo ou individuais. Revise os perfis primeiro.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Header with selection controls and primary action */}
      <CardEntrance>
        <div className="relative group">
          {/* Glow effect on hover */}
          <div className="absolute -inset-0.5 bg-[#0A2342] rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity" />

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl p-4">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0A2342] rounded-t-2xl" />

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleAll}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm
                      ${selectedCandidates.size === allCandidates.length
                        ? "bg-[#0A2342] border-[#FF6B35] shadow-[#0A2342]/25"
                        : "border-slate-300 hover:border-[#FF6B35]/50 bg-white"
                      }`}
                  >
                    {selectedCandidates.size === allCandidates.length && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </motion.button>
                  <div>
                    <h2 className="text-xl font-bold text-[#0A2342] tracking-tight">
                      Candidatos Encontrados
                    </h2>
                    {selectedCandidates.size > 0 && (
                      <p className="text-sm text-slate-600 mt-0.5">
                        <span className="font-semibold text-[#FF6B35]">{selectedCandidates.size}</span> de {allCandidates.length} selecionados
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary action - ALWAYS visible */}
              <button
                onClick={handleOpenScheduleModal}
                disabled={selectedCandidates.size === 0}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-semibold shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Agendar Entrevista
                {selectedCandidates.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                    {selectedCandidates.size}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </CardEntrance>

      {/* Candidates list */}
      <div className="space-y-3">
        {allCandidates.map((candidate: any, index: number) => (
          <CardEntrance key={candidate.id} delay={index * 0.05}>
            <CandidateCard
              candidate={candidate}
              isSelected={selectedCandidates.has(candidate.id)}
              onToggle={() => toggleCandidate(candidate.id)}
              onView={() => setViewingCandidate(candidate)}
            />
          </CardEntrance>
        ))}
      </div>

      {/* Candidate Profile Modal */}
      {viewingCandidate && (
        <CandidateProfileModal
          candidate={viewingCandidate}
          onClose={() => setViewingCandidate(null)}
        />
      )}

      {/* Interview Scheduling Modal */}
      {interviewModalOpen && jobBatches.length > 0 && selectedJobId && (
        <Suspense fallback={null}>
          <InterviewScheduleModal
            open={true}
            onClose={() => setInterviewModalOpen(false)}
            batchId={jobBatches[0].id}
            jobId={selectedJobId}
            candidateIds={Array.from(selectedCandidates)}
            onSuccess={() => {
              setInterviewModalOpen(false);
              setSelectedCandidates(new Set());
              refreshData();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

interface CandidateCardProps {
  candidate: any;
  isSelected: boolean;
  onToggle: () => void;
  onView: () => void;
}

function CandidateCard({ candidate, isSelected, onToggle, onView }: CandidateCardProps) {
  const profile = candidate.candidate || candidate;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer"
      onClick={onToggle}
    >
      {/* Glow effect for selected cards */}
      {isSelected && (
        <div className="absolute -inset-0.5 bg-[#0A2342] rounded-2xl opacity-20 blur-md group-hover:opacity-30 transition-opacity" />
      )}

      <div className={`relative bg-white rounded-2xl border-2 p-4 transition-all shadow-md
        ${isSelected
          ? "border-[#FF6B35]/50 shadow-[#0A2342]/20 shadow-lg"
          : "border-slate-200/50 hover:border-[#FF6B35]/30 hover:shadow-lg"
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Selection checkbox */}
          <motion.div
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all shadow-sm
              ${isSelected
                ? "bg-[#0A2342] border-[#FF6B35] shadow-[#0A2342]/30"
                : "border-slate-300 bg-white hover:border-[#FF6B35]/50"
              }`}
          >
            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
          </motion.div>

          {/* Avatar with enhanced gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#0A2342] rounded-full blur-sm opacity-40" />
            <div className="relative w-14 h-14 rounded-full bg-[#0A2342] flex items-center justify-center shrink-0 border-2 border-white shadow-lg">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">
                  {profile.full_name?.charAt(0) || "?"}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[#0A2342] font-semibold text-lg truncate">{profile.full_name || "Candidato"}</h4>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-600">
              {profile.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#FF6B35]" />
                  <span className="font-medium">{profile.city}</span>
                </span>
              )}
              {profile.education_level && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{profile.education_level}</span>
                </span>
              )}
            </div>
          </div>

          {/* Match score with enhanced design */}
          {candidate.match_score && (
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative text-center px-4 py-2 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl opacity-10" />
              <div className="relative text-2xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {candidate.match_score}%
              </div>
              <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Match</div>
            </motion.div>
          )}

          {/* View button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#e55a2a] transition-all shadow-sm hover:shadow-md relative z-10"
          >
            <Eye className="w-4 h-4" />
            Ver Perfil
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function formatEducationLevel(level: string) {
  const map: Record<string, string> = {
    fundamental: "Ensino Fundamental",
    medio: "Ensino Médio",
    superior: "Ensino Superior",
    "pos-graduacao": "Pós-Graduação",
    mestrado: "Mestrado",
    doutorado: "Doutorado",
  };
  return map[level] || level;
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function DISCBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-xs font-bold text-slate-600">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="w-8 text-xs text-slate-500 text-right">{value}%</span>
    </div>
  );
}

function CandidateProfileModal({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const profile = candidate.candidate || candidate;
  const age = calculateAge(profile.birth_date || profile.date_of_birth);
  const hasDisc = profile.disc_dominante != null || profile.disc_influente != null || profile.disc_estavel != null || profile.disc_conforme != null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header with gradient */}
        <div className="relative h-24 bg-[#0A2342] shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          >
            <XCircle className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="relative -mt-12 px-6 shrink-0">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-[#0A2342] flex items-center justify-center shadow-lg">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-3xl">
                {profile.full_name?.charAt(0) || "?"}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <div className="space-y-5 pt-3">
            {/* Name & contact */}
            <div>
              <h2 className="text-xl font-semibold text-[#0A2342]">{profile.full_name}</h2>
              <div className="flex items-center gap-4 mt-1">
                {profile.email && (
                  <p className="text-slate-500 text-sm">{profile.email}</p>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1 text-slate-500 text-sm">
                    <Phone className="w-3.5 h-3.5" />
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-3">
              {profile.city && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-2.5">
                  <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-[#0A2342] font-medium">{profile.city}{profile.state ? `, ${profile.state}` : ''}</span>
                </div>
              )}
              {age && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-2.5">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-[#0A2342] font-medium">{age} anos</span>
                </div>
              )}
              {profile.education_level && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-2.5 col-span-2">
                  <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[#0A2342] font-medium">
                      {formatEducationLevel(profile.education_level)}
                      {profile.currently_studying && ' (Cursando)'}
                    </span>
                    {(profile.institution || profile.course) && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {profile.institution}{profile.course ? ` — ${profile.course}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Availability badges */}
            {(profile.available_for_internship || profile.available_for_clt || profile.available_for_apprentice || profile.preferred_work_type) && (
              <div className="flex gap-2 flex-wrap">
                {profile.available_for_internship && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    Estágio
                  </span>
                )}
                {profile.available_for_clt && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    CLT
                  </span>
                )}
                {profile.available_for_apprentice && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    Jovem Aprendiz
                  </span>
                )}
                {profile.preferred_work_type && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
                    {profile.preferred_work_type === 'presencial' && 'Presencial'}
                    {profile.preferred_work_type === 'remoto' && 'Remoto'}
                    {profile.preferred_work_type === 'hibrido' && 'Híbrido'}
                  </span>
                )}
              </div>
            )}

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Habilidades</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  Idiomas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Work Experience */}
            {profile.has_work_experience && profile.experience?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  Experiência Profissional
                </h3>
                <div className="space-y-2">
                  {profile.experience.slice(0, 5).map((exp: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-lg border-l-3 border-[#0A2342]">
                      {typeof exp === 'string' ? (
                        <p className="text-sm text-[#0A2342]">{exp}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[#0A2342]">
                            {exp.cargo || exp.position || exp.title}
                          </p>
                          {(exp.empresa || exp.company) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {exp.empresa || exp.company}
                            </p>
                          )}
                          {(exp.periodo || exp.period || exp.duration) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {exp.periodo || exp.period || exp.duration}
                            </p>
                          )}
                          {(exp.descricao || exp.description) && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {exp.descricao || exp.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DISC Profile */}
            {hasDisc && (
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Perfil DISC</h3>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <DISCBar label="D" value={profile.disc_dominante || 0} color="bg-red-500" />
                  <DISCBar label="I" value={profile.disc_influente || 0} color="bg-yellow-500" />
                  <DISCBar label="S" value={profile.disc_estavel || 0} color="bg-green-500" />
                  <DISCBar label="C" value={profile.disc_conforme || 0} color="bg-blue-500" />
                </div>
              </div>
            )}

            {/* Candidate Summary */}
            {(profile.summary || profile.profile_summary) && (
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Resumo do Candidato</h3>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                    {profile.summary || profile.profile_summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 flex gap-3 border-t shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-200 text-slate-700 font-medium hover:border-slate-300 transition-all"
          >
            Fechar
          </button>
          <button className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all">
            Selecionar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma vaga selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma vaga para ver os candidatos</p>
    </div>
  );
}

