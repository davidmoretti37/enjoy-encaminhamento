import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ContentTransition from "@/components/ui/ContentTransition";
import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/skeletons";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle,
  ExternalLink,
  Info,
  AlertTriangle,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useLocation } from "wouter";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeIconBgColors = {
  info: "bg-blue-500/20",
  success: "bg-green-500/20",
  warning: "bg-yellow-500/20",
  error: "bg-red-500/20",
};

const typeIconColors = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
};

// Report item #19: make it clear what each notification is about. We derive a
// human-readable category from related_to_type, falling back to keywords in the
// title/message so the categories the ANEC team listed (cadastro, taxas, TCE,
// seguro de vida, entrevista…) are always labeled.
function getNotificationCategory(n: any): { label: string; className: string } {
  const rel = (n.related_to_type || "").toLowerCase();
  const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();

  const has = (...terms: string[]) => terms.some((t) => text.includes(t));

  if (rel === "insurance" || has("seguro de vida", "apólice", "apolice")) {
    return { label: "Seguro de Vida", className: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (rel === "tce" || has("tce", "termo de compromisso")) {
    return { label: "TCE", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (rel === "payment" || has("pagamento", "taxa", "mensalidade", "vencimento", "cobrança", "cobranca")) {
    return { label: "Financeiro", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (rel === "report" || has("relatório mensal", "relatorio mensal")) {
    return { label: "Relatório Mensal", className: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  }
  if (rel === "batch" || rel === "interview" || has("entrevista")) {
    return { label: "Entrevista", className: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  if (rel === "application" || has("candidatura", "vaga")) {
    return { label: "Candidatura", className: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (rel === "candidate" || has("cadastro")) {
    return { label: "Cadastro", className: "bg-violet-50 text-violet-700 border-violet-200" };
  }
  if (rel === "contract" || has("contrato")) {
    return { label: "Contrato", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
  return { label: "Geral", className: "bg-slate-100 text-slate-600 border-slate-200" };
}

export default function NotificationsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const notificationsQuery = trpc.notification.getAll.useQuery();
  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => notificationsQuery.refetch(),
  });
  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas");
      notificationsQuery.refetch();
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    await markAsReadMutation.mutateAsync({ id });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const getNotificationLink = (notification: any) => {
    if (notification.related_to_type === "batch") {
      if (user?.role === "candidate") return "/candidate";
      if (user?.role === "company") return "/company/portal";
      return "/agency/portal?tab=management&filter=candidates";
    }
    return null;
  };

  return (
    <DashboardLayout>
      <ContentTransition isLoading={notificationsQuery.isLoading} skeleton={<><PageHeaderSkeleton /><ListSkeleton count={6} /></>}>
      <div className="space-y-6">
        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#0A2342]">Notificações</h2>
          <p className="text-slate-600 mt-1">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? "es" : ""} não lida${unreadCount > 1 ? "s" : ""}`
              : "Todas as notificações foram lidas"}
          </p>
        </div>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A2342] text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          </div>
        )}

        {/* Notifications list */}
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                <Bell className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
                Nenhuma notificação
              </h3>
              <p className="text-slate-600 max-w-sm">
                Você está em dia!
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info;
              const iconBgClass = typeIconBgColors[notification.type as keyof typeof typeIconBgColors] || typeIconBgColors.info;
              const iconColorClass = typeIconColors[notification.type as keyof typeof typeIconColors] || typeIconColors.info;
              const link = getNotificationLink(notification);

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg border-2 p-3 transition-all ${
                    !notification.is_read
                      ? "border-orange-300 bg-orange-50/30"
                      : "border-slate-200 hover:border-orange-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${iconColorClass}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {(() => {
                          const cat = getNotificationCategory(notification);
                          return (
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${cat.className}`}>
                              {cat.label}
                            </span>
                          );
                        })()}
                        <h4 className="text-[#0A2342] font-medium">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 text-xs font-medium">
                            Nova
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm">
                        {notification.message}
                      </p>
                      <p className="text-slate-400 text-xs mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {link && (
                        <button
                          onClick={() => setLocation(link)}
                          className="p-2 rounded-lg text-slate-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                          className="p-2 rounded-lg text-slate-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </ContentTransition>
    </DashboardLayout>
  );
}
