import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AgentContext =
  | 'escolas'
  | 'empresas'
  | 'vagas'
  | 'candidatos'
  | 'candidaturas'
  | 'contratos'
  | 'pagamentos'
  | 'feedbacks';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatContextType {
  context: AgentContext | null;
  setContext: (context: AgentContext) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<AgentContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setContext = (newContext: AgentContext) => {
    if (context !== newContext) {
      const oldContext = context;
      setContextState(newContext);

      // Add a system message to inform the new agent about context switch
      if (oldContext && messages.length > 0) {
        const contextNames: Record<AgentContext, string> = {
          escolas: 'Escolas',
          empresas: 'Empresas',
          vagas: 'Vagas',
          candidatos: 'Candidatos',
          candidaturas: 'Candidaturas',
          contratos: 'Contratos',
          pagamentos: 'Pagamentos',
          feedbacks: 'Feedbacks',
        };

        setMessages(prev => [...prev, {
          role: 'system',
          content: `[Mudança de contexto: de ${contextNames[oldContext]} para ${contextNames[newContext]}. O usuário continua a conversa anterior, mas agora precisa de ajuda com ${contextNames[newContext]}.]`
        }]);
      }
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);
  const togglePanel = () => setIsPanelOpen(prev => !prev);

  return (
    <ChatContext.Provider
      value={{
        context,
        setContext,
        messages,
        addMessage,
        clearMessages,
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
