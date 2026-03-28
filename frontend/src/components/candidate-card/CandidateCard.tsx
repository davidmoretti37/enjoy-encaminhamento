import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  Clock,
  Video,
  Building2,
  Download,
  User,
  Mail,
  Phone,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CandidateProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  age?: number;
  education?: string;
  institution?: string;
  course?: string;
  currently_studying?: boolean;
  skills?: string[];
  languages?: Array<{ language: string; level?: string }> | string[];
  has_work_experience?: boolean;
  experience?: Array<{ company?: string; role?: string; description?: string }>;
  summary?: string;
  profile_summary?: string;
  available_for_internship?: boolean;
  available_for_clt?: boolean;
  available_for_apprentice?: boolean;
  preferred_work_type?: string;
  disc_dominante?: number;
  disc_influente?: number;
  disc_estavel?: number;
  disc_conforme?: number;
  pdp_competencies?: string[];
  pdp_top_10_competencies?: string[];
  pdp_develop_competencies?: string[];
  pdp_skills?: Record<string, string[]>;
  pdp_action_plans?: Record<string, string[]>;
  photo_url?: string;
  resume_url?: string;
}

interface InterviewInfo {
  id: string;
  interview_type: "online" | "in_person";
  session_format?: "group" | "individual";
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  notes?: string;
}

interface CandidateCardProps {
  profile: CandidateProfile;
  interview?: InterviewInfo | null;
  matchScore?: number | null;
  jobTitle?: string;
  onDownloadPdf?: () => void;
  onHire?: () => void;
  isPdfLoading?: boolean;
}

const DISC_CONFIG = [
  {
    key: "disc_dominante" as const,
    id: "dominante",
    label: "D",
    title: "Dominância",
    color: "#DC2626",
    focus: "Resultados, poder, controle",
    motivation: "Desafios, conquistas, autonomia",
    strengths: ["Decisão rápida", "Coragem", "Liderança direta"],
    risks: ["Impaciência", "Autoritarismo", "Pouca empatia"],
    communication: "Direta, objetiva, sem rodeios",
    description: "Perfil orientado a resultados, direto e decisivo. Assume liderança e enfrenta desafios com determinação.",
  },
  {
    key: "disc_influente" as const,
    id: "influente",
    label: "I",
    title: "Influência",
    color: "#F59E0B",
    focus: "Pessoas, comunicação, entusiasmo",
    motivation: "Reconhecimento, conexão, diversão",
    strengths: ["Persuasão", "Carisma", "Criatividade"],
    risks: ["Desorganização", "Impulsividade", "Superficialidade"],
    communication: "Emocional, expansiva, inspiradora",
    description: "Perfil comunicativo e entusiasta. Motiva equipes e constrói relacionamentos com facilidade.",
  },
  {
    key: "disc_estavel" as const,
    id: "estavel",
    label: "S",
    title: "Estabilidade",
    color: "#22C55E",
    focus: "Harmonia, segurança, constância",
    motivation: "Pertencimento, previsibilidade, cooperação",
    strengths: ["Lealdade", "Paciência", "Confiabilidade"],
    risks: ["Resistência à mudança", "Acomodação"],
    communication: "Calma, acolhedora, empática",
    description: "Perfil paciente e confiável. Trabalha bem em equipe e mantém estabilidade em ambientes de mudança.",
  },
  {
    key: "disc_conforme" as const,
    id: "conforme",
    label: "C",
    title: "Conformidade",
    color: "#3B82F6",
    focus: "Qualidade, regras, precisão",
    motivation: "Correção, lógica, excelência",
    strengths: ["Análise", "Organização", "Pensamento crítico"],
    risks: ["Perfeccionismo", "Rigidez", "Lentidão"],
    communication: "Técnica, detalhada, racional",
    description: "Perfil analítico e preciso. Valoriza qualidade, organização e atenção aos detalhes.",
  },
];

