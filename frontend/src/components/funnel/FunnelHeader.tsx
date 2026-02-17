import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ArrowLeft, Bell, CheckCircle, Info, AlertTriangle, XCircle, CheckCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import HorizontalJobScroller from "./HorizontalJobScroller";

interface FunnelHeaderProps {
  onMenuClick?: () => void;
  onBackClick?: () => void;
  // Tab toggle props
  tabs?: Array<{ id: string; label: string }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  // Job scroller props
  selectorOptions?: Array<{ id: string; label: string; sublabel?: string }>;
  selectorValue?: string;
  onSelectorChange?: (id: string) => void;
  onAddJob?: () => void;
}

export default function FunnelHeader({
  onMenuClick,
  onBackClick,
  tabs,
  activeTab,
  onTabChange,
  selectorOptions,
  selectorValue,
  onSelectorChange,
  onAddJob,
}: FunnelHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      {/* Left side - Logo + Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {onBackClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackClick}
            className="relative flex items-center justify-center w-10 h-10 rounded-full
              bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50
              hover:bg-slate-50 transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-[#0A2342] transition-colors" />
          </motion.button>
        )}

        {/* Menu button */}
        {onMenuClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="w-10 h-10 rounded-lg flex items-center justify-center
              bg-slate-100 hover:bg-slate-200 border border-slate-200
              transition-all duration-200"
          >
            <Menu className="w-5 h-5 text-[#0A2342]" />
          </motion.button>
        )}

        {/* Logo - static branding, not clickable */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#0A2342] rounded-lg blur-lg opacity-20" />
            <div className="relative w-10 h-10 rounded-lg bg-[#0A2342] flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">A</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0A2342] tracking-tight">ANEC</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider -mt-0.5">
              Portal
            </p>
          </div>
        </div>
      </div>

      {/* Center - Job Scroller */}
      {selectorOptions && selectorOptions.length > 0 && (
        <div className="flex-1 max-w-3xl mx-6">
          <HorizontalJobScroller
            jobs={selectorOptions}
            selectedJobId={selectorValue}
            onJobSelect={onSelectorChange}
            onAddJob={onAddJob}
          />
        </div>
      )}

      {/* Right side - Notification Bell + Tab Toggle */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Tab Toggle */}
        {tabs && tabs.length > 0 && (
          <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`
                  px-5 py-2 rounded-lg font-medium text-sm transition-all
                  ${activeTab === tab.id
                    ? 'bg-white shadow-sm text-[#FF6B35]'
                    : 'text-slate-600 hover:text-[#0A2342]'
                  }
                `}
                whileHover={activeTab !== tab.id ? { scale: 1.02 } : undefined}
                whileTap={{ scale: 0.98 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Notification Bell with Dropdown ─────────────────────────────

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeDotColors = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCountQuery = trpc.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const notificationsQuery = trpc.notification.getAll.useQuery(undefined, {
    enabled: open,
  });
  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });
  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });

  const unreadCount = unreadCountQuery.data ?? 0;
  const notifications = notificationsQuery.data ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-lg flex items-center justify-center
          bg-slate-100 hover:bg-slate-200 border border-slate-200
          transition-all duration-200"
      >
        <Bell className="w-5 h-5 text-[#0A2342]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
              bg-[#FF6B35] text-white text-[10px] font-bold flex items-center justify-center
              shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-[#0A2342]">Notificações</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="flex items-center gap-1 text-xs text-[#FF6B35] hover:text-[#FF6B35]/80 font-medium disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar lidas
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notificationsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-[#FF6B35] rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => {
                  const Icon = typeIcons[n.type as keyof typeof typeIcons] || Info;
                  const dotColor = typeDotColors[n.type as keyof typeof typeDotColors] || typeDotColors.info;

                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markAsRead.mutate({ id: n.id });
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0
                        hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-orange-50/40" : ""}`}
                    >
                      <div className="flex gap-3">
                        {/* Unread dot */}
                        <div className="pt-1.5 shrink-0">
                          <div className={`w-2 h-2 rounded-full ${!n.is_read ? dotColor : "bg-transparent"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? "font-semibold text-[#0A2342]" : "font-medium text-slate-700"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
