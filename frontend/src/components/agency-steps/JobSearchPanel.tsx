// The AI candidate search, as its own deliberate action.
//
// WHY THIS REPLACED MatchingStatusCard
// Opening a vaga used to drop you into a screen that animated "Buscando
// candidatos..." with a typing indicator. It looked like a search was running.
// It usually wasn't — the old card computed:
//
//   isRunning = !progress || status === 'not_started' || 'running' || 'pending'
//
// so a vaga that had NEVER been searched rendered as permanently searching, and
// one that HAD been searched re-rendered that animation on every visit. In
// production 25 of 32 active vagas were in exactly that state. Operator's words:
// "quando eu clico numa vaga ele já vai direto buscando candidatos, sendo que
// já buscou."
//
// Now:
//   * nothing runs on open — ever;
//   * the panel states plainly whether this vaga was searched, and when;
//   * searching is a button someone presses on purpose;
//   * results come from job_matches, which was already persistent — reopening a
//     vaga shows the saved results instantly instead of re-running anything.
//
// "Never searched" and "searched, found nobody" are different states and are
// worded differently — both leave zero rows in job_matches, so the distinction
// comes from jobs.last_matched_at (migration 133).
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Bot, Search, RefreshCw, AlertCircle, CheckCircle2, SearchX, Sparkles,
} from "lucide-react";

function AgentLine({ text }: { text: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-slate-600"
    >
      {text}
    </motion.p>
  );
}

