import { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import type { AgentContext } from '@/contexts/ChatContext';

/**
 * Hook to set the current agent context when a page loads.
 * This ensures the AI assistant knows what section the user is in.
 *
 * Usage:
 * ```tsx
 * function SchoolManagement() {
 *   useAgentContext('escolas');
 *   // rest of your component...
 * }
 * ```
 */
export function useAgentContext(context: AgentContext) {
  const { setContext } = useChat();

  useEffect(() => {
    setContext(context);
  }, [context, setContext]);
}
