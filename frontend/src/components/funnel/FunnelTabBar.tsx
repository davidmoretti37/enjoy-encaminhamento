import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface FunnelTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function FunnelTabBar({
  tabs,
  activeTab,
  onTabChange,
}: FunnelTabBarProps) {
  return (
    <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-5 py-2.5 rounded-lg font-medium text-sm min-w-[160px]
              transition-colors duration-200
              ${isActive
                ? "text-white"
                : "text-slate-600 hover:text-[#0A2342] hover:bg-slate-200"
              }
            `}
            whileHover={!isActive ? { scale: 1.02 } : undefined}
            whileTap={{ scale: 0.98 }}
          >
            {/* Active background */}
            {isActive && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 rounded-lg bg-[#FF6B35] shadow-lg shadow-[#0A2342]/25"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {/* Tab content */}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {/* Badge */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`
                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                    flex items-center justify-center
                    ${isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#FF6B35]/20 text-[#FF6B35]"
                    }
                  `}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
