// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Phone, Mail, Copy } from "lucide-react";

interface ContactInfoModalProps {
  open: boolean;
  onClose: () => void;
  candidateIds: string[];
}

export default function ContactInfoModal({
  open,
  onClose,
  candidateIds,
}: ContactInfoModalProps) {
  const candidatesQuery = trpc.candidate.getByIds.useQuery(
    { ids: candidateIds },
    { enabled: open && candidateIds.length > 0 }
  );

  const candidates = candidatesQuery.data || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contatos dos Candidatos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {candidatesQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum candidato selecionado
            </p>
          ) : (
            candidates.map((candidate: any) => (
              <div key={candidate.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">{candidate.full_name}</p>
                {candidate.email && (
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-3.5 w-3.5" />
                      {candidate.email}
                    </span>
                    <button
                      onClick={() => copyToClipboard(candidate.email)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-3.5 w-3.5" />
                      {candidate.phone}
                    </span>
                    <button
                      onClick={() => copyToClipboard(candidate.phone)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {!candidate.email && !candidate.phone && (
                  <p className="text-xs text-gray-400">Sem informações de contato</p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
