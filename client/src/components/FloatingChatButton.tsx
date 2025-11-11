import { Sparkles } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useLocation } from 'wouter';

export function FloatingChatButton() {
  const { openPanel, isPanelOpen, context } = useChat();
  const [location] = useLocation();

  // Don't show button on dashboard or other non-management pages
  const isManagementPage = location.startsWith('/admin/') &&
    !location.includes('/admin/dashboard') &&
    !location.includes('/admin/ai-matching');

  // Don't show button if panel is open, no context is set, or not on management page
  if (isPanelOpen || !context || !isManagementPage) {
    return null;
  }

  return (
    <button
      onClick={openPanel}
      className="fixed top-6 right-6 z-40 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      aria-label="Open AI Chat"
    >
      <Sparkles className="h-4 w-4" />
      <span className="font-medium text-sm">AI Chat</span>
    </button>
  );
}
