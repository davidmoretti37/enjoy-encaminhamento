import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaCardProps {
  type: "company" | "candidate";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  ctaText: string;
  selected: boolean;
  onClick: () => void;
}

export default function PersonaCard({
  type,
  icon: Icon,
  title,
  subtitle,
  ctaText,
  selected,
  onClick,
}: PersonaCardProps) {
  const isCompany = type === "company";

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative w-full p-8 md:p-10 rounded-3xl border-2 bg-white/80 backdrop-blur-sm text-left transition-colors cursor-pointer",
        isCompany ? "hover:border-[#0A2342]/50" : "hover:border-[#FF6B35]/50",
        selected
          ? isCompany
            ? "border-[#0A2342] ring-2 ring-[#0A2342]/20"
            : "border-[#FF6B35] ring-2 ring-[#FF6B35]/20"
          : "border-border/50"
      )}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300",
          selected ? "opacity-100" : "group-hover:opacity-50",
          isCompany
            ? "bg-gradient-to-br from-[#0A2342]/10 to-[#0A2342]/5"
            : "bg-gradient-to-br from-[#FF6B35]/10 to-[#FF6B35]/5"
        )}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center mb-6",
            isCompany
              ? "bg-[#0A2342]"
              : "bg-[#FF6B35]"
          )}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          {title}
        </h3>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed">
          {subtitle}
        </p>

        {/* CTA */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all",
            isCompany
              ? "bg-[#0A2342] hover:bg-[#0A2342]/90"
              : "bg-[#FF6B35] hover:bg-[#FF6B35]/90"
          )}
        >
          {ctaText}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          className="absolute top-4 right-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              isCompany
                ? "bg-[#0A2342]"
                : "bg-[#FF6B35]"
            )}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
