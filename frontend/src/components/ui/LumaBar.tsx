import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, LucideIcon, MessageSquare } from "lucide-react";
import { useLocation, Link } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface LumaBarProps {
  items: NavItem[];
  homeHref: string;
  profileHref: string;
  activeHref: string;
  showAIChat?: boolean;
  user?: {
    name?: string;
    email?: string;
  };
  onLogout?: () => void;
}

export default function LumaBar({
  items,
  homeHref,
  profileHref,
  activeHref,
  showAIChat = true,
  user,
  onLogout,
}: LumaBarProps) {
  const [location] = useLocation();
  const isAIChatActive = location === '/ai-chat';

  // Find active index based on current path
  const allItems = [{ label: "Home", href: homeHref, icon: Home }, ...items];
  const activeIndex = allItems.findIndex(item =>
    location === item.href || location.startsWith(item.href + "/")
  );
  const [active, setActive] = useState(activeIndex >= 0 ? activeIndex : 0);

  useEffect(() => {
    const newIndex = allItems.findIndex(item =>
      location === item.href || location.startsWith(item.href + "/")
    );
    if (newIndex >= 0) {
      setActive(newIndex);
    }
  }, [location]);

  // Get user initials
  const getInitials = () => {
    if (user?.name) {
      return user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  return (
    <>
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <div className="relative flex flex-col items-center gap-2 bg-white/80 backdrop-blur-xl rounded-full px-2 py-4 shadow-lg border border-gray-200/50">

          {/* AI Chat Button - First at top */}
          {showAIChat && (
            <>
              <Link href="/ai-chat">
                <motion.div className="relative flex items-center group">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    animate={{ scale: isAIChatActive ? 1.1 : 1 }}
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                      isAIChatActive
                        ? "text-purple-600 bg-purple-50"
                        : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                    }`}
                  >
                    <MessageSquare size={20} />
                  </motion.button>

                  {/* Tooltip */}
                  <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Assistente IA
                  </span>
                </motion.div>
              </Link>

              {/* Divider after AI button */}
              <div className="w-6 h-px bg-gray-200 my-1" />
            </>
          )}

          {/* Active Indicator Glow */}
          <motion.div
            className="absolute w-10 h-10 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full blur-xl opacity-30"
            animate={{
              top: `calc(${(active + (showAIChat ? 1 : 0)) * (100 / (allItems.length + (showAIChat ? 3 : 2)))}% + ${showAIChat ? '3.5rem' : '1rem'})`,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />

          {allItems.map((item, index) => {
            const isActive = index === active;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div className="relative flex items-center group">
                  <motion.button
                    onClick={() => setActive(index)}
                    whileHover={{ scale: 1.1 }}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                      isActive
                        ? "text-gray-900 bg-gray-100"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={20} />
                  </motion.button>

                  {/* Tooltip */}
                  <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="w-6 h-px bg-gray-200 my-1" />

          {/* User Avatar -> Settings */}
          <Link href={profileHref}>
            <motion.div className="relative flex items-center group">
              <motion.button
                whileHover={{ scale: 1.1 }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                {getInitials()}
              </motion.button>
              <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Perfil
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    </>
  );
}
