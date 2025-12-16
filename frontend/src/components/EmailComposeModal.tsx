import { useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { Mail, Send, Loader2, Link2, Calendar } from "lucide-react";
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
  const [recipientEmail, setRecipientEmail] = useState(prefilledEmail);
  const [subject, setSubject] = useState("Encontre os Melhores Talentos para sua Empresa");
  const [body, setBody] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [includeFormLink, setIncludeFormLink] = useState(true);
  const [includeBookingLink, setIncludeBookingLink] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const sendEmailMutation = trpc.outreach.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar email: ${error.message}`);
    },
  });

  const resetForm = () => {
    setRecipientEmail("");
    setSubject("Encontre os Melhores Talentos para sua Empresa");
    setBody(DEFAULT_EMAIL_TEMPLATE);
    setIncludeFormLink(true);
    setIncludeBookingLink(true);
  };

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsSending(true);
    try {
      await sendEmailMutation.mutateAsync({
        recipientEmail,
        subject,
        body,
        includeFormLink,
        includeBookingLink,
        companyId,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Email de Prospecção
          </DialogTitle>
          <DialogDescription>
            Envie uma proposta de recrutamento para uma empresa potencial.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Recipient Email */}
          <div className="grid gap-2">
            <Label htmlFor="email">Email da Empresa *</Label>
            <Input
              id="email"
              type="email"
              placeholder="empresa@exemplo.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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
          {(includeFormLink || includeBookingLink) && (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || !recipientEmail}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
