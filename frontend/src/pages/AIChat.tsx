import DashboardLayout from "@/components/DashboardLayout";
import { AIPromptBox } from "@/components/ui/AIPromptBox";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { Button } from "@/components/ui/button";
import { RotateCcw, Bot, User } from "lucide-react";
import Orb from "@/components/ui/Orb";
import { useSchoolContext } from "@/contexts/SchoolContext";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTED_PROMPTS = [
  "Ajuda - O que voce pode fazer?",
  "Status do sistema",
  "Previsao de demanda de contratacao",
  "Analise de tendencias de feedback",
];

export default function AIChat() {
  const { currentSchool } = useSchoolContext();

  const {
    messages,
    loading,
    currentMessage,
    currentAgent,
    currentMetadata,
    sendMessage,
    clearConversation,
    newConversation,
    messagesEndRef,
  } = useStreamingChat({
    schoolId: currentSchool?.id ?? null,
  });

  const handleSend = (message: string) => {
    sendMessage(message);
  };

  const handleClearHistory = () => {
    // Use newConversation for instant reset without API dependency
    newConversation();
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  // Render message content with markdown-like formatting
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      // Handle bold text
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="mb-1 last:mb-0">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-end px-4 py-3 border-b">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 relative">
          <div className="max-w-4xl mx-auto py-4 space-y-6">
            {/* Welcome message when empty - absolutely positioned */}
            <AnimatePresence>
              {messages.length === 0 && !currentMessage && !loading && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-x-0 top-12 text-center"
                >
                  <div className="flex justify-center mb-4">
                    <Orb size={48} staticMode={false} hue={0} rotateOnHover={false} hoverIntensity={0} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Como posso ajudar?
                  </h2>
                  <p className="text-gray-500 mb-8">
                    Pergunte sobre candidatos, empresas, contratos, previsoes e muito mais.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                  >
                    {message.role === "user" ? (
                      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <Orb size={32} staticMode={false} hue={0} rotateOnHover={false} hoverIntensity={0} />
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex flex-col gap-2 max-w-[70%]">
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                        {renderContent(message.content)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming message with typing effect */}
            {currentMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <Orb size={32} staticMode={false} hue={0} rotateOnHover={false} hoverIntensity={0} />
                  </div>
                  <div className="flex flex-col gap-2 max-w-[70%] min-w-[300px]">
                    <div className="rounded-lg px-4 py-3 bg-gray-100 text-gray-900">
                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none break-words">
                        {renderContent(currentMessage)}
                        <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading indicator (before streaming starts) */}
            {loading && !currentMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <Orb size={32} staticMode={false} hue={0} rotateOnHover={false} hoverIntensity={0} />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 pb-8 px-4 pl-24 bg-gradient-to-t from-white via-white to-transparent pt-4">
          <div className="max-w-2xl mx-auto">
            <AIPromptBox onSend={handleSend} disabled={loading} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
