import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Mail, Send, Loader2, Link2, Calendar, X } from "lucide-react";
import { toast } from "sonner";

interface EmailComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledEmail?: string;
  companyId?: string;
}

const DEFAULT_EMAIL_TEMPLATE = `Olá,

Somos especializados em conectar empresas com candidatos qualificados para estágios, programas de jovem aprendiz e contratações CLT.

Como podemos ajudar:
- Acesso a candidatos pré-selecionados e qualificados
- Triagem e matching personalizado
- Suporte com contratos e documentação

Interessado? Escolha uma opção abaixo.

Atenciosamente,
Equipe de Recrutamento`;

export default function EmailComposeModal({
  open,
  onOpenChange,
  prefilledEmail = "",
  companyId,
}: EmailComposeModalProps) {
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState("Encontre os Melhores Talentos para sua Empresa");
  const [body, setBody] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [includeFormLink, setIncludeFormLink] = useState(true);
  const [includeBookingLink, setIncludeBookingLink] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{
    total: number;
    sent: number;
    failed: number;
    current: string;
  } | null>(null);

  const sendEmailMutation = trpc.outreach.sendEmail.useMutation();

  // Handle prefilled email when modal opens
  useEffect(() => {
    if (open && prefilledEmail && !recipientEmails.includes(prefilledEmail)) {
      setRecipientEmails(prev => [...prev, prefilledEmail]);
    }
  }, [open, prefilledEmail]);

  const parseEmails = (text: string): string[] => {
    const raw = text.split(/[,;\n\s]+/).map(e => e.trim()).filter(Boolean);
    return raw.filter(e => e.includes("@") && e.includes("."));
  };

  const addEmails = (text: string) => {
    const newEmails = parseEmails(text);
    if (newEmails.length > 0) {
      setRecipientEmails(prev => {
        const unique = new Set([...prev, ...newEmails]);
        return Array.from(unique);
      });
      setEmailInput("");
    }
  };

  const removeEmail = (email: string) => {
    setRecipientEmails(prev => prev.filter(e => e !== email));
  };

  const resetForm = () => {
    setRecipientEmails([]);
    setEmailInput("");
    setSubject("Encontre os Melhores Talentos para sua Empresa");
    setBody(DEFAULT_EMAIL_TEMPLATE);
    setIncludeFormLink(true);
    setIncludeBookingLink(true);
    setSendingProgress(null);
  };

  const handleSend = async () => {
    // Parse any remaining text in the input
    const finalEmails = [...recipientEmails];
    const extraEmails = parseEmails(emailInput);
    extraEmails.forEach(e => {
      if (!finalEmails.includes(e)) finalEmails.push(e);
    });

    if (finalEmails.length === 0) {
      toast.error("Por favor, insira pelo menos um email válido");
      return;
    }

    const to = finalEmails.join(',');
    const gmailSubject = encodeURIComponent(subject);
    const gmailBody = encodeURIComponent(body);
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${gmailSubject}&body=${gmailBody}`,
      '_blank'
    );
    toast.success('Abrindo Gmail para envio.');
    onOpenChange(false);
    resetForm();
  };

  const handleClose = () => {
    if (isSending) return;
    onOpenChange(false);
    resetForm();
  };

  const totalEmailCount = recipientEmails.length + (emailInput.trim() ? parseEmails(emailInput).length : 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Email de Prospecção
          </DialogTitle>
          <DialogDescription>
            Envie uma proposta de recrutamento para empresas potenciais. Cole múltiplos emails para enviar em lote.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Recipient Emails */}
          <div className="grid gap-2">
            <Label htmlFor="emails">
              Emails das Empresas *
              {recipientEmails.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({recipientEmails.length} {recipientEmails.length === 1 ? 'email' : 'emails'})
                </span>
              )}
            </Label>

            {/* Email chips */}
            {recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-slate-50 max-h-[120px] overflow-y-auto">
                {recipientEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="gap-1 pr-1 text-xs"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 rounded-full hover:bg-slate-300 p-0.5"
                      disabled={isSending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Input area */}
            <Input
              id="emails"
              type="text"
              placeholder="Digite emails separados por vírgula, ex: empresa1@email.com, empresa2@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onBlur={() => {
                if (emailInput.trim()) {
                  addEmails(emailInput);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                  e.preventDefault();
                  if (emailInput.trim()) {
                    addEmails(emailInput);
                  }
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                addEmails(pasted);
              }}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Cole múltiplos emails de uma vez — separados por vírgula, ponto e vírgula ou nova linha
            </p>
          </div>

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Body */}
          <div className="grid gap-2">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea
              id="body"
              placeholder="Escreva sua mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-none"
              disabled={isSending}
            />
          </div>

          {/* Link Options */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <Label className="text-sm font-medium">Incluir links no email:</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="formLink"
                checked={includeFormLink}
                onCheckedChange={(checked) => setIncludeFormLink(checked as boolean)}
                disabled={isSending}
              />
              <label
                htmlFor="formLink"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Link2 className="h-4 w-4 text-blue-600" />
                Link para formulário da empresa
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bookingLink"
                checked={includeBookingLink}
                onCheckedChange={(checked) => setIncludeBookingLink(checked as boolean)}
                disabled={isSending}
              />
              <label
                htmlFor="bookingLink"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-green-600" />
                Link para agendar reunião
              </label>
            </div>
          </div>

          {/* Preview Info */}
          {(includeFormLink || includeBookingLink) && !sendingProgress && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Links que serão adicionados ao final do email:</p>
              {includeFormLink && (
                <p>• Preencher formulário: [link automático]</p>
              )}
              {includeBookingLink && (
                <p>• Agendar uma reunião: [link automático]</p>
              )}
            </div>
          )}

          {/* Sending Progress */}
          {sendingProgress && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Enviando emails...</span>
                <span className="text-muted-foreground">
                  {sendingProgress.sent + sendingProgress.failed}/{sendingProgress.total}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((sendingProgress.sent + sendingProgress.failed) / sendingProgress.total) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="truncate">Enviando para: {sendingProgress.current}</span>
              </div>
              {sendingProgress.failed > 0 && (
                <p className="text-xs text-red-600">
                  {sendingProgress.failed} falha(s) até agora
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || totalEmailCount === 0}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando {sendingProgress ? `${sendingProgress.sent + sendingProgress.failed}/${sendingProgress.total}` : '...'}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {totalEmailCount <= 1
                  ? "Enviar Email"
                  : `Enviar ${totalEmailCount} Emails`
                }
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
