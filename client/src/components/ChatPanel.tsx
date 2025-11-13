import { X, Send, Loader2, GraduationCap, Building2, Users, Briefcase, FileText, FileCheck, DollarSign, MessageSquare, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import type { AgentContext } from '@/contexts/ChatContext';
import { AnimatedText } from './AnimatedText';

const CONTEXT_ICONS: Record<AgentContext, any> = {
  escolas: GraduationCap,
  empresas: Building2,
  candidatos: Users,
  vagas: Briefcase,
  candidaturas: FileText,
  contratos: FileCheck,
  pagamentos: DollarSign,
  feedbacks: MessageSquare,
};

const CONTEXT_COLORS: Record<AgentContext, string> = {
  escolas: 'from-blue-600 to-blue-700',
  empresas: 'from-green-600 to-green-700',
  candidatos: 'from-orange-600 to-orange-700',
  vagas: 'from-purple-600 to-purple-700',
  candidaturas: 'from-teal-600 to-teal-700',
  contratos: 'from-indigo-600 to-indigo-700',
  pagamentos: 'from-yellow-600 to-yellow-700',
  feedbacks: 'from-pink-600 to-pink-700',
};

export function ChatPanel() {
  const {
    context,
    messages,
    addMessage,
    clearMessages,
    isPanelOpen,
    closePanel,
    isLoading,
    setIsLoading,
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();

  const { data: agentConfig } = trpc.agent.getAgentConfig.useQuery(
    { context: context! },
    { enabled: !!context }
  );

  const chatMutation = trpc.agent.chat.useMutation();

  // Close panel when navigating to dashboard or non-management pages
  useEffect(() => {
    const isAdminManagementPage = location.startsWith('/admin/') &&
      !location.includes('/admin/dashboard') &&
      !location.includes('/admin/ai-matching');

    const isAffiliateManagementPage = location.startsWith('/affiliate/') &&
      !location.includes('/affiliate/dashboard');

    const isManagementPage = isAdminManagementPage || isAffiliateManagementPage;

    if (!isManagementPage && isPanelOpen) {
      closePanel();
    }
  }, [location, isPanelOpen, closePanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isPanelOpen && context) {
      inputRef.current?.focus();
    }
  }, [isPanelOpen, context]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !context) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    addMessage({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await chatMutation.mutateAsync({
        context,
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ],
      });

      addMessage({
        role: 'assistant',
        content: response.message,
      });
    } catch (error: any) {
      console.error('[Chat] Error:', error);
      addMessage({
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  if (!isPanelOpen || !context) return null;

  const Icon = CONTEXT_ICONS[context];
  const gradientColor = CONTEXT_COLORS[context];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={closePanel}
      />

      {/* Chat Panel - Fixed on mobile, takes flex space on desktop */}
      <div className="fixed md:relative right-0 top-0 h-full w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientColor} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{agentConfig?.name || 'AI Assistant'}</h3>
                <p className="text-xs opacity-90 capitalize">{context}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearMessages}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Clear chat"
                title="Limpar conversa"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={closePanel}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full px-8">
              <AnimatedText
                text="Como posso ajudar hoje?"
                className="text-lg font-medium text-gray-700"
                delay={50}
              />
            </div>
          )}

          {messages.map((message, index) => {
            // System messages (context switches) - show as info badges
            if (message.role === 'system') {
              return (
                <div key={index} className="flex justify-center">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full border border-gray-200">
                    {message.content.replace(/\[|\]/g, '')}
                  </div>
                </div>
              );
            }

            // User and assistant messages
            return (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <ClassicLoader />
                  <span className="text-sm">Pensando...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {agentConfig?.examples && agentConfig.examples.length > 0 && messages.length === 0 && (
          <div className="p-4 border-t bg-white">
            <p className="text-xs text-gray-600 mb-2 font-medium">Perguntas sugeridas:</p>
            <div className="flex flex-wrap gap-2">
              {agentConfig.examples.slice(0, 3).map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(example)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 transition-colors text-gray-700"
                  disabled={isLoading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg px-4 transition-colors flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? <ClassicLoader /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
