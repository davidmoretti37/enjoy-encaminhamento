import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  Loader2,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";

interface Meeting {
  id: string;
  company_name: string | null;
  company_email: string;
  contact_name: string | null;
  scheduled_at: string;
  status: string;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  contract_signer_name: string | null;
}

interface CompanyJobsModalProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

export default function CompanyJobsModal({
  meeting,
  open,
  onClose,
}: CompanyJobsModalProps) {
  const { data: historyData, isLoading } = trpc.outreach.getCompanyFullHistory.useQuery(
    { companyEmail: meeting?.company_email || "" },
    { enabled: !!meeting?.company_email && open }
  );

  if (!meeting) return null;

  const jobs = historyData?.jobs || [];

  const contractTypeLabels: Record<string, string> = {
    estagio: "Estágio",
    clt: "CLT",
    "menor-aprendiz": "Menor Aprendiz",
  };

  const getJobStatusBadge = (job: any) => {
    if (job.status === "closed") {
      return { label: "Fechada", color: "bg-gray-100 text-gray-700", icon: CheckCircle2 };
    }
    if (job.status === "paused") {
      return { label: "Pausada", color: "bg-amber-100 text-amber-700", icon: Clock };
    }
    return { label: "Aberta", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Vagas - {meeting.company_name || "Empresa"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map((job: any) => {
                  const statusInfo = getJobStatusBadge(job);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {contractTypeLabels[job.contract_type] || job.contract_type}
                            </p>
                          </div>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {job.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                          )}
                          {job.vacancies && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {job.vacancies} vaga(s)
                            </div>
                          )}
                          {(job.salary_min || job.salary_max) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              {job.salary_min && job.salary_max
                                ? `R$ ${job.salary_min.toLocaleString("pt-BR")} - ${job.salary_max.toLocaleString("pt-BR")}`
                                : job.salary_min
                                  ? `A partir de R$ ${job.salary_min.toLocaleString("pt-BR")}`
                                  : `Até R$ ${job.salary_max.toLocaleString("pt-BR")}`}
                            </div>
                          )}
                          {job.created_at && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Criada em {format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          )}
                        </div>

                        {job.description && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {job.description}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma vaga cadastrada para esta empresa.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