// Combined DISC profiles (1st + 2nd) — mirrors backend/services/ai/summarizer.ts
const COMBINED_PROFILES: Record<string, {
  name: string;
  description: string;
  traits: string[];
  risk: string;
  commonIn: string;
}> = {
  dominante_influente: { name: "Dominante Influente", description: "Líder carismático e ousado", traits: ["Decide rápido e convence pessoas", "Visionário, motivador, competitivo"], risk: "Impulsividade e excesso de ego", commonIn: "Empreendedores, palestrantes e líderes comerciais" },
  dominante_estavel: { name: "Dominante Estável", description: "Líder firme, porém humano", traits: ["Determinado, leal e protetor da equipe", "Mantém controle sem perder empatia"], risk: "Dificuldade em lidar com conflitos emocionais", commonIn: "Gestores respeitados e líderes maduros" },
  dominante_conforme: { name: "Dominante Analítico", description: "Estratégico, exigente e orientado a excelência", traits: ["Cobra resultados com base em dados", "Perfeccionista e controlador"], risk: "Rigidez excessiva e intolerância a erros", commonIn: "Diretores, engenheiros, executivos técnicos" },
  influente_dominante: { name: "Influente Dominante", description: "Comunicador poderoso e líder natural", traits: ["Inspira e move pessoas à ação", "Energético, confiante e persuasivo"], risk: "Atropelar processos e pessoas", commonIn: "Vendedores de alta performance" },
  influente_estavel: { name: "Influente Estável", description: "Pessoa querida, acolhedora e comunicativa", traits: ["Excelente em relacionamentos e trabalho em equipe", "Evita conflitos, promove harmonia"], risk: "Dificuldade em dizer 'não'", commonIn: "RH, atendimento e educação" },
  influente_conforme: { name: "Influente Analítico", description: "Criativo com lógica", traits: ["Comunica ideias complexas de forma simples", "Persuasivo, mas cuidadoso"], risk: "Conflito interno entre emoção e razão", commonIn: "Comunicadores estratégicos e consultores" },
  estavel_dominante: { name: "Estável Dominante", description: "Liderança firme, porém paciente", traits: ["Determinado sem agressividade", "Sustenta resultados no longo prazo"], risk: "Demora para agir em crises", commonIn: "Líderes consistentes e confiáveis" },
  estavel_influente: { name: "Estável Influente", description: "Amigável, empático e motivador", traits: ["Excelente ouvinte e facilitador", "Cria ambientes seguros e positivos"], risk: "Evitar decisões difíceis", commonIn: "Mediadores, coaches e líderes humanos" },
  estavel_conforme: { name: "Estável Analítico", description: "Organizado, metódico e confiável", traits: ["Ama rotinas bem definidas", "Excelente executor e mantenedor de processos"], risk: "Resistência extrema à mudança", commonIn: "Áreas administrativas e qualidade" },
  conforme_dominante: { name: "Analítico Dominante", description: "Extremamente estratégico e exigente", traits: ["Decide com base em dados", "Alto padrão de desempenho"], risk: "Frieza e controle excessivo", commonIn: "Gestores técnicos e estrategistas" },
  conforme_influente: { name: "Analítico Influente", description: "Explica dados de forma envolvente", traits: ["Equilibra razão e carisma", "Influência com credibilidade"], risk: "Excesso de análise antes de agir", commonIn: "Professores, consultores e palestrantes técnicos" },
  conforme_estavel: { name: "Analítico Estável", description: "Metódico, confiável e detalhista", traits: ["Excelente para manutenção e melhoria contínua", "Discreto, profundo e consistente"], risk: "Baixa flexibilidade", commonIn: "Especialistas e profissionais de alta precisão" },
};

function getDISCProfiles(profile: CandidateProfile) {
  const scores = DISC_CONFIG.map((d) => ({ ...d, value: profile[d.key] || 0 }));
  scores.sort((a, b) => b.value - a.value);
  const primary = scores[0];
  const secondary = scores[1].value >= 15 ? scores[1] : null;
  const combinedKey = secondary ? `${primary.id}_${secondary.id}` : null;
  const combined = combinedKey ? COMBINED_PROFILES[combinedKey] : null;
  return { primary, secondary, combined };
}

function educationLabel(level: string): string {
  const labels: Record<string, string> = {
    fundamental: "Ensino Fundamental",
    medio: "Ensino Médio",
    tecnico: "Técnico",
    superior: "Ensino Superior",
    "pos-graduacao": "Pós-Graduação",
    mestrado: "Mestrado",
    doutorado: "Doutorado",
  };
  return labels[level] || level;
}

