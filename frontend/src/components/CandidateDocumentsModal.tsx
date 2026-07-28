import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, User, IdCard, FileUser, ExternalLink } from "lucide-react";

interface CandidateDocumentsModalProps {
  candidateId: string;
  candidateName?: string;
  open: boolean;
  onClose: () => void;
}

function formatCpf(cpf?: string | null) {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function CandidateDocumentsModal({
  candidateId,
  candidateName,
  open,
  onClose,
}: CandidateDocumentsModalProps) {
  const { data: candidate, isLoading, error } = trpc.candidate.getById.useQuery(
    { id: candidateId },
    { enabled: open && !!candidateId }
  );

  const cpf = formatCpf((candidate as any)?.cpf);
  const rg = (candidate as any)?.rg as string | undefined;
  const photoUrl = (candidate as any)?.photo_url as string | undefined;
  const resumeUrl = (candidate as any)?.resume_url as string | undefined;
  const autoResumeUrl = (candidate as any)?.auto_generated_resume_url as string | undefined;
  const parentCpf = formatCpf((candidate as any)?.parent_guardian_cpf);

  const hasIdentity = Boolean(cpf || rg || parentCpf);
  const hasResume = Boolean(resumeUrl || autoResumeUrl);
  const hasAnything = hasIdentity || hasResume || photoUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Documentos{candidateName ? ` — ${candidateName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-4">
            Não foi possível carregar os documentos deste candidato.
          </p>
        ) : (
          <div className="space-y-4 py-1">
            {/* Photo */}
            {photoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                <img
                  src={photoUrl}
                  alt={candidateName || "Foto do candidato"}
                  className="h-16 w-16 rounded-full object-cover border"
                />
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Foto do candidato
                  </p>
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline inline-flex items-center gap-1"
                  >
                    Abrir imagem <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Identity */}
            {hasIdentity && (
              <div className="p-3 rounded-lg border bg-white">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b">
                  <IdCard className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold">Documentos de identidade</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {cpf && (
                    <div>
                      <span className="text-muted-foreground text-xs">CPF</span>
                      <p className="font-medium">{cpf}</p>
                    </div>
                  )}
                  {rg && (
                    <div>
                      <span className="text-muted-foreground text-xs">RG</span>
                      <p className="font-medium">{rg}</p>
                    </div>
                  )}
                  {parentCpf && (
                    <div>
                      <span className="text-muted-foreground text-xs">CPF do responsável</span>
                      <p className="font-medium">{parentCpf}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resume / CV */}
            {hasResume && (
              <div className="p-3 rounded-lg border bg-white">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b">
                  <FileUser className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold">Currículo</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {resumeUrl && (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                    >
                      <Download className="h-4 w-4" /> Currículo enviado
                    </a>
                  )}
                  {autoResumeUrl && (
                    <a
                      href={autoResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                    >
                      <Download className="h-4 w-4" /> Currículo gerado pela plataforma
                    </a>
                  )}
                </div>
              </div>
            )}

            {!hasAnything && (
              <p className="text-sm text-muted-foreground py-2">
                Este candidato ainda não possui documentos cadastrados. Os documentos
                (foto, CPF, RG e currículo) aparecem aqui conforme o candidato completa o cadastro.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
