import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";

/**
 * Who candidates see on the agency's email, and where their answers go.
 *
 * A candidate confirmed an interview by replying to an automatic message, and the
 * reply went to whoever owned the global SMTP account rather than to the person
 * running that interview. This is the screen that fixes it, without anyone
 * needing to touch environment variables.
 *
 * The sending address itself is deliberately not editable: mail must be sent from
 * an address ANEC controls, or it fails SPF/DKIM and lands in spam.
 */
export function SenderIdentityCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.agency.getSenderIdentity.useQuery(undefined, {
    retry: false,
  });

  const [displayName, setDisplayName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.senderDisplayName ?? "");
    setReplyTo(data.replyToEmail ?? "");
    setTouched(false);
  }, [data]);

  const save = trpc.agency.updateSenderIdentity.useMutation({
    onSuccess: async () => {
      toast.success("Configuração de e-mail salva.");
      setTouched(false);
      await utils.agency.getSenderIdentity.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Carregando configuração de e-mail...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const emailLooksValid = !replyTo.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(replyTo.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-mails para candidatos
        </CardTitle>
        <CardDescription>
          Defina o nome que aparece para o candidato e para onde vão as respostas dele.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sender-name">Nome que o candidato vê</Label>
            <Input
              id="sender-name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setTouched(true);
              }}
              placeholder={data.agencyName || "ANEC"}
              maxLength={80}
            />
            <p className="text-[11px] text-muted-foreground">
              Se deixar em branco, usamos {data.agencyName || "o nome da agência"}.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reply-to">E-mail que recebe as respostas</Label>
            <Input
              id="reply-to"
              type="email"
              value={replyTo}
              onChange={(e) => {
                setReplyTo(e.target.value);
                setTouched(true);
              }}
              placeholder="seuemail@anecrh.com.br"
              className={!emailLooksValid ? "border-red-400" : ""}
            />
            <p className="text-[11px] text-muted-foreground">
              Quando o candidato responder, a mensagem chega aqui.
            </p>
          </div>
        </div>

        {/* Show what actually goes out, so the effect is not a guess. */}
        <div className="rounded-lg border bg-slate-50 p-3 text-xs space-y-1">
          <p className="font-medium text-slate-700 mb-1.5">Como o candidato vai receber:</p>
          <p className="text-slate-600">
            <span className="inline-block w-16 text-slate-400">De:</span>
            {displayName.trim() || data.agencyName || "ANEC"}
          </p>
          <p className="text-slate-600">
            <span className="inline-block w-16 text-slate-400">Responder:</span>
            {replyTo.trim() || data.effectiveReplyTo || "—"}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          O endereço de envio é sempre o oficial da ANEC. Isso é o que garante que o e-mail
          chegue na caixa de entrada do candidato, e não no spam.
        </p>

        <Button
          onClick={() =>
            save.mutate({
              senderDisplayName: displayName.trim() || null,
              replyToEmail: replyTo.trim() || null,
            })
          }
          disabled={!touched || !emailLooksValid || save.isPending}
        >
          {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