// DISC Radar Chart - SVG with proper padding for labels
function DISCRadarChart({ profile }: { profile: CandidateProfile }) {
  const chartR = 75;
  const padding = 45;
  const size = (chartR + padding) * 2;
  const cx = size / 2;
  const cy = size / 2;

  const values = [
    profile.disc_dominante || 0,
    profile.disc_influente || 0,
    profile.disc_estavel || 0,
    profile.disc_conforme || 0,
  ];

  // Axes: top (D), right (I), bottom (S), left (C)
  const axes = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  const getPoint = (axisIdx: number, pct: number) => {
    const r = (pct / 100) * chartR;
    return { x: cx + axes[axisIdx].x * r, y: cy + axes[axisIdx].y * r };
  };

  const gridLevels = [25, 50, 75, 100];
  const dataPoints = values.map((v, i) => getPoint(i, v));

  const labelOffset = 16;
  const labelPositions = [
    { x: cx, y: cy - chartR - labelOffset, anchor: "middle" as const, baseline: "auto" as const },
    { x: cx + chartR + labelOffset, y: cy, anchor: "start" as const, baseline: "middle" as const },
    { x: cx, y: cy + chartR + labelOffset, anchor: "middle" as const, baseline: "hanging" as const },
    { x: cx - chartR - labelOffset, y: cy, anchor: "end" as const, baseline: "middle" as const },
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="max-w-[240px] mx-auto block">
      {/* Grid diamonds */}
      {gridLevels.map((level) => {
        const r = (level / 100) * chartR;
        const pts = axes.map((a) => `${cx + a.x * r},${cy + a.y * r}`).join(" ");
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={level === 100 ? 1.2 : 0.6}
          />
        );
      })}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={cx + a.x * chartR} y2={cy + a.y * chartR}
          stroke="#cbd5e1" strokeWidth={0.6}
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="#0A2342"
        fillOpacity={0.12}
        stroke="#0A2342"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={DISC_CONFIG[i].color} stroke="white" strokeWidth={1.5} />
      ))}

      {/* Labels with values */}
      {DISC_CONFIG.map((d, i) => (
        <text
          key={d.key}
          x={labelPositions[i].x}
          y={labelPositions[i].y}
          textAnchor={labelPositions[i].anchor}
          dominantBaseline={labelPositions[i].baseline}
          fontSize="11"
          fontWeight="700"
          fill={d.color}
        >
          {d.label} {values[i]}%
        </text>
      ))}
    </svg>
  );
}

