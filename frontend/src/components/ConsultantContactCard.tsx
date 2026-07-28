// ANEC report item #13 — presentational card offering WhatsApp/e-mail contact
// with the consultant responsible for out-of-region leads.
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ConsultantContact, buildWhatsAppLink } from "@/config/consultants";

export default function ConsultantContactCard({
  consultant,
  message,
}: {
  consultant: ConsultantContact;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#0A2342]">{consultant.name}</p>
        <p className="text-xs text-slate-500">Fale diretamente com nosso consultor responsável.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={buildWhatsAppLink(consultant.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button type="button" className="w-full bg-[#25D366] hover:bg-[#1FAE53] text-white">
            <MessageCircle className="h-4 w-4 mr-2" />
            Falar no WhatsApp
          </Button>
        </a>
        {consultant.email && (
          <a href={`mailto:${consultant.email}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Enviar e-mail
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
