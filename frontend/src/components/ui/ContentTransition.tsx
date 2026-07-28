import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ContentTransitionProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shows a skeleton while loading, then fades the content in.
 *
 * NOTE: this deliberately does NOT use <AnimatePresence mode="wait">. That version
 * gated the content mount on the skeleton's EXIT animation completing — and on the
 * initial page load (isLoading flipping true→false during mount) framer-motion could
 * leave the exit stuck, so the content was NEVER mounted and the page showed an
 * infinite skeleton (broke /payments, /calendar, /notifications, /admin/agencies).
 * Rendering the content directly when !isLoading has no exit dependency and cannot hang.
 */
export default function ContentTransition({
  isLoading,
  skeleton,
  children,
  className = "",
}: ContentTransitionProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