// Simple markdown renderer for AI summaries
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = () => {
    if (bulletGroup.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-0.5 ml-1">
          {bulletGroup.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>
      );
      bulletGroup = [];
    }
  };

  const renderInline = (line: string): React.ReactNode => {
    // Handle **bold** markers
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      continue;
    }
    // Bullet lines: "* text" or "- text"
    if (/^[*\-]\s+/.test(trimmed)) {
      bulletGroup.push(trimmed.replace(/^[*\-]\s+/, ""));
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${elements.length}`} className="mb-1.5 last:mb-0">
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushBullets();

  return <div className="text-sm text-slate-700 leading-relaxed">{elements}</div>;
}

// Section divider with optional subtitle
function SectionTitle({ children, subtitle, first }: { children: React.ReactNode; subtitle?: string; first?: boolean }) {
  return (
    <div className={first ? "mb-4" : "border-t border-slate-200 pt-6 mb-4"}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#0A2342] flex items-center gap-2">
        <span className="w-1 h-4 bg-[#0A2342] rounded-full inline-block" />
        {children}
      </h3>
      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-1 ml-3">{subtitle}</p>
      )}
    </div>
  );
}

// Mini card for list views
export function CandidateCardMini({
  profile,
  interview,
  matchScore,
  selected,
  onSelect,
  onClick,
}: {
  profile: CandidateProfile;
  interview?: InterviewInfo | null;
  matchScore?: number | null;
  selected?: boolean;
  onSelect?: () => void;
  onClick: () => void;
}) {
  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasDISC = profile.disc_dominante != null;
  const topCompetencies = (profile.pdp_top_10_competencies || []).slice(0, 2);

  return (
    <div onClick={onClick} className="cursor-pointer">
      <Card className={`overflow-hidden hover:shadow-md transition-all border-slate-200 ${selected ? "border-l-[3px] border-l-[#0A2342] bg-[#0A2342]/[0.02]" : ""}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {onSelect && (
              <div
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                  selected
                    ? "bg-[#0A2342] border-[#0A2342]"
                    : "border-slate-300 hover:border-[#0A2342]/50"
                }`}
              >
                {selected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0A2342] to-[#1B4D7A] flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#0A2342] truncate">{profile.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {profile.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {profile.city}{profile.state ? `, ${profile.state}` : ""}
                      </span>
                    )}
                    {profile.education && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {educationLabel(profile.education)}
                      </span>
                    )}
                  </div>
                </div>
                {matchScore != null && (
                  <Badge className="bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white text-[10px] px-1.5 py-0 shrink-0">
                    {Math.round(matchScore)}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5">
                {hasDISC && (
                  <div className="flex gap-1.5 flex-1 max-w-[180px]">
                    {DISC_CONFIG.map((d) => (
                      <div key={d.key} className="flex-1">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${profile[d.key] || 0}%`, backgroundColor: d.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {topCompetencies.length > 0 && (
                  <div className="flex gap-1">
                    {topCompetencies.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-50 text-slate-500 border border-slate-200">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}

                {interview && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 ml-auto">
                    {interview.interview_type === "online" ? (
                      <Video className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Building2 className="w-3 h-3 text-slate-400" />
                    )}
                    <span>
                      {format(new Date(interview.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="text-slate-400">({interview.duration_minutes}min)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Full candidate card — descriptive company-facing report
export function CandidateCard({
  profile,
  interview,
  matchScore,
  jobTitle,
  onDownloadPdf,
  onHire,
  isPdfLoading,
}: CandidateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    city: profile.city || "",
    state: profile.state || "",
    education_level: profile.education || "",
    skills: profile.skills || [],
  });
  const [skillInput, setSkillInput] = useState("");

  const editMutation = trpc.candidate.agencyUpdateCandidate.useMutation({
    onSuccess: () => {
      toast.success("Cadastro atualizado!");
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasDISC = profile.disc_dominante != null;
  const topCompetencies = profile.pdp_top_10_competencies || [];
  const developCompetencies = profile.pdp_develop_competencies || [];
  const hasExperience = profile.has_work_experience && profile.experience && profile.experience.length > 0;
  const hasSkills = (profile.skills && profile.skills.length > 0) || (profile.languages && profile.languages.length > 0);
  const discProfiles = hasDISC ? getDISCProfiles(profile) : null;
  const summaryText = profile.summary || profile.profile_summary;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#0A2342] to-[#1B4D7A] rounded-t-xl px-8 py-6 text-white">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shrink-0 overflow-hidden">
            {profile.photo_url ? (
              <img src={profile.photo_url} className="w-full h-full object-cover" alt="" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
                  {jobTitle && (
                    <p className="text-white/50 text-sm mt-0.5">
                      Candidato para <span className="text-white/80 font-medium">{jobTitle}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 text-xs bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="w-3 h-3" />
                  {isEditing ? "Fechar" : "Editar"}
                </button>
              </div>
              {matchScore != null && (
                <div className="w-14 h-14 rounded-full border-2 border-white/30 flex flex-col items-center justify-center shrink-0 bg-white/10">
                  <span className="text-lg font-bold leading-none">{Math.round(matchScore)}%</span>
                  <span className="text-[9px] text-white/50 leading-none mt-0.5">match</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick facts bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-white/15">
          {profile.age && (
            <span className="flex items-center gap-1.5 text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
              <User className="w-3.5 h-3.5" />
              {profile.age} anos
            </span>
          )}
          {profile.city && (
            <span className="flex items-center gap-1.5 text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              {profile.city}{profile.state ? `, ${profile.state}` : ""}
            </span>
          )}
          {profile.education && (
            <span className="flex items-center gap-1.5 text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
              <GraduationCap className="w-3.5 h-3.5" />
              {educationLabel(profile.education)}
              {profile.currently_studying && " (cursando)"}
            </span>
          )}
          {profile.preferred_work_type && (
            <span className="flex items-center gap-1.5 text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
              <Briefcase className="w-3.5 h-3.5" />
              {profile.preferred_work_type === "presencial" ? "Presencial" :
               profile.preferred_work_type === "remoto" ? "Remoto" :
               profile.preferred_work_type === "hibrido" ? "Híbrido" : profile.preferred_work_type}
            </span>
          )}
        </div>
      </div>

      {/* ── Edit Form ── */}
      {isEditing && (
        <div className="bg-orange-50 border border-t-0 border-orange-200 px-8 py-5 space-y-3">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Editar Cadastro do Candidato</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nome</Label><Input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Telefone</Label><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Cidade</Label><Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Estado</Label><Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Escolaridade</Label>
              <select value={editForm.education_level} onChange={e => setEditForm({...editForm, education_level: e.target.value})} className="w-full h-8 text-sm border rounded px-2">
                <option value="">-</option>
                <option value="fundamental">Fundamental</option>
                <option value="medio">Médio</option>
                <option value="superior">Superior</option>
                <option value="pos-graduacao">Pós-graduação</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Habilidades</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {(editForm.skills || []).map((s: string, i: number) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded border border-orange-200 flex items-center gap-1">
                  {s}
                  <button onClick={() => setEditForm({...editForm, skills: editForm.skills.filter((_: string, j: number) => j !== i)})} className="text-orange-400 hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Adicionar habilidade" className="h-7 text-xs flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && skillInput.trim()) { e.preventDefault(); setEditForm({...editForm, skills: [...editForm.skills, skillInput.trim()]}); setSkillInput(''); }}} />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (skillInput.trim()) { setEditForm({...editForm, skills: [...editForm.skills, skillInput.trim()]}); setSkillInput(''); }}}>+</Button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={() => editMutation.mutate({ candidateId: profile.id, ...editForm })} disabled={editMutation.isPending} className="text-xs bg-orange-600 hover:bg-orange-700 text-white">
              {editMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="bg-white rounded-b-xl border border-t-0 border-slate-200">

        {/* Contact Info */}
        {(profile.email || profile.phone) && (
          <div className="mx-8 mt-4 flex items-center gap-4">
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0A2342] transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {profile.email}
              </a>
            )}
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0A2342] transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {profile.phone}
              </a>
            )}
          </div>
        )}

        {/* Interview Banner */}
        {interview && (
          <div className="mx-8 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Entrevista Agendada</span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">
                  {format(new Date(interview.scheduled_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">
                  {format(new Date(interview.scheduled_at), "HH:mm", { locale: ptBR })} ({interview.duration_minutes}min)
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                {interview.interview_type === "online" ? (
                  <>
                    <Video className="w-3.5 h-3.5 text-slate-400" />
                    <span>Online</span>
                    {interview.meeting_link && (
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="text-[#1B4D7A] hover:underline ml-1 text-sm">
                        Entrar na reunião
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Presencial
                      {interview.location_address && ` - ${interview.location_address}`}
                      {interview.location_city && `, ${interview.location_city}`}
                      {interview.location_state && ` - ${interview.location_state}`}
                    </span>
                  </>
                )}
              </div>
            </div>
            {interview.notes && (
              <p className="text-sm text-slate-500 mt-2 italic">{interview.notes}</p>
            )}
          </div>
        )}

        {/* Main content area */}
        <div className="px-8 py-6">

          {/* ── DISC Profile ── */}
          {hasDISC && discProfiles && (
            <div>
              <SectionTitle first subtitle="Resultado da avaliação de perfil comportamental DISC">
                Perfil Comportamental
              </SectionTitle>
              <div className="grid grid-cols-2 gap-6 items-start">
                {/* Radar Chart */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <DISCRadarChart profile={profile} />
                  <div className="flex justify-center gap-3 mt-2">
                    {DISC_CONFIG.map((d) => (
                      <span key={d.key} className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                        {d.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Profile Descriptions */}
                <div className="space-y-4">
                  {/* Primary Profile */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-1.5">
                      Perfil Predominante:{" "}
                      <span style={{ color: discProfiles.primary.color }}>
                        {discProfiles.primary.title} ({discProfiles.primary.value}%)
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{discProfiles.primary.description}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <div><span className="font-semibold text-slate-600">Foco:</span> {discProfiles.primary.focus}</div>
                      <div><span className="font-semibold text-slate-600">Motivação:</span> {discProfiles.primary.motivation}</div>
                      <div><span className="font-semibold text-slate-600">Forças:</span> {discProfiles.primary.strengths.join(", ")}</div>
                      <div><span className="font-semibold text-slate-600">Comunicação:</span> {discProfiles.primary.communication}</div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      <span className="font-semibold">Pontos de atenção:</span> {discProfiles.primary.risks.join(", ")}
                    </p>
                  </div>

                  {/* Secondary Profile */}
                  {discProfiles.secondary && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs font-bold text-slate-600 mb-1">
                        Perfil Secundário:{" "}
                        <span style={{ color: discProfiles.secondary.color }}>
                          {discProfiles.secondary.title} ({discProfiles.secondary.value}%)
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">{discProfiles.secondary.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        <span className="font-semibold">Forças:</span> {discProfiles.secondary.strengths.join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Combined Profile */}
                  {discProfiles.combined && (
                    <div className="bg-[#0A2342]/5 rounded-lg p-3 border border-[#0A2342]/10">
                      <p className="text-xs font-bold text-[#0A2342] mb-1">
                        Perfil Combinado: {discProfiles.combined.name}
                      </p>
                      <p className="text-xs text-slate-600 font-medium mb-1.5">{discProfiles.combined.description}</p>
                      <ul className="text-[11px] text-slate-500 space-y-0.5">
                        {discProfiles.combined.traits.map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        <span className="font-semibold">Principal risco:</span> {discProfiles.combined.risk}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <span className="font-semibold">Comum em:</span> {discProfiles.combined.commonIn}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Top Competencies ── */}
          {topCompetencies.length > 0 && (
            <div>
              <SectionTitle first={!hasDISC} subtitle="Competências mais fortes identificadas na avaliação comportamental">
                Top Competências
              </SectionTitle>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {topCompetencies.map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0A2342] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Development Areas */}
          {developCompetencies.length > 0 && (
            <div>
              <SectionTitle subtitle="Competências com potencial de crescimento que podem ser desenvolvidas com acompanhamento">
                Áreas de Desenvolvimento
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {developCompetencies.map((c, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Formação e Experiência ── */}
          <div>
            <SectionTitle first={!hasDISC && topCompetencies.length === 0}>Formação e Experiência</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              {/* Education */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Formação Acadêmica</p>
                {profile.education ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{educationLabel(profile.education)}</p>
                      {profile.institution && <p className="text-sm text-slate-500">{profile.institution}</p>}
                      {profile.course && <p className="text-sm text-slate-500">{profile.course}</p>}
                      {profile.currently_studying && (
                        <span className="inline-block mt-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Cursando</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Informação não disponível</p>
                )}
              </div>

              {/* Experience */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Experiência Profissional</p>
                {hasExperience ? (
                  <div className="space-y-3">
                    {profile.experience!.map((exp, i) => (
                      <div key={i} className="border-l-2 border-[#0A2342]/20 pl-3">
                        {exp.role && <p className="text-sm font-semibold text-slate-800">{exp.role}</p>}
                        {exp.company && <p className="text-sm text-slate-500">{exp.company}</p>}
                        {exp.description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sem experiência profissional prévia</p>
                )}
              </div>
            </div>
          </div>

          {/* Skills & Languages */}
          {hasSkills && (
            <div>
              <SectionTitle>Habilidades</SectionTitle>
              <div className="grid grid-cols-2 gap-6">
                {profile.skills && profile.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Competências Técnicas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((s, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {typeof s === "string" ? s : (s as any).name || s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.languages && profile.languages.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Idiomas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.languages.map((l, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {typeof l === "string" ? l : `${l.language}${l.level ? ` (${l.level})` : ""}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Availability */}
          {(profile.available_for_internship || profile.available_for_clt || profile.available_for_apprentice) && (
            <div>
              <SectionTitle subtitle="Tipos de contrato que o candidato está disponível para">
                Disponibilidade
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {profile.available_for_internship && (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">Estágio</span>
                )}
                {profile.available_for_clt && (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">CLT</span>
                )}
                {profile.available_for_apprentice && (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">Jovem Aprendiz</span>
                )}
              </div>
            </div>
          )}

          {/* Resumo Profissional — AI summary */}
          {summaryText && (
            <div>
              <SectionTitle subtitle="Análise gerada por inteligência artificial com base no perfil completo do candidato">
                Resumo Profissional
              </SectionTitle>
              <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                <SimpleMarkdown text={summaryText} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          {onDownloadPdf && (
            <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={isPdfLoading} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              {isPdfLoading ? "Gerando..." : "Baixar PDF"}
            </Button>
          )}
          {onHire && (
            <Button size="sm" onClick={onHire} className="bg-[#0A2342] text-white hover:bg-[#1B4D7A] flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Contratar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal wrapper
export function CandidateCardModal({
  open,
  onClose,
  ...cardProps
}: CandidateCardProps & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <CandidateCard {...cardProps} />
      </DialogContent>
    </Dialog>
  );
}