export default function JobSearchPanel({
  jobId,
  children,
}: {
  jobId: string;
  children?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  // Set the moment the button is pressed and cleared when the run settles, so
  // the panel keeps polling through a request that outlives its own mutation.
  const [awaitingRun, setAwaitingRun] = useState(false);

  const { data: progress, isLoading } = trpc.job.getMatchingProgress.useQuery(
    { jobId },
    {
      enabled: !!jobId,
      // Poll ONLY while something is genuinely running. `not_started` is a
      // resting state, not a pending one — polling it was what made idle vagas
      // look busy.
      refetchInterval: (query: any) => {
        const status = query.state?.data?.status;
        return status === "running" || status === "pending" ? 1500 : false;
      },
    },
  );

  const triggerMatching = trpc.job.triggerMatchingForAgency.useMutation({
    onSuccess: () => {
      setAwaitingRun(false);
      utils.job.getMatchingProgress.invalidate({ jobId });
      utils.job.getMatchesForJob.invalidate({ jobId });
    },
    onError: () => setAwaitingRun(false),
  });

  const runSearch = () => {
    setAwaitingRun(true);
    triggerMatching.reset();
    triggerMatching.mutate({ jobId });
  };

  const isRunning =
    awaitingRun ||
    triggerMatching.isPending ||
    progress?.status === "running" ||
    progress?.status === "pending";

  // A failure is its own state. Folding 'failed' into hasSearched made a crashed
  // pipeline render as "a busca rodou e não encontrou nenhum candidato" — the
  // operator would conclude the talent pool is empty and never retry. The server
  // reports it too, not just the local mutation, so a reload or a second person
  // opening the vaga still sees the failure rather than a false all-clear.
  const searchFailed = progress?.status === "failed" || triggerMatching.isError;
  const hasSearched = progress?.status === "completed";
  const matchCount = progress?.matchesFound ?? 0;
  const lastSearchedAt = (progress as any)?.lastSearchedAt as string | null | undefined;
  const messages = ((progress as any)?.messages || []) as { text: string }[];

  // failProgress() pushes "Erro: <msg>" as the last message, so when the failure
  // came from a run this client did not start there is still something concrete
  // to show instead of a bare "algo deu errado".
  const serverErrorMessage =
    progress?.status === "failed"
      ? messages[messages.length - 1]?.text?.replace(/^Erro:\s*/, "") || null
      : null;

  const lastSearchedLabel = lastSearchedAt
    ? format(new Date(lastSearchedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    /* No `overflow-hidden` here, deliberately. The children include the manual
       "Buscar candidato manualmente" dropdown (absolutely positioned, 240px tall)
       and the "Adicionar ao Grupo" sticky bar. An overflow-hidden ancestor clips
       the first and makes the second stop sticking, and on a vaga with no AI
       matches the panel is short enough to swallow the whole dropdown. The
       header rounds its own top corners instead. */
    <div className="rounded-xl border-2 border-slate-200 bg-white">
      {/* Header — identical in every state so the panel never moves around */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-[0.6rem] border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1B4D7A] to-[#FF6B35]">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#0A2342]">
              Busca de candidatos por IA
            </h3>
            <p className="text-xs text-slate-500">
              Procura no banco de talentos inteiro, além de quem já se candidatou
            </p>
          </div>
        </div>

        {!isLoading && (
          <Button
            size="sm"
            onClick={runSearch}
            disabled={isRunning}
            className={
              hasSearched && !searchFailed
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90"
            }
          >
            {isRunning ? (
              <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />Buscando...</>
            ) : searchFailed ? (
              <><RefreshCw className="mr-1.5 h-4 w-4" />Tentar de novo</>
            ) : hasSearched ? (
              <><RefreshCw className="mr-1.5 h-4 w-4" />Buscar novamente</>
            ) : (
              <><Search className="mr-1.5 h-4 w-4" />Buscar candidatos</>
            )}
          </Button>
        )}
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <Skeleton className="h-5 w-64" />
        ) : isRunning ? (
          /* RUNNING — the only state that animates */
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0A2342]">
              <RefreshCw className="h-4 w-4 animate-spin text-[#FF6B35]" />
              Procurando candidatos compatíveis...
            </div>
            {messages.length > 0 ? (
              <div className="max-h-32 space-y-1 overflow-y-auto pl-6">
                {messages.map((m, i) => <AgentLine key={i} text={m.text} />)}
              </div>
            ) : (
              <p className="pl-6 text-sm text-slate-500">
                Isso pode levar até um minuto. Pode deixar a página aberta.
              </p>
            )}
          </div>
        ) : searchFailed ? (
          /* ERROR — deliberately worded so it can never be read as "found nobody".
             Covers both the local mutation failing and the server reporting a
             failed run to a client that did not start it. */
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">
                A busca falhou — nada foi concluído
              </p>
              <p className="mt-0.5 text-xs text-red-600">
                {triggerMatching.error?.message
                  || serverErrorMessage
                  || "A busca não chegou ao fim."}{" "}
                Isso não significa que não existam candidatos. Clique em{" "}
                <span className="font-medium">Tentar de novo</span>.
              </p>
              {matchCount > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Os {matchCount} candidato{matchCount !== 1 ? "s" : ""} de uma busca
                  anterior continuam salvos abaixo.
                </p>
              )}
            </div>
          </div>
        ) : !hasSearched ? (
          /* NEVER SEARCHED — no spinner, no fake activity */
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-600">
              Esta vaga ainda não foi buscada. Clique em{" "}
              <span className="font-medium text-[#0A2342]">Buscar candidatos</span>{" "}
              para a IA procurar perfis compatíveis no banco de talentos.
            </p>
          </div>
        ) : matchCount > 0 ? (
          /* SEARCHED, FOUND N */
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-sm font-medium text-[#0A2342]">
              {matchCount} candidato{matchCount !== 1 ? "s" : ""} compatíve{matchCount !== 1 ? "is" : "l"} encontrado{matchCount !== 1 ? "s" : ""}
            </span>
            {lastSearchedLabel && (
              <Badge variant="outline" className="text-xs font-normal text-slate-500">
                busca de {lastSearchedLabel}
              </Badge>
            )}
          </div>
        ) : (
          /* SEARCHED, FOUND NOBODY — explicitly not the same as "never searched" */
          <div className="flex items-start gap-2.5">
            <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm text-slate-600">
                A busca rodou e não encontrou nenhum candidato compatível
                {lastSearchedLabel ? ` (${lastSearchedLabel})` : ""}.
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Você pode buscar de novo depois que novos candidatos se cadastrarem,
                ou adicionar alguém manualmente abaixo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saved results + the manual "add candidate by name" box. Always mounted:
          the team uses the manual box to build a group even when the AI search
          found nothing, and it re-reads job_matches rather than re-running. */}
      {children && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  );
}
