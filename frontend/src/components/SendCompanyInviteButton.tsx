import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, Loader2, CheckCircle, Clock, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SendCompanyInviteButtonProps {
  companyId: string;
  hasUserAccount?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function SendCompanyInviteButton({
  companyId,
  hasUserAccount = false,
  variant = "outline",
  size = "sm",
}: SendCompanyInviteButtonProps) {
  const [isSending, setIsSending] = useState(false);

  // Get invitation status
  const { data: inviteStatus, refetch } = trpc.companyInvitation.getStatus.useQuery(
    { companyId },
    { enabled: !!companyId }
  );

  // Send invitation mutation
  const sendInviteMutation = trpc.companyInvitation.createAndSend.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Convite enviado com sucesso!");
      } else {
        toast.info("Convite criado, mas o email não foi enviado (SMTP não configurado)");
      }
      refetch();
      setIsSending(false);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar convite: ${error.message}`);
      setIsSending(false);
    },
  });

  // Resend invitation mutation
  const resendInviteMutation = trpc.companyInvitation.resend.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Convite reenviado com sucesso!");
      } else {
        toast.info("Email não enviado (SMTP não configurado)");
      }
      refetch();
      setIsSending(false);
    },
    onError: (error) => {
      toast.error(`Erro ao reenviar convite: ${error.message}`);
      setIsSending(false);
    },
  });

  const handleSendInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSending(true);

    if (inviteStatus?.status === "pending") {
      resendInviteMutation.mutate({ companyId });
    } else {
      sendInviteMutation.mutate({ companyId });
    }
  };

  // If company already has an account, show badge
  if (hasUserAccount || inviteStatus?.hasAccount) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Cadastrado
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Empresa já possui conta na plataforma</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // If invitation is pending
  if (inviteStatus?.status === "pending") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleSendInvite}
            disabled={isSending}
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1.5" />
                Reenviar
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Convite enviado, aguardando resposta</p>
          <p className="text-xs text-muted-foreground">
            Clique para reenviar
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // If invitation expired
  if (inviteStatus?.status === "expired") {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleSendInvite}
        disabled={isSending}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Mail className="h-4 w-4 mr-1.5" />
            Reenviar (expirado)
          </>
        )}
      </Button>
    );
  }

  // Default: not invited yet
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendInvite}
      disabled={isSending}
      className="text-blue-600 border-blue-300 hover:bg-blue-50"
    >
      {isSending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Send className="h-4 w-4 mr-1.5" />
          Convidar
        </>
      )}
    </Button>
  );
}
