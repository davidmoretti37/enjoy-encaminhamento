import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FunnelTransitionProps {
  children: ReactNode;
  stepKey: number | string;
  direction?: number; // 1 = forward, -1 = backward
  mode?: "wait" | "sync" | "popLayout";
}

export default function FunnelTransition({
  children,
  stepKey,
  direction = 1,
}: FunnelTransitionProps) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// Tab transition component (vertical movement)
export function TabTransition({
  children,
  tabKey,
  mode = "wait",
}: {
  children: ReactNode;
  tabKey: string;
  mode?: "wait" | "sync" | "popLayout";
}) {
  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={tabKey}
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -12, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Fade transition for simple content swaps
export function FadeTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string | number;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Card entrance animation
export function CardEntrance({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list animation
export function StaggeredList({
  children,
  staggerDelay = 0.05,
  className = "",
}: {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
