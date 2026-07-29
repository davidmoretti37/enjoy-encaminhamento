// Who actually applied to this vaga.
//
// WHY THIS EXISTS
// Selecting a vaga dropped the team straight into the AI matcher
// (MatchingStatusCard -> MatchedCandidatesList), which suggests candidates from
// the whole talent pool. There was no view of the people who had actually
// applied to THIS job, even though `application.getByJob` already existed — it
// was only used to populate the hired-candidate dropdown.
//
// That hid a lot: 845 applications across the platform, 98 of them on a single
// active vaga. Operator's words: "não estou conseguindo ver quem são os
// candidatos que se candidatou para essa vaga, ou quem são os candidatos que eu
// já mandei para o processo seletivo."
//
// So this shows both: everyone who applied, and how far each one has got.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateCardModal } from "@/components/candidate-card/CandidateCard";
import CandidateDocumentsModal from "@/components/CandidateDocumentsModal";
import {
  Users, MapPin, GraduationCap, ChevronDown, ChevronUp, FileText, Loader2,
} from "lucide-react";

// Mirrors the `application_status` values actually present in production.
const STATUS_META: Record<string, { label: string; className: string; order: number }> = {
  selected:   { label: "Contratado",          className: "bg-emerald-100 text-emerald-800 border-emerald-200", order: 0 },
  screening:  { label: "Em processo seletivo", className: "bg-purple-100 text-purple-800 border-purple-200",   order: 1 },
  applied:    { label: "Candidatou-se",        className: "bg-blue-100 text-blue-800 border-blue-200",         order: 2 },
  withdrawn:  { label: "Desistiu",             className: "bg-gray-100 text-gray-700 border-gray-200",         order: 3 },
  rejected:   { label: "Não selecionado",      className: "bg-slate-100 text-slate-600 border-slate-200",      order: 4 },
};

function statusMeta(status: string) {
  return STATUS_META[status] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-200", order: 9 };
}

const EDUCATION_LABELS: Record<string, string> = {
  fundamental: "Fundamental",
  medio: "Médio",
  superior: "Superior",
  "pos-graduacao": "Pós-graduação",
};

export default function JobApplicantsList({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);
  // Opening a candidate needs the FULL row. The applications query only joins a
  // slice of the candidate (no PDP answers, no summary, no experience), which is
  // enough for the list but not for the profile card.
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);
  const [docsCandidate, setDocsCandidate] = useState<{ id: string; name: string } | null>(null);

  const { data: applications, isLoading } = trpc.application.getByJob.useQuery(
    { jobId },
    { enabled: !!jobId },
  );

  // candidate.getById is role-gated server-side: admin passes, agency only for
  // candidates inside its own agency. Same authorisation the management screen
  // relies on, so opening a profile from here grants nothing extra.
  const {
    data: fullCandidate,
    isLoading: isCandidateLoading,
    error: candidateError,
  } = trpc.candidate.getById.useQuery(
    { id: openCandidateId || "" },
    { enabled: !!openCandidateId, retry: false },
  );

  // A candidate can be unreachable (removed, or belonging to another agency).
  // Without this the overlay would vanish and the click would look broken.
  useEffect(() => {
    if (candidateError) {
      toast.error(
        candidateError.data?.code === "FORBIDDEN"
          ? "Este candidato não pertence à sua agência."
          : "Não foi possível abrir o perfil deste candidato.",
      );
      setOpenCandidateId(null);
    }
  }, [candidateError]);

  const pdfMutation = trpc.candidate.generateProfilePdf.useMutation({
    onSuccess: (data: any) => {
      const byteString = atob(data.base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: any) => toast.error(error.message || "Erro ao gerar PDF"),
  });

  // Active candidatures first (contratado -> em processo -> candidatou-se), so
  // the people who still need a decision are at the top rather than buried
  // under everyone who was already rejected.
  const sorted = useMemo(() => {
    const list = ((applications || []) as any[]).filter((a) => a.candidates);
    return [...list].sort((a, b) => {
      const d = statusMeta(a.status).order - statusMeta(b.status).order;
      if (d !== 0) return d;
      return new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime();
    });
  }, [applications]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of sorted) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [sorted]);

  // Long lists are collapsed — one vaga has 98 applicants and an unbounded list
  // buries everything below it on the page.
  const VISIBLE = 8;
  const shown = expanded ? sorted : sorted.slice(0, VISIBLE);

  if (isLoading) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 mb-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#FF6B35]" />
          <h3 className="text-lg font-semibold text-[#0A2342]">
            Candidaturas nesta vaga
          </h3>
          <Badge variant="outline" className="text-xs">{sorted.length}</Badge>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Pessoas que se candidataram a esta vaga — diferente das sugestões do agente,
        que busca em todo o banco de talentos.
      </p>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">
          Ninguém se candidatou a esta vaga ainda.
        </p>
      ) : (
        <>
          {/* Status summary — answers "quem eu já mandei para o processo" at a glance */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(counts)
              .sort((a, b) => statusMeta(a[0]).order - statusMeta(b[0]).order)
              .map(([status, n]) => (
                <Badge key={status} variant="outline" className={`text-xs ${statusMeta(status).className}`}>
                  {statusMeta(status).label}: {n}
                </Badge>
              ))}
          </div>

          <div className="space-y-2">
            {shown.map((app: any) => {
              const c = app.candidates;
              const meta = statusMeta(app.status);
              return (
                <div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenCandidateId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenCandidateId(c.id);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {c.full_name || "Candidato sem nome"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {c.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.city}{c.state ? `, ${c.state}` : ""}
                        </span>
                      )}
                      {c.education_level && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {EDUCATION_LABELS[c.education_level] || c.education_level}
                        </span>
                      )}
                      {app.applied_at && (
                        <span>
                          {new Date(app.applied_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Documents are reachable without opening the profile first,
                        the same pair of actions the management screen offers. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-500 hover:text-[#0A2342]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocsCandidate({ id: c.id, name: c.full_name || "Candidato" });
                      }}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      Documentos
                    </Button>
                    <Badge variant="outline" className={`text-xs ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full profile — the same modal the management screen opens, so DISC,
              PDP answers, applications and the PDF download all behave
              identically no matter where you clicked the candidate from. */}
          {openCandidateId && fullCandidate && (
            <CandidateCardModal
              open
              onClose={() => setOpenCandidateId(null)}
              profile={{
                ...(fullCandidate as any),
                name: (fullCandidate as any).full_name || "Candidato",
                education: (fullCandidate as any).education_level,
                email: (fullCandidate as any).email || (fullCandidate as any).users?.email,
                phone: (fullCandidate as any).phone,
              }}
              onDownloadPdf={() => pdfMutation.mutate({ candidateId: openCandidateId })}
              isPdfLoading={pdfMutation.isPending}
              showApplications
              showQuestionnaire
            />
          )}

          {/* The fetch is a round trip; without this the row looks dead on click. */}
          {openCandidateId && isCandidateLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-[#FF6B35]" />
                <span className="text-sm text-slate-600">Carregando perfil...</span>
              </div>
            </div>
          )}

          {docsCandidate && (
            <CandidateDocumentsModal
              candidateId={docsCandidate.id}
              candidateName={docsCandidate.name}
              open
              onClose={() => setDocsCandidate(null)}
            />
          )}

          {sorted.length > VISIBLE && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-slate-600"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <><ChevronUp className="mr-1 h-4 w-4" />Mostrar menos</>
              ) : (
                <><ChevronDown className="mr-1 h-4 w-4" />Ver todos os {sorted.length}</>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
